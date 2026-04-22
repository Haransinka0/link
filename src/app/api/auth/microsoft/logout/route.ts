import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const response = NextResponse.redirect(new URL('/login', appUrl))
  // Clear all session cookies
  const cookiesToClear = ['ms_user_id', 'ms_user_email', 'ms_user_name', 'ms_access_token',
    'ms_pending_email', 'ms_pending_name', 'ms_pending_id',
    'linkedin_token', 'linkedin_urn', 'linkedin_name', 'linkedin_picture']
  cookiesToClear.forEach(name => {
    response.cookies.set(name, '', { maxAge: 0, path: '/' })
  })
  return response
}
