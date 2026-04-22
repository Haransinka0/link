'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/utils/supabase/service'

const LI_VERSION = '202503'

// Helper to fetch media buffer from URL or data-uri
async function getBufferFromUrl(url: string): Promise<{ buffer: ArrayBuffer, mimeType: string } | null> {
  if (url.startsWith('data:')) {
    const matches = url.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/)
    if (matches && matches.length === 3) {
      const mimeType = matches[1]
      const base64Data = matches[2]
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      return { buffer: bytes.buffer, mimeType }
    }
    return null
  }
  
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    const mimeType = res.headers.get('content-type') || 'application/octet-stream'
    return { buffer, mimeType }
  } catch (e) {
    console.error('Error fetching media:', e)
    return null
  }
}

// Poll until media status is AVAILABLE
async function waitForMediaAvailable(token: string, mediaUrn: string, type: 'image' | 'video'): Promise<boolean> {
  const encodedUrn = encodeURIComponent(mediaUrn)
  const endpoint = type === 'video' 
    ? `https://api.linkedin.com/rest/videos/${encodedUrn}`
    : `https://api.linkedin.com/rest/images/${encodedUrn}`
    
  for (let i = 0; i < 20; i++) { // More attempts for potential large videos
    await new Promise(r => setTimeout(r, type === 'video' ? 3000 : 2000))
    const res = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        'LinkedIn-Version': LI_VERSION
      }
    })
    if (res.ok) {
      const data = await res.json()
      console.log(`${type} status (attempt ${i + 1}):`, data.status)
      if (data.status === 'AVAILABLE') return true
      if (data.status === 'FAILED') return false
    }
  }
  return false
}

async function uploadMediaToLinkedIn(
  token: string,
  authorUrn: string,
  buffer: ArrayBuffer,
  mimeType: string
): Promise<string | null> {
  try {
    const isVideo = mimeType.startsWith('video/')
    const endpoint = isVideo 
      ? 'https://api.linkedin.com/rest/videos?action=initializeUpload'
      : 'https://api.linkedin.com/rest/images?action=initializeUpload'

    const initBody: any = {
      initializeUploadRequest: { owner: authorUrn }
    }

    if (isVideo) {
      initBody.initializeUploadRequest.fileSizeBytes = buffer.byteLength
      initBody.initializeUploadRequest.uploadCaptions = false
      initBody.initializeUploadRequest.uploadThumbnail = false
    }

    // Step 1: Initialize upload
    const initRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': LI_VERSION,
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(initBody)
    })

    if (!initRes.ok) {
      const err = await initRes.text()
      console.error('Media init failed:', err)
      return null
    }

    const initData = await initRes.json()
    const uploadUrl: string = isVideo 
      ? initData.value?.uploadInstructions[0]?.uploadUrl 
      : initData.value?.uploadUrl
      
    const mediaUrn: string = isVideo 
      ? initData.value?.video 
      : initData.value?.image

    if (!uploadUrl || !mediaUrn) {
      console.error('Missing upload URL or media URN:', initData)
      return null
    }

    // Step 2: Upload binary
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
      body: buffer
    })

    if (!uploadRes.ok) {
      const err = await uploadRes.text()
      console.error('Media binary upload failed:', err)
      return null
    }

    console.log(`${isVideo ? 'Video' : 'Image'} uploaded, waiting for AVAILABLE status...`)

    // Step 3: Wait for LinkedIn to process
    const isReady = await waitForMediaAvailable(token, mediaUrn, isVideo ? 'video' : 'image')
    if (!isReady) {
      console.error('Media did not become AVAILABLE in time')
      return null
    }
    return mediaUrn
  } catch (e) {
    console.error('Media upload exception:', e)
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
  const file = formData.get('image') as File | null // Could be image or video

  const authorUrn = urn.startsWith('urn:li:') ? urn : `urn:li:person:${urn}`
  console.log('Posting as:', authorUrn)

  // Upload media if provided
  let mediaUrn: string | null = null
  if (file && file.size > 0) {
    const arrayBuffer = await file.arrayBuffer()
    mediaUrn = await uploadMediaToLinkedIn(token, authorUrn, arrayBuffer, file.type)
    if (!mediaUrn) {
      return { success: false, error: 'Media upload failed. Try posting without an image/video.' }
    }
  }

  // Build the post body using the REST Posts API
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

  // Attach media if uploaded
  if (mediaUrn) {
    postBody.content = {
      media: {
        altText: 'Post media',
        id: mediaUrn
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
  let mediaUrn: string | null = null

  if (template.image_url) {
    const media = await getBufferFromUrl(template.image_url)
    if (media) {
      mediaUrn = await uploadMediaToLinkedIn(token, authorUrn, media.buffer, media.mimeType)
    }
  }

  // Extract clean content from template body (remove ::type- metadata if exists)
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

  if (mediaUrn) {
    postBody.content = { media: { altText: 'Post media', id: mediaUrn } }
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

    revalidatePath('/dashboard')
    return { success: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (templateId) {
      await supabase
        .from('post_templates')
        .update({ status: 'failed', rejection_reason: `Publishing exception: ${message}` })
        .eq('id', templateId)
    }
    return { success: false, error: message }
  }
}
