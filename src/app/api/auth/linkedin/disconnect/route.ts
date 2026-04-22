import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  cookieStore.delete('linkedin_token')
  cookieStore.delete('linkedin_urn')
  cookieStore.delete('linkedin_name')
  cookieStore.delete('linkedin_picture')
  return NextResponse.redirect(new URL('/dashboard?linkedin=disconnected', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'))
}
