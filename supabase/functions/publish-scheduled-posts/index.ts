import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── LinkedIn API Version ────────────────────────────────────────────────────
// LinkedIn releases versions monthly in YYYYMM format but skips some months.
// Versions expire after 1 year. Since it's April 2026, we use 202603.
const LI_VERSION = '202603'

// ─── CORS ────────────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret, x-cron-api-key',
}

// ─── Entry Point ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── 1. Auth: Verify the cron secret (after Supabase gateway passes the request through) ──
    const cronSecret = Deno.env.get('CRON_SECRET')
    const incomingSecret =
      req.headers.get('x-cron-secret') ||
      req.headers.get('x-cron-api-key')

    console.log(`[auth] cronSecret set: ${!!cronSecret}, incomingSecret set: ${!!incomingSecret}`)

    if (!cronSecret || incomingSecret !== cronSecret) {
      console.error('[auth] Unauthorized — secret mismatch or missing')
      return new Response(
        JSON.stringify({ error: 'Unauthorized — invalid cron secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 2. Load LinkedIn credentials from Supabase secrets ──
    const linkedinAccessToken = Deno.env.get('LINKEDIN_ACCESS_TOKEN')
    const linkedinPersonUrn   = Deno.env.get('LINKEDIN_PERSON_URN')

    console.log(`[config] LI token set: ${!!linkedinAccessToken}, LI URN set: ${!!linkedinPersonUrn}`)

    if (!linkedinAccessToken || !linkedinPersonUrn) {
      console.error('[config] LinkedIn credentials missing from Supabase secrets')
      return new Response(
        JSON.stringify({
          error: 'LinkedIn not configured',
          details: 'Set LINKEDIN_ACCESS_TOKEN and LINKEDIN_PERSON_URN in Supabase Dashboard → Settings → Edge Functions → Secrets',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 3. Supabase client (service role bypasses RLS) ──
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ── 4. Fetch all scheduled posts that are now due ──
    const now = new Date().toISOString()
    console.log(`[db] Checking for posts due before ${now}`)

    const { data: scheduledPosts, error: dbError } = await supabase
      .from('post_templates')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })

    if (dbError) {
      console.error('[db] Query error:', dbError)
      return new Response(
        JSON.stringify({ error: 'Database error', details: dbError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!scheduledPosts || scheduledPosts.length === 0) {
      console.log('[db] No posts due right now.')
      return new Response(
        JSON.stringify({ message: 'No scheduled posts due', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[db] Found ${scheduledPosts.length} post(s) to process`)

    // ── 5. Process each post ──
    const results: Array<{
      id: string; title: string; status: string; success: boolean; error?: string
    }> = []

    for (const post of scheduledPosts) {
      console.log(`[post] Processing "${post.title}" (${post.id})`)
      try {
        const result = await postToLinkedIn(
          post.body,
          post.image_url ?? null,
          linkedinAccessToken,
          linkedinPersonUrn
        )

        if (result.success) {
          console.log(`[post] ✅ Published "${post.title}" → ${result.linkedinPostId}`)
          await supabase
            .from('post_templates')
            .update({
              status: 'published',
              published_at: new Date().toISOString(),
              rejection_reason: null,
              ...(result.linkedinPostId ? { linkedin_post_id: result.linkedinPostId } : {}),
            })
            .eq('id', post.id)

          results.push({ id: post.id, title: post.title, status: 'published', success: true })
        } else {
          console.error(`[post] ❌ Failed "${post.title}":`, result.error)
          await supabase
            .from('post_templates')
            .update({ status: 'failed', rejection_reason: result.error })
            .eq('id', post.id)

          results.push({ id: post.id, title: post.title, status: 'failed', success: false, error: result.error })
        }
      } catch (err: any) {
        console.error(`[post] ❌ Exception on "${post.title}":`, err)
        await supabase
          .from('post_templates')
          .update({ status: 'failed', rejection_reason: err.message })
          .eq('id', post.id)

        results.push({ id: post.id, title: post.title, status: 'failed', success: false, error: err.message })
      }
    }

    const summary = {
      processed: scheduledPosts.length,
      published: results.filter(r => r.success).length,
      failed:    results.filter(r => !r.success).length,
      results,
    }

    console.log('[done] Summary:', JSON.stringify(summary))
    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('[fatal] Unhandled error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Initialise upload (image or video) and get uploadUrl + mediaUrn
// Returns the result or throws with the exact LinkedIn error message
// ─────────────────────────────────────────────────────────────────────────────
async function initializeMediaUpload(
  token: string,
  authorUrn: string,
  isVideo: boolean,
  fileSizeBytes?: number
): Promise<{ uploadUrl: string; mediaUrn: string }> {
  const endpoint = isVideo
    ? 'https://api.linkedin.com/rest/videos?action=initializeUpload'
    : 'https://api.linkedin.com/rest/images?action=initializeUpload'

  const body: any = { initializeUploadRequest: { owner: authorUrn } }
  if (isVideo && fileSizeBytes !== undefined) {
    body.initializeUploadRequest.fileSizeBytes    = fileSizeBytes
    body.initializeUploadRequest.uploadCaptions   = false
    body.initializeUploadRequest.uploadThumbnail  = false
  }

  console.log(`[media] Initializing ${isVideo ? 'video' : 'image'} upload for owner: ${authorUrn}`)
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': LI_VERSION,
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  })

  const rawBody = await res.text()
  console.log(`[media] Initialize response ${res.status}:`, rawBody)

  if (!res.ok) {
    throw new Error(`LinkedIn initializeUpload failed (${res.status}): ${rawBody}`)
  }

  const data = JSON.parse(rawBody)
  const uploadUrl = isVideo
    ? data.value?.uploadInstructions?.[0]?.uploadUrl
    : data.value?.uploadUrl
  const mediaUrn = isVideo ? data.value?.video : data.value?.image

  if (!uploadUrl || !mediaUrn) {
    throw new Error(`LinkedIn initializeUpload missing fields. Response: ${rawBody}`)
  }

  console.log(`[media] Got mediaUrn: ${mediaUrn}`)
  return { uploadUrl, mediaUrn }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Upload the binary to LinkedIn's upload URL
// ─────────────────────────────────────────────────────────────────────────────
async function uploadBinary(uploadUrl: string, buffer: ArrayBuffer, mimeType: string): Promise<boolean> {
  console.log(`[media] Uploading binary (${buffer.byteLength} bytes, ${mimeType})…`)
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: buffer,
  })
  if (!res.ok) {
    const err = await res.text()
    console.error(`[media] Binary upload failed ${res.status}:`, err)
    return false
  }
  console.log('[media] Binary upload success')
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3a — For images: 2-second CDN processing delay (no polling needed)
// STEP 3b — For videos: poll /videos/{urn} until status === 'AVAILABLE'
// ─────────────────────────────────────────────────────────────────────────────
async function waitForMediaReady(token: string, mediaUrn: string, type: 'image' | 'video'): Promise<boolean> {
  if (type === 'image') {
    console.log('[media] Image — waiting 2 s for CDN processing…')
    await new Promise(r => setTimeout(r, 2000))
    return true
  }

  // Video polling
  const encoded  = encodeURIComponent(mediaUrn)
  const endpoint = `https://api.linkedin.com/rest/videos/${encoded}`
  const maxAttempts = 20
  const delayMs     = 3000

  console.log(`[media] Video — polling status (max ${maxAttempts} attempts)…`)
  for (let i = 1; i <= maxAttempts; i++) {
    await new Promise(r => setTimeout(r, delayMs))
    const res = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'LinkedIn-Version': LI_VERSION,
      },
    })
    if (res.ok) {
      const data = await res.json()
      console.log(`[media] Video status attempt ${i}: ${data.status}`)
      if (data.status === 'AVAILABLE') return true
      if (data.status === 'FAILED')    return false
    } else {
      console.warn(`[media] Polling attempt ${i} returned ${res.status}`)
    }
  }
  console.error('[media] Video timed out waiting for AVAILABLE status')
  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// Full 3-step media upload orchestrator — throws with exact error on failure
// ─────────────────────────────────────────────────────────────────────────────
async function uploadMediaToLinkedIn(
  token: string,
  authorUrn: string,
  buffer: ArrayBuffer,
  mimeType: string
): Promise<string> {
  const isVideo = mimeType.startsWith('video/')
  const type    = isVideo ? 'video' : 'image'

  // Step 1: Initialize (throws on failure)
  const init = await initializeMediaUpload(token, authorUrn, isVideo, isVideo ? buffer.byteLength : undefined)

  // Step 2: Upload binary (throws on failure)
  const uploaded = await uploadBinary(init.uploadUrl, buffer, mimeType)
  if (!uploaded) throw new Error('Failed to PUT binary to LinkedIn upload URL')

  // Step 3: Wait for processing
  const ready = await waitForMediaReady(token, init.mediaUrn, type)
  if (!ready) throw new Error(`LinkedIn media processing timed out or failed for ${init.mediaUrn}`)

  return init.mediaUrn
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch a URL or data-URI into an ArrayBuffer
// Supports public URLs, Supabase storage URLs, and base64 data URIs
// ─────────────────────────────────────────────────────────────────────────────
async function getBufferFromUrl(url: string): Promise<{ buffer: ArrayBuffer; mimeType: string }> {
  if (url.startsWith('data:')) {
    const m = url.match(/^data:([a-zA-Z0-9+\-.]+\/[a-zA-Z0-9+\-.]+);base64,(.+)$/)
    if (!m) throw new Error('Invalid data URI format')
    const mimeType = m[1]
    const binary   = atob(m[2])
    const bytes    = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return { buffer: bytes.buffer, mimeType }
  }

  console.log(`[media] Fetching media from URL: ${url.substring(0, 120)}`)

  // Build headers — add service role key for Supabase storage URLs
  const fetchHeaders: Record<string, string> = {}
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  if (url.startsWith(supabaseUrl)) {
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    fetchHeaders['Authorization'] = `Bearer ${serviceKey}`
    fetchHeaders['apikey'] = serviceKey
    console.log('[media] Detected Supabase storage URL — adding service role auth')
  }

  const res = await fetch(url, { headers: fetchHeaders })
  console.log(`[media] Fetch response: ${res.status} ${res.statusText}, content-type: ${res.headers.get('content-type')}`)

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Failed to fetch media (${res.status}): ${body.substring(0, 200)}`)
  }

  const buffer   = await res.arrayBuffer()
  const mimeType = res.headers.get('content-type')?.split(';')[0].trim() || 'image/jpeg'
  console.log(`[media] Fetched ${buffer.byteLength} bytes, mimeType: ${mimeType}`)
  return { buffer, mimeType }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main LinkedIn post creator — text-only or with image/video
// ─────────────────────────────────────────────────────────────────────────────
async function postToLinkedIn(
  fullBody: string,
  mediaUrl: string | null,
  accessToken: string,
  personUrn: string
): Promise<{ success: boolean; error?: string; linkedinPostId?: string }> {
  try {
    const authorUrn = personUrn.startsWith('urn:li:person:')
      ? personUrn
      : `urn:li:person:${personUrn}`

    console.log(`[post] Author URN: ${authorUrn}`)

    // Clean post body — strip internal tags
    let altText = 'Post media'
    const altMatch = fullBody.match(/\[Alt:\s*(.*?)\]/i)
    if (altMatch) altText = altMatch[1]

    const cleanContent = fullBody
      .replace(/\[Alt:\s*.*?\]/gi, '')
      .replace(/\[Overlay:\s*.*?\]/gi, '')
      .replace(/::.*?::/g, '')
      .trim()

    // Upload media if present (3-step flow) — throws with exact error if fails
    let mediaUrn: string | null = null
    if (mediaUrl && mediaUrl.trim()) {
      console.log(`[post] Media URL: ${mediaUrl.substring(0, 120)}`)
      const media = await getBufferFromUrl(mediaUrl)  // throws on failure
      mediaUrn    = await uploadMediaToLinkedIn(accessToken, authorUrn, media.buffer, media.mimeType)  // throws on failure
      console.log(`[post] Media ready: ${mediaUrn}`)
    }

    // Build post payload
    const postBody: Record<string, unknown> = {
      author: authorUrn,
      commentary: cleanContent,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }

    if (mediaUrn) {
      postBody.content = { media: { altText, id: mediaUrn } }
    }

    console.log('[post] Submitting post to LinkedIn…')
    console.log('[post] Payload:', JSON.stringify(postBody))

    const postRes = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': LI_VERSION,
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(postBody),
    })

    const postResBody = await postRes.text()
    console.log(`[post] LinkedIn post response ${postRes.status}:`, postResBody)

    if (!postRes.ok) {
      throw new Error(`LinkedIn posts API ${postRes.status}: ${postResBody}`)
    }

    const linkedinPostId = postRes.headers.get('x-restli-id') ?? undefined
    console.log(`[post] ✅ Post created. LinkedIn ID: ${linkedinPostId}`)
    return { success: true, linkedinPostId }
  } catch (err: any) {
    console.error('[post] ❌ postToLinkedIn error:', err.message)
    return { success: false, error: err.message }
  }
}
