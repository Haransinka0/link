import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function check() {
  const { data: projects, error: pErr } = await supabase.from('projects').select('id, name')
  console.log('--- ALL PROJECTS IN DB ---')
  console.log(projects)
}

check()
