import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.MICROSOFT_CLIENT_ID!
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common'
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${appUrl}/api/auth/microsoft/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: 'openid profile email User.Read offline_access',
    state: crypto.randomUUID(),
    prompt: 'select_account',
  })

  const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`
  return NextResponse.redirect(authUrl)
}
