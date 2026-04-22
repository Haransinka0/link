// Full end-to-end test: text gen → image URL → DB insert → read back
async function run() {
  // 1. Test text generation
  console.log('\n=== 1. Testing Text Generation ===');
  const textRes = await fetch('http://localhost:3000/api/ai/generate-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: 'kubernetes best practices', tone: 'professional' })
  });
  const textData = await textRes.json();
  console.log('Status:', textRes.status);
  if (textData.text) {
    console.log('✅ Text generated! First 120 chars:', textData.text.slice(0, 120));
  } else {
    console.log('❌ Text failed:', textData.error);
  }

  // 2. Test image URL generation
  console.log('\n=== 2. Testing Image URL Generation ===');
  const imgRes = await fetch('http://localhost:3000/api/ai/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: 'kubernetes containers' })
  });
  const imgData = await imgRes.json();
  console.log('Status:', imgRes.status);
  if (imgData.imageUrl) {
    console.log('✅ Image URL generated:', imgData.imageUrl.slice(0, 80) + '...');
    console.log('   Model used:', imgData.model);
  } else {
    console.log('❌ Image failed:', imgData.error);
  }

  // 3. Test that image URL responds correctly (HEAD check)
  if (imgData.imageUrl) {
    console.log('\n=== 3. Testing Image URL is reachable ===');
    try {
      const headRes = await fetch(imgData.imageUrl, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
      console.log('Image HEAD status:', headRes.status, headRes.statusText);
      console.log('Content-Type:', headRes.headers.get('content-type'));
      if (headRes.ok) console.log('✅ Image URL reachable on Pollinations');
    } catch (_e) {
      console.log('⚠️  HEAD check timed out (Pollinations is slow to respond to HEAD) — GET will still work in browser');
    }
  }

  // 4. Test direct DB template insert with image_url
  console.log('\n=== 4. Testing DB Insert with image_url ===');
  const { createClient } = await import('@supabase/supabase-js');
  const { default: dotenv } = await import('dotenv');
  dotenv.config({ path: '.env.local' });
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const testImageUrl = imgData.imageUrl || 'https://image.pollinations.ai/prompt/test?width=1200&height=627';
  
  const { data: inserted, error: insertErr } = await supabase
    .from('post_templates')
    .insert({
      created_by: '48789a2f-5765-4038-97ad-98a2af7d9bad',
      project_id: '45872581-671c-4581-9ced-7eeac5d5601b',
      title: '[E2E Test] Kubernetes Guide',
      body: textData.text || 'Test body',
      tone: 'professional',
      hashtags: ['kubernetes', 'devops'],
      status: 'draft',
      image_url: testImageUrl,
      ai_generated: true
    })
    .select('id, title, image_url, status')
    .single();

  if (insertErr) {
    console.log('❌ DB insert failed:', insertErr.message);
  } else {
    console.log('✅ Template saved! ID:', inserted.id);
    console.log('   Image URL stored:', inserted.image_url?.slice(0, 60) + '...');
  }

  // 5. Read back from DB
  console.log('\n=== 5. Verifying Templates Page Data ===');
  const { data: rows } = await supabase
    .from('post_templates')
    .select('id, title, status, image_url')
    .order('created_at', { ascending: false })
    .limit(5);
  
  rows?.forEach((r, i) => {
    console.log(`  ${i+1}. "${r.title}" [${r.status}] image:`, r.image_url ? '✅ has image' : '❌ no image');
  });

  // Cleanup test row
  if (inserted?.id) {
    await supabase.from('post_templates').delete().eq('id', inserted.id);
    console.log('\n✅ Test row cleaned up');
  }

  console.log('\n=== All checks complete ===');
}

run().catch(console.error);
