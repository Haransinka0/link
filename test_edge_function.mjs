/**
 * Directly tests the deployed Edge Function end-to-end.
 * Run: node test_edge_function.mjs
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY      = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const CRON_SECRET   = process.env.CRON_SECRET

const EDGE_URL = `${SUPABASE_URL}/functions/v1/publish-scheduled-posts`

async function test() {
  console.log('=== Edge Function Direct Test ===')
  console.log('URL        :', EDGE_URL)
  console.log('ANON_KEY   :', ANON_KEY ? '✅ present' : '❌ MISSING')
  console.log('CRON_SECRET:', CRON_SECRET ? '✅ present' : '❌ MISSING')
  console.log('')

  if (!ANON_KEY || !CRON_SECRET) {
    console.error('Fix your .env.local before retrying.')
    process.exit(1)
  }

  const res = await fetch(EDGE_URL, {
    method: 'POST',
    headers: {
      // Supabase gateway requires this to let the request through
      'Authorization' : `Bearer ${ANON_KEY}`,
      // Edge Function itself checks this for cron identity
      'x-cron-secret' : CRON_SECRET,
      'Content-Type'  : 'application/json',
    },
    body: JSON.stringify({}),
  })

  const text = await res.text()
  console.log(`HTTP Status: ${res.status}`)

  try {
    const json = JSON.parse(text)
    console.log('Response   :', JSON.stringify(json, null, 2))

    if (res.status === 401)  console.error('\n❌ 401 — CRON_SECRET mismatch. Set it in Supabase Dashboard → Settings → Edge Functions → Secrets')
    else if (res.status === 500 && json.error?.includes('LinkedIn not configured'))
      console.error('\n❌ LinkedIn secrets missing. Add LINKEDIN_ACCESS_TOKEN + LINKEDIN_PERSON_URN to Supabase Secrets.')
    else if (res.ok && json.processed === 0)
      console.log('\n✅ Edge Function is healthy! No posts are currently due.')
    else if (res.ok)
      console.log(`\n✅ SUCCESS — Published: ${json.published}, Failed: ${json.failed}`)
  } catch {
    console.log('Raw body:', text)
  }
}

test().catch(console.error)
