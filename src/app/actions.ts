'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/utils/supabase/service'

const LI_VERSION = '202503'

// Poll until image status is AVAILABLE (LinkedIn processes async)
async function waitForImageAvailable(token: string, imageUrn: string): Promise<boolean> {
  const encodedUrn = encodeURIComponent(imageUrn)
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 1500)) // wait 1.5s between polls
    const res = await fetch(`https://api.linkedin.com/rest/images/${encodedUrn}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'LinkedIn-Version': LI_VERSION
      }
    })
    if (res.ok) {
      const data = await res.json()
      console.log(`Image status (attempt ${i + 1}):`, data.status)
      if (data.status === 'AVAILABLE') return true
    }
  }
  return false
}

async function uploadImageToLinkedIn(
  token: string,
  authorUrn: string,
  imageBuffer: ArrayBuffer,
  mimeType: string
): Promise<string | null> {
  try {
    // Step 1: Initialize upload with the REST Images API
    const initRes = await fetch(
      'https://api.linkedin.com/rest/images?action=initializeUpload',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'LinkedIn-Version': LI_VERSION,
          'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify({
          initializeUploadRequest: { owner: authorUrn }
        })
      }
    )

    if (!initRes.ok) {
      const err = await initRes.text()
      console.error('Image init failed:', err)
      return null
    }

    const initData = await initRes.json()
    const uploadUrl: string = initData.value?.uploadUrl
    const imageUrn: string = initData.value?.image // e.g. urn:li:image:XXXXX

    if (!uploadUrl || !imageUrn) {
      console.error('Missing upload URL or image URN:', initData)
      return null
    }

    // Step 2: Upload binary to the pre-signed URL
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
      body: imageBuffer
    })

    if (!uploadRes.ok) {
      const err = await uploadRes.text()
      console.error('Image binary upload failed:', err)
      return null
    }

    console.log('Image uploaded, waiting for AVAILABLE status...')

    // Step 3: Wait for LinkedIn to process the image before using it
    const isReady = await waitForImageAvailable(token, imageUrn)
    if (!isReady) {
      console.error('Image did not become AVAILABLE in time')
      return null
    }
    return imageUrn
  } catch (e) {
    console.error('Image upload exception:', e)
    return null
  }
}

export async function postToLinkedIn(formData: FormData) {
  const cookieStore = await cookies()
  const token = cookieStore.get('linkedin_token')?.value || process.env.LINKEDIN_ACCESS_TOKEN
  const urn = cookieStore.get('linkedin_urn')?.value || process.env.LINKEDIN_MEMBER_URN

  if (!token) {
    return { success: false, error: 'Please connect to LinkedIn first.' }
  }
  if (!urn) {
    return { success: false, error: 'LinkedIn not fully connected. Please disconnect and reconnect.' }
  }

  const text = formData.get('body') as string
  const imageFile = formData.get('image') as File | null

  // Always use the full urn:li:person: format
  const authorUrn = urn.startsWith('urn:li:') ? urn : `urn:li:person:${urn}`
  console.log('Posting as:', authorUrn)

  // Upload image if provided
  let imageUrn: string | null = null
  if (imageFile && imageFile.size > 0) {
    const arrayBuffer = await imageFile.arrayBuffer()
    imageUrn = await uploadImageToLinkedIn(token, authorUrn, arrayBuffer, imageFile.type)
    if (!imageUrn) {
      return { success: false, error: 'Image upload failed. Try posting without an image.' }
    }
  }

  // Build the post body using the NEW REST Posts API
  // This is compatible with urn:li:image:XXX from the REST Images API
  const postBody: Record<string, unknown> = {
    author: authorUrn,
    commentary: text,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: []
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false
  }

  // Attach image if uploaded
  if (imageUrn) {
    postBody.content = {
      media: {
        altText: 'Post image',
        id: imageUrn // urn:li:image:XXXXX — matches REST Images API
      }
    }
  }

  const postRes = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': LI_VERSION,
      'X-Restli-Protocol-Version': '2.0.0'
    },
    body: JSON.stringify(postBody)
  })

  if (!postRes.ok) {
    const errText = await postRes.text()
    console.error('LinkedIn Post Error:', errText)
    return { success: false, error: `Failed to post: ${errText}` }
  }

  revalidatePath('/')
  return { success: true }
}

export async function disconnectLinkedIn() {
  const cookieStore = await cookies()
  cookieStore.delete('linkedin_token')
  cookieStore.delete('linkedin_urn')
  revalidatePath('/')
}

export async function publishTemplate(templateId: string) {
  const cookieStore = await cookies()
  const token = cookieStore.get('linkedin_token')?.value || process.env.LINKEDIN_ACCESS_TOKEN
  const urn = cookieStore.get('linkedin_urn')?.value || process.env.LINKEDIN_MEMBER_URN

  const supabase = createServiceClient()
  const { data: template, error } = await supabase.from('post_templates').select('*').eq('id', templateId).single()
  
  if (error || !template) {
    return { success: false, error: 'Template not found.' }
  }

  if (!token || !urn) {
    // Mark as failed so the UI shows the reason (and it won't silently remain scheduled forever).
    await supabase
      .from('post_templates')
      .update({
        status: 'failed',
        rejection_reason: 'LinkedIn is not connected. Connect LinkedIn from /linkedin and retry scheduling.',
      })
      .eq('id', templateId)

    return { success: false, error: 'LinkedIn is not connected.' }
  }

  const authorUrn = urn.startsWith('urn:li:') ? urn : `urn:li:person:${urn}`
  let imageUrn: string | null = null

  if (template.image_url) {
    // Convert Base64 data URL to ArrayBuffer for LinkedIn REST API
    const matches = template.image_url.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/)
    if (matches && matches.length === 3) {
      const mimeType = matches[1]
      const base64Data = matches[2]
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      imageUrn = await uploadImageToLinkedIn(token, authorUrn, bytes.buffer, mimeType)
    }
  }

  // Extract clean content from template body (remove ::type- metadata)
  const lines = (template.body || '').split('\n')
  let idx = 0
  while (idx < lines.length && lines[idx].startsWith('::')) {
    idx += 1
  }
  const cleanContent = lines.slice(idx).join('\n').trim()

  const postBody: Record<string, unknown> = {
    author: authorUrn,
    commentary: cleanContent,
    visibility: 'PUBLIC',
    distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false
  }

  if (imageUrn) {
    postBody.content = { media: { altText: 'Post image', id: imageUrn } }
  }

  try {
    const postRes = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': LI_VERSION,
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(postBody),
    })

    if (!postRes.ok) {
      const errText = await postRes.text()
      await supabase
        .from('post_templates')
        .update({ status: 'failed', rejection_reason: `Publishing failed: ${errText}` })
        .eq('id', templateId)

      return { success: false, error: `Publishing failed: ${errText}` }
    }

    // Update template status to published
    await supabase
      .from('post_templates')
      .update({ status: 'published', published_at: new Date().toISOString(), rejection_reason: null })
      .eq('id', templateId)

    revalidatePath('/templates')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await supabase
      .from('post_templates')
      .update({ status: 'failed', rejection_reason: `Publishing exception: ${message}` })
      .eq('id', templateId)

    return { success: false, error: message }
  }
}
