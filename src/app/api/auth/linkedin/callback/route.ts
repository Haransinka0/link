import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${appUrl}/api/auth/linkedin/callback`
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const authError = searchParams.get('error')

  if (authError || !code) {
    console.error('Auth error from LinkedIn:', authError)
    return NextResponse.redirect(new URL('/dashboard?error=linkedin_auth_failed', appUrl))
  }

  try {
    // Step 1: Exchange code for access token
    const body = new URLSearchParams()
    body.append('grant_type', 'authorization_code')
    body.append('code', code)
    body.append('client_id', process.env.LINKEDIN_CLIENT_ID!)
    body.append('client_secret', process.env.LINKEDIN_CLIENT_SECRET!)
    body.append('redirect_uri', redirectUri)

    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    })

    const tokenData = await tokenRes.json()
    console.log('Token response:', JSON.stringify(tokenData))

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Token exchange failed:', tokenData)
      return NextResponse.redirect(new URL('/dashboard?error=linkedin_token_failed', appUrl))
    }

    // Step 2: Get member ID via /v2/userinfo (requires openid scope)
    const userInfoRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    })

    const userInfo = await userInfoRes.json()
    console.log('UserInfo response:', JSON.stringify(userInfo))

    if (!userInfoRes.ok || !userInfo.sub) {
      console.error('UserInfo failed:', userInfo)
      return NextResponse.redirect(new URL('/dashboard?error=linkedin_userinfo_failed', appUrl))
    }

    // Step 3: Save token + member ID to cookies
    const cookieStore = await cookies()
    const maxAge = tokenData.expires_in ?? 5184000

    cookieStore.set('linkedin_token', tokenData.access_token, {
      maxAge, path: '/', httpOnly: true, sameSite: 'lax'
    })
    cookieStore.set('linkedin_urn', userInfo.sub, {
      maxAge, path: '/', httpOnly: true, sameSite: 'lax'
    })
    if (userInfo.name) {
      cookieStore.set('linkedin_name', userInfo.name, {
        maxAge, path: '/', sameSite: 'lax'
      })
    }
    if (userInfo.picture) {
      cookieStore.set('linkedin_picture', userInfo.picture, {
        maxAge, path: '/', sameSite: 'lax'
      })
    }

    return NextResponse.redirect(new URL('/dashboard?linkedin=connected', appUrl))
  } catch (err) {
    console.error('Callback exception:', err)
    return NextResponse.redirect(new URL('/dashboard?error=linkedin_server_error', appUrl))
  }
}
