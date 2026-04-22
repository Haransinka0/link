import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    // Fetch all scheduled posts that are due (from ANY user)
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

    // Process each scheduled post — all posted via the ONE shared LinkedIn account
    for (const post of scheduledPosts) {
      try {
        console.log(`Processing post ${post.id}: ${post.title}`)

        // Extract clean content (strip any :: metadata lines at the top)
        const lines = (post.body || '').split('\n')
        let idx = 0
        while (idx < lines.length && lines[idx].startsWith('::')) {
          idx += 1
        }
        const cleanContent = lines.slice(idx).join('\n').trim()

        if (!cleanContent) {
          throw new Error('Post body is empty after stripping metadata')
        }

        // Post to LinkedIn using the shared company account
        const postResult = await postToLinkedIn(
          cleanContent,
          post.image_url,
          linkedinAccessToken,
          linkedinPersonUrn
        )

        if (postResult.success) {
          // Mark as published
          await supabase
            .from('post_templates')
            .update({
              status: 'published',
              published_at: new Date().toISOString(),
              rejection_reason: null,
              ...(postResult.linkedinPostId ? { linkedin_post_id: postResult.linkedinPostId } : {})
            })
            .eq('id', post.id)

          results.push({
            id: post.id,
            title: post.title,
            status: 'published',
            success: true
          })
          console.log(`Successfully published post ${post.id}`)
        } else {
          // Mark as failed
          await supabase
            .from('post_templates')
            .update({
              status: 'failed',
              rejection_reason: postResult.error
            })
            .eq('id', post.id)

          results.push({
            id: post.id,
            title: post.title,
            status: 'failed',
            success: false,
            error: postResult.error
          })
          console.log(`Failed to publish post ${post.id}: ${postResult.error}`)
        }
      } catch (postError: any) {
        console.error(`Error processing post ${post.id}:`, postError)

        // Mark as failed
        await supabase
          .from('post_templates')
          .update({
            status: 'failed',
            rejection_reason: postError.message
          })
          .eq('id', post.id)

        results.push({
          id: post.id,
          title: post.title,
          status: 'failed',
          success: false,
          error: postError.message
        })
      }
    }

    const summary = {
      processed: scheduledPosts.length,
      published: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    }

    console.log('Cron job completed:', summary)

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Cron job error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Posts content to the ONE shared LinkedIn company account
async function postToLinkedIn(
  content: string,
  imageUrl: string | null,
  accessToken: string,
  personUrn: string
): Promise<{ success: boolean; error?: string; linkedinPostId?: string }> {
  try {
    const authorUrn = personUrn.startsWith('urn:li:person:')
      ? personUrn
      : `urn:li:person:${personUrn}`

    const postBody: any = {
      author: authorUrn,
      commentary: content,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: []
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false
    }

    const postResponse = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202503',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(postBody)
    })

    if (!postResponse.ok) {
      const errorText = await postResponse.text()
      throw new Error(`LinkedIn API error ${postResponse.status}: ${errorText}`)
    }

    // LinkedIn returns the post ID in the x-restli-id header
    const linkedinPostId = postResponse.headers.get('x-restli-id') || undefined

    return { success: true, linkedinPostId }

  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
