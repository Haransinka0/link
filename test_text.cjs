async function run() {
  const prompt = "Write a professional LinkedIn post about rust programming";
  const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}`;
  const res = await fetch(url);
  console.log(res.status);
  console.log(await res.text());
}
run();
