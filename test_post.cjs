async function run() {
  const prompt = "Write a short sentence about rust";
  const res = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { 
              role: 'system', 
              content: 'You are an expert strict LinkedIn copywriter. Output MUST be ONLY the final post text. NEVER output JSON. NEVER output reasoning. NEVER include internal thoughts.' 
            },
            { role: 'user', content: prompt }
          ],
          model: 'openai'
        })
      });
  console.log("Status:", res.status);
  const raw = await res.text();
  console.log("Raw output:", raw);
}
run();
