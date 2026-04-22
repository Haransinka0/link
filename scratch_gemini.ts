import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("No API key");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function test() {
  const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro', 'gemini-pro', 'gemini-1.5-flash-latest'];
  for (const m of models) {
    try {
      console.log(`Trying ${m}...`);
      const model = genAI.getGenerativeModel({ model: m });
      const result = await model.generateContent("Say 'hello world'");
      console.log(`Success with ${m}:`, result.response.text());
      return;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      console.error(`Failed with ${m}:`, message);
    }
  }
}

test();
