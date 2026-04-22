import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function run() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.log('No GEMINI_API_KEY found')
    return
  }
  
  console.log('Fetching models with key starting with:', apiKey.substring(0, 10))
  
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
    if (!res.ok) {
      console.log(`Error ${res.status}: ${await res.text()}`)
      return
    }
    const data = await res.json() as { models?: Array<{ name: string; supportedGenerationMethods: string[] }> }
    console.log('SUCCESS. Available models:')
    data.models?.forEach((model) => console.log(model.name, model.supportedGenerationMethods.join(', ')))
  } catch (err) {
    console.error('Fetch failed:', err)
  }
}
run()
