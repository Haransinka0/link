import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.rpc('get_policies') || await supabase.from('pg_policies').select('*').limit(10);
  if (error) {
     const res2 = await supabase.from('post_templates').select('*', { head: false, count: 'exact' });
     console.log('Using service role works:', res2.count);
  } else {
     console.log('Policies:', data);
  }
}
check();
