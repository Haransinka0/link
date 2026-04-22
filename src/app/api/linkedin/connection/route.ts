import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('linkedin_token')?.value
  const urn = cookieStore.get('linkedin_urn')?.value || null
  const name = cookieStore.get('linkedin_name')?.value || null

  return NextResponse.json({
    connected: !!token && !!urn,
    name,
    urn,
  })
}

