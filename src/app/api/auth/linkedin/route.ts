import { NextResponse } from 'next/server'

export async function GET() {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${appUrl}/api/auth/linkedin/callback`
  const targetUrl = new URL('https://www.linkedin.com/oauth/v2/authorization')

  targetUrl.searchParams.set('response_type', 'code')
  targetUrl.searchParams.set('client_id', process.env.LINKEDIN_CLIENT_ID!)
  targetUrl.searchParams.set('redirect_uri', redirectUri)
  targetUrl.searchParams.set('state', 'linkedpost_auth')

  // openid + profile gives us /v2/userinfo access (sub = Member ID)
  // w_member_social allows posting
  targetUrl.searchParams.set('scope', 'openid profile w_member_social')

  return NextResponse.redirect(targetUrl.toString())
}
