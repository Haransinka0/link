import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { topic } = await request.json()

    if (!topic) {
      return Response.json({ error: 'Topic is required' }, { status: 400 })
    }

    const imagePrompt = `Photorealistic professional business scene representing ${topic}, modern corporate aesthetic, clean minimal design, no text, no watermarks, cinematic lighting, 8k quality`
    const encodedPrompt = encodeURIComponent(imagePrompt)
    // Use a stable URL — gets stored directly in Supabase, no base64 needed
    const seed = Math.floor(Math.random() * 999999)
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1200&height=627&nologo=true&model=flux&seed=${seed}`

    return Response.json({ imageUrl, model: 'pollinations-flux' })

  } catch (error: unknown) {
    console.error('Image generation error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: `Image generation failed. (${message})` }, { status: 500 })
  }
}
