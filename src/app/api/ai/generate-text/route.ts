import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { topic, tone, action, existingContent } = await request.json()

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return Response.json({ error: 'Gemini API key not configured.' }, { status: 500 })
    }

    const toneGuide: Record<string, string> = {
      professional:  'formal, authoritative, expert-level — suitable for thought leadership',
      casual:        'friendly, conversational, approachable — like talking to a colleague',
      motivational:  'inspiring, energetic, uplifting — encourages action and growth',
      promotional:   'engaging, value-focused, persuasive — highlights benefits clearly',
    }

    let prompt = ''

    if (action === 'hashtags') {
      // Generate hashtag suggestions based on content
      const content = existingContent || topic || ''
      prompt = `Based on this LinkedIn post content, generate 5-8 relevant professional hashtags.

Content: "${content}"

Rules:
- Return ONLY a comma-separated list of hashtags WITHOUT the # symbol
- Example: leadership, innovation, technology, growth
- Choose tags that are widely used on LinkedIn
- Mix broad (e.g. technology) and specific (e.g. dockercontainers) hashtags
- Return ONLY the comma-separated list, nothing else`

    } else if (action === 'enhance') {
      // Enhance existing writing
      prompt = `Improve and enhance the following LinkedIn post. Make it more engaging, professional, and impactful while keeping the core message.

Original post:
"${existingContent}"

Tone: ${toneGuide[tone] || toneGuide.professional}

Rules:
- Keep the same core message and intent  
- Improve clarity, flow, and engagement
- Use short paragraphs (2-3 sentences max)
- Start with a stronger hook if needed
- End with a clear call-to-action or thought-provoking question
- Do NOT include hashtags
- Return ONLY the improved post text, nothing else`

    } else {
      // Default: generate new content from topic
      if (!topic) return Response.json({ error: 'Topic is required' }, { status: 400 })

      prompt = `Write a professional LinkedIn post about: "${topic}"

Tone: ${toneGuide[tone] || toneGuide.professional}

Requirements:
- Start with a strong, attention-grabbing first line (no generic openers like "I'm excited to share")
- 150–250 words maximum
- Use short paragraphs (2–3 sentences max) for easy mobile reading
- Include 1–2 relevant stories or insights
- End with a thought-provoking question or clear call-to-action
- Do NOT include hashtags (they will be added separately)  
- Do NOT use excessive emojis — maximum 2–3 tasteful ones
- Return ONLY the post text, no extra commentary or labels`
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: action === 'hashtags' ? 0.4 : 0.8,
            maxOutputTokens: action === 'hashtags' ? 100 : 600,
          },
        }),
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error('Gemini API Error:', response.status, errText)
      return Response.json({ error: 'AI service error. Please try again.' }, { status: 500 })
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''

    if (!text) {
      return Response.json({ error: 'No content generated. Please try again.' }, { status: 500 })
    }

    if (action === 'hashtags') {
      return Response.json({ hashtags: text })
    }
    return Response.json({ text, model: 'gemini-2.0-flash' })

  } catch (error) {
    console.error('AI text generation error:', error)
    return Response.json({ error: 'Failed to generate content.' }, { status: 500 })
  }
}
