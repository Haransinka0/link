import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  // Check schema columns available on post_templates
  const { data, error } = await supabase
    .from('post_templates')
    .select('*')
    .limit(1);

  if (error) {
    console.error('DB Error:', error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log('Available columns:', Object.keys(data[0]));
    console.log('Sample image_url:', data[0].image_url);
    console.log('Sample ai_generated:', data[0].ai_generated);
  } else {
    console.log('No rows yet.');
    // Try an insert to see what columns exist
    const { error: insertError } = await supabase.from('post_templates').insert({
      created_by: '48789a2f-5765-4038-97ad-98a2af7d9bad',
      project_id: '45872581-671c-4581-9ced-7eeac5d5601b',
      title: 'Test Image URL Storage',
      body: 'Test post content',
      tone: 'professional',
      hashtags: ['test'],
      status: 'draft',
      image_url: 'https://image.pollinations.ai/prompt/test?width=1200&height=627',
      ai_generated: true
    });
    if (insertError) {
      console.error('Insert error:', insertError.message);
      console.log('Hint: column "ai_generated" may not exist in schema');
    } else {
      console.log('Test insert succeeded!');
    }
  }
}

check();
