import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LI_VERSION = '202503'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify using a dedicated CRON_SECRET header
    const cronSecret = Deno.env.get('CRON_SECRET')
    const authHeader = req.headers.get('x-cron-secret') || req.headers.get('apikey')

    if (!cronSecret || authHeader !== cronSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid cron secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Load the ONE shared LinkedIn account credentials from Supabase secrets
    const linkedinAccessToken = Deno.env.get('LINKEDIN_ACCESS_TOKEN')
    const linkedinPersonUrn = Deno.env.get('LINKEDIN_PERSON_URN')

    if (!linkedinAccessToken || !linkedinPersonUrn) {
      return new Response(
        JSON.stringify({
          error: 'LinkedIn not configured',
          details: 'LINKEDIN_ACCESS_TOKEN and LINKEDIN_PERSON_URN must be set as Supabase secrets'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client (service role bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current time
    const now = new Date().toISOString()

    // Fetch all scheduled posts that are due
    const { data: scheduledPosts, error } = await supabase
      .from('post_templates')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Database error', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!scheduledPosts || scheduledPosts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No scheduled posts due', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${scheduledPosts.length} scheduled posts to process`)

    const results = []

    for (const post of scheduledPosts) {
      try {
        console.log(`Processing post ${post.id}: ${post.title}`)

        // Post to LinkedIn
        const postResult = await postToLinkedIn(
          post.body,
          post.image_url,
          linkedinAccessToken,
          linkedinPersonUrn
        )

        if (postResult.success) {
          await supabase
            .from('post_templates')
            .update({
              status: 'published',
              published_at: new Date().toISOString(),
              rejection_reason: null,
              ...(postResult.linkedinPostId ? { linkedin_post_id: postResult.linkedinPostId } : {})
            })
            .eq('id', post.id)

          results.push({ id: post.id, title: post.title, status: 'published', success: true })
        } else {
          await supabase
            .from('post_templates')
            .update({ status: 'failed', rejection_reason: postResult.error })
            .eq('id', post.id)

          results.push({ id: post.id, title: post.title, status: 'failed', success: false, error: postResult.error })
        }
      } catch (postError: any) {
        console.error(`Error processing post ${post.id}:`, postError)
        await supabase
          .from('post_templates')
          .update({ status: 'failed', rejection_reason: postError.message })
          .eq('id', post.id)

        results.push({ id: post.id, title: post.title, status: 'failed', success: false, error: postError.message })
      }
    }

    const summary = {
      processed: scheduledPosts.length,
      published: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    }

    return new Response(JSON.stringify(summary), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: any) {
    console.error('Cron job error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

// Helper to fetch media buffer
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
    
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, type === 'video' ? 3000 : 2000))
    const res = await fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${token}`, 'LinkedIn-Version': LI_VERSION }
    })
    if (res.ok) {
      const data = await res.json()
      if (data.status === 'AVAILABLE') return true
      if (data.status === 'FAILED') return false
    }
  }
  return false
}

// Post content to LinkedIn
async function postToLinkedIn(
  fullBody: string,
  mediaUrl: string | null,
  accessToken: string,
  personUrn: string
): Promise<{ success: boolean; error?: string; linkedinPostId?: string }> {
  try {
    const authorUrn = personUrn.startsWith('urn:li:person:') ? personUrn : `urn:li:person:${personUrn}`

    // Extract metadata and clean content
    let bodyText = fullBody || ''
    let altText = 'Post media'
    const altMatch = bodyText.match(/\[Alt:\s*(.*?)\]/i)
    if (altMatch) altText = altMatch[1]

    const cleanContent = bodyText
      .replace(/\[Alt:\s*.*?\]/gi, '')
      .replace(/\[Overlay:\s*.*?\]/gi, '')
      .split('\n')
      .filter((line, i, arr) => !(line.startsWith('::') && i < arr.findIndex(l => !l.startsWith('::'))))
      .join('\n')
      .trim()

    let mediaUrn: string | null = null
    if (mediaUrl) {
      const media = await getBufferFromUrl(mediaUrl)
      if (media) {
        mediaUrn = await uploadMediaToLinkedIn(accessToken, authorUrn, media.buffer, media.mimeType)
        if (!mediaUrn) throw new Error('Media upload failed')
      } else {
        throw new Error('Media file not found')
      }
    }

    const postBody: any = {
      author: authorUrn,
      commentary: cleanContent,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: []
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false
    }

    if (mediaUrn) {
      postBody.content = { media: { altText: altText, id: mediaUrn } }
    }

    const postResponse = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': LI_VERSION,
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(postBody)
    })

    if (!postResponse.ok) {
      const errorText = await postResponse.text()
      throw new Error(`LinkedIn API error ${postResponse.status}: ${errorText}`)
    }

    const linkedinPostId = postResponse.headers.get('x-restli-id') || undefined
    return { success: true, linkedinPostId }

  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

async function uploadMediaToLinkedIn(
  token: string,
  authorUrn: string,
  buffer: ArrayBuffer,
  mimeType: string
): Promise<string | null> {
  const isVideo = mimeType.startsWith('video/')
  const endpoint = isVideo 
    ? 'https://api.linkedin.com/rest/videos?action=initializeUpload'
    : 'https://api.linkedin.com/rest/images?action=initializeUpload'

  const initBody: any = { initializeUploadRequest: { owner: authorUrn } }
  if (isVideo) {
    initBody.initializeUploadRequest.fileSizeBytes = buffer.byteLength
    initBody.initializeUploadRequest.uploadCaptions = false
    initBody.initializeUploadRequest.uploadThumbnail = false
  }

  const initRes = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': LI_VERSION,
      'X-Restli-Protocol-Version': '2.0.0'
    },
    body: JSON.stringify(initBody)
  })

  if (!initRes.ok) return null
  const initData = await initRes.json()
  const uploadUrl = isVideo ? initData.value?.uploadInstructions[0]?.uploadUrl : initData.value?.uploadUrl
  const mediaUrn = isVideo ? initData.value?.video : initData.value?.image

  if (!uploadUrl || !mediaUrn) return null

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: buffer
  })

  if (!uploadRes.ok) return null

  const isReady = await waitForMediaAvailable(token, mediaUrn, isVideo ? 'video' : 'image')
  return isReady ? mediaUrn : null
}
