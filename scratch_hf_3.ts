import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const hfToken = process.env.HF_TOKEN;

async function test() {
  const imagePrompt = "A professional, high-quality LinkedIn post image for the topic: 'docker'. Clean, modern, corporate aesthetic. No text or watermarks inside image.";
  const models = [
    'stabilityai/sdxl-turbo',
    'ByteDance/SDXL-Lightning',
    'dataautogpt3/OpenDalleV1.1',
    'cagliostrolab/animagine-xl-3.1'
  ];

  for (const model of models) {
    console.log(`Trying ${model}...`);
    try {
      const response = await fetch(
        `https://router.huggingface.co/hf-inference/models/${model}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${hfToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inputs: imagePrompt }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        console.error(`Failed with ${model}:`, response.status, text);
        continue;
      }
      console.log(`Success with ${model}`);
      return;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      console.error(`Error with ${model}:`, message);
    }
  }
}

test();
