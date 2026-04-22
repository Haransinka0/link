async function test() {
  const prompt = "A professional, high-quality LinkedIn post image for the topic: 'docker'. Clean, modern, corporate aesthetic. No text or watermarks inside image.";
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=800&nologo=true`;
  console.log(`Fetching from ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    console.error("Failed", res.status);
    return;
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  console.log("Success! Base64 starts with", buffer.toString('base64').substring(0, 50));
}
test();
