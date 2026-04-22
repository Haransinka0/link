import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function setSessionCookies(response: NextResponse, params: {
  userId: string
  email: string
  name: string
  role: string
  accessToken: string
  expiresIn?: number
}) {
  const maxAge = params.expiresIn ?? 3600
  response.cookies.set('ms_user_id', params.userId, { maxAge: maxAge * 24, httpOnly: true, path: '/', sameSite: 'lax' })
  response.cookies.set('ms_user_email', params.email, { maxAge: maxAge * 24, httpOnly: true, path: '/', sameSite: 'lax' })
  response.cookies.set('ms_user_name', params.name, { maxAge: maxAge * 24, httpOnly: true, path: '/', sameSite: 'lax' })
  response.cookies.set('ms_user_role', params.role, { maxAge: maxAge * 24, httpOnly: true, path: '/', sameSite: 'lax' })
  response.cookies.set('ms_access_token', params.accessToken, { maxAge, httpOnly: true, path: '/', sameSite: 'lax' })
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')

  if (error || !code) {
    console.error('Microsoft auth error:', error)
    return NextResponse.redirect(new URL('/login?error=microsoft_auth_failed', appUrl))
  }

  try {
    const tenantId = process.env.MICROSOFT_TENANT_ID || 'common'
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${appUrl}/api/auth/microsoft/callback`

    // Exchange code for tokens
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          scope: 'openid profile email User.Read',
        }).toString(),
      }
    )

    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      console.error('Token exchange failed:', tokenData)
      if (tokenData?.error === 'invalid_client') {
        return NextResponse.redirect(new URL('/login?error=invalid_client_secret', appUrl))
      }
      return NextResponse.redirect(new URL('/login?error=token_failed', appUrl))
    }

    // Get user profile from Microsoft Graph
    const graphRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const msUser = await graphRes.json()

    const email = msUser.mail || msUser.userPrincipalName
    if (!msUser.id || !email) {
      return NextResponse.redirect(new URL('/login?error=profile_failed', appUrl))
    }

    const requiredEmail = process.env.MICROSOFT_REQUIRED_EMAIL?.toLowerCase()
    if (requiredEmail && email.toLowerCase() !== requiredEmail) {
      return NextResponse.redirect(new URL('/login?error=unauthorized', appUrl))
    }

    const name = msUser.displayName || email.split('@')[0]
    const microsoftId = msUser.id

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase service role configuration.')
      return NextResponse.redirect(new URL('/login?error=server_error', appUrl))
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const { data: existingUser, error: userLookupError } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', email)
      .single()

    if (userLookupError?.code === 'PGRST205') {
      console.warn('Users table missing; falling back to cookie-only Microsoft session.')
      const response = NextResponse.redirect(new URL('/dashboard', appUrl))
      setSessionCookies(response, {
        userId: microsoftId,
        email,
        name,
        role: 'admin',
        accessToken: tokenData.access_token,
        expiresIn: tokenData.expires_in,
      })
      return response
    }

    if (userLookupError && userLookupError.code !== 'PGRST116') {
      console.error('User lookup failed:', userLookupError)
      return NextResponse.redirect(new URL('/login?error=server_error', appUrl))
    }

    let userId = existingUser?.id
    let userRole = existingUser?.role || 'employee'

    if (!existingUser) {
      // First user bootstrap: make the very first person admin.
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
      const bootstrapRole = (usersCount || 0) === 0 ? 'admin' : 'employee'

      const { data: createdAuthUser, error: createAuthError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { name, microsoft_id: microsoftId },
      })

      if (createAuthError && createAuthError.message !== 'A user with this email address has already been registered') {
        console.error('Auth user create failed:', createAuthError)
        return NextResponse.redirect(new URL('/login?error=server_error', appUrl))
      }

      userId = createdAuthUser?.user?.id

      if (!userId) {
        const { data: usersPage, error: listUsersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
        if (listUsersError) {
          console.error('Auth user list failed:', listUsersError)
          return NextResponse.redirect(new URL('/login?error=server_error', appUrl))
        }
        userId = usersPage.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id
      }

      if (!userId) {
        console.error('Could not resolve auth user id for:', email)
        return NextResponse.redirect(new URL('/login?error=server_error', appUrl))
      }

      const { error: insertUserError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email,
          name,
          role: bootstrapRole,
          microsoft_id: microsoftId,
          is_active: true,
        })

      if (insertUserError && insertUserError.code !== '23505') {
        console.error('Users table insert failed:', insertUserError)
        return NextResponse.redirect(new URL('/login?error=server_error', appUrl))
      }
    }

    await supabase
      .from('users')
      .update({ microsoft_id: microsoftId, name })
      .eq('id', userId)

    const { data: finalUser, error: finalUserError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .single()

    if (finalUserError || !finalUser) {
      console.error('Final user lookup failed:', finalUserError)
      return NextResponse.redirect(new URL('/login?error=server_error', appUrl))
    }

    userId = finalUser.id
    userRole = finalUser.role || 'employee'

    const response = NextResponse.redirect(new URL('/dashboard', appUrl))
    setSessionCookies(response, {
      userId,
      email,
      name,
      role: userRole,
      accessToken: tokenData.access_token,
      expiresIn: tokenData.expires_in,
    })
    return response
  } catch (err) {
    console.error('Microsoft callback exception:', err)
    return NextResponse.redirect(new URL('/login?error=server_error', appUrl))
  }
}
