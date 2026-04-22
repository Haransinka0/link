async function run() {
  try {
    const res = await fetch("http://localhost:3000/api/ai/generate-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: "rust programming", tone: "professional" })
    });
    console.log("Status:", res.status);
    console.log("Body:", await res.text());
  } catch (e) {
    console.error(e);
  }
}
run();
