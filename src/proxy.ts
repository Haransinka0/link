import { NextResponse, type NextRequest } from 'next/server'

function isAuthenticated(request: NextRequest): boolean {
  // Check for Microsoft session cookie
  return !!request.cookies.get('ms_user_id')?.value
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const authed = isAuthenticated(request)

  const protectedPrefixes = [
    '/dashboard', '/admin', '/employees', '/projects',
    '/templates', '/approvals', '/schedule',
  ]
  const authRoutes = ['/login', '/signup']

  const isProtected = protectedPrefixes.some(p => pathname.startsWith(p))
  const isAuthRoute = authRoutes.some(p => pathname.startsWith(p))

  if (isProtected && !authed) {
    const url = new URL('/login', appUrl)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (isAuthRoute && authed) {
    return NextResponse.redirect(new URL('/dashboard', appUrl))
  }

  // Admin-only guard
  if (pathname.startsWith('/admin')) {
    const role = request.cookies.get('ms_user_role')?.value
    if (role && role !== 'admin' && role !== 'manager') {
      return NextResponse.redirect(new URL('/dashboard', appUrl))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth/microsoft|api/auth/linkedin).*)',
  ],
}
