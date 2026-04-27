import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const now = new Date().toISOString()
  console.log(`Checking for scheduled posts due before ${now}...`)

  const { data, error } = await supabase
    .from('post_templates')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)

  if (error) {
    console.error('Error fetching posts:', error)
    return
  }

  if (!data || data.length === 0) {
    console.log('No posts due right now.')
    return
  }

  console.log(`Found ${data.length} posts to process. To actually publish them, we need to hit the API or Edge Function.`)
  console.log('Post IDs:', data.map(p => p.id))
}

run()
