import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// POST /api/auth/linkedin/save-urn  { urn: "ABC123" }
export async function POST(request: NextRequest) {
  const { urn } = await request.json()
  if (!urn || typeof urn !== 'string') {
    return NextResponse.json({ error: 'Invalid URN' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const token = cookieStore.get('linkedin_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Not connected' }, { status: 401 })
  }

  // Clean the URN — accept full URL like linkedin.com/in/username or just the ID
  let cleanUrn = urn.trim()

  // If user pastes a LinkedIn profile URL, extract the member ID
  // Profile URLs look like: https://www.linkedin.com/in/username/
  // But the numeric/alphanumeric URN is what we need from the URN field
  // Accept both "urn:li:person:ABC123" and just "ABC123"
  const urnMatch = cleanUrn.match(/urn:li:person:([^/\s]+)/)
  if (urnMatch) {
    cleanUrn = urnMatch[1]
  }

  cookieStore.set('linkedin_urn', cleanUrn, {
    maxAge: 5184000, // 60 days
    path: '/',
    httpOnly: true,
    sameSite: 'lax'
  })

  return NextResponse.json({ success: true, urn: cleanUrn })
}
