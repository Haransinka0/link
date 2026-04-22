import Link from 'next/link'

const MicrosoftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
    <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
    <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
    <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
  </svg>
)

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const params = await searchParams
  const errorMessages: Record<string, string> = {
    microsoft_auth_failed: 'Microsoft sign-in was cancelled or failed. Please try again.',
    token_failed: 'Could not complete sign-in. Please try again.',
    invalid_client_secret: 'Microsoft client secret is invalid or expired. Update MICROSOFT_CLIENT_SECRET in .env.local with the secret VALUE from Azure.',
    profile_failed: 'Could not read your Microsoft profile. Contact your administrator.',
    server_error: 'An unexpected error occurred. Please try again.',
    unauthorized: 'Your account is not authorised. Contact your administrator.',
  }
  const errorMsg = params.error ? (errorMessages[params.error] || 'Sign-in failed. Please try again.') : null

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background orbs */}
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,.18) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', left: '-10%',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Floating dots grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(rgba(255,255,255,.04) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        pointerEvents: 'none',
      }} />

      {/* Card */}
      <div style={{
        background: 'rgba(255,255,255,.04)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,.1)',
        borderRadius: 24,
        padding: '48px 40px',
        width: '100%', maxWidth: 420,
        boxShadow: '0 32px 80px rgba(0,0,0,.5)',
        animation: 'fadeInUp .5s cubic-bezier(.16,1,.3,1) both',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16,
            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(37,99,235,.4)',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
              <rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-.02em' }}>
            LinkedPost
          </h1>
          <p style={{ color: 'rgba(255,255,255,.5)', fontSize: '.9rem', margin: '6px 0 0', fontWeight: 400 }}>
            Enterprise Content Platform
          </p>
        </div>

        {/* Welcome text */}
        <div style={{
          background: 'rgba(255,255,255,.06)',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 14, padding: '20px 22px', marginBottom: 28, textAlign: 'center',
        }}>
          <p style={{ color: 'rgba(255,255,255,.9)', fontWeight: 600, fontSize: '.95rem', margin: '0 0 4px' }}>
            Welcome
          </p>
          <p style={{ color: 'rgba(255,255,255,.45)', fontSize: '.82rem', margin: 0 }}>
            Use your Microsoft work account to access the platform
          </p>
        </div>

        {/* Error  */}
        {errorMsg && (
          <div style={{
            background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 20,
            color: '#fca5a5', fontSize: '.82rem', textAlign: 'center',
          }}>
            {errorMsg}
          </div>
        )}

        {/* Microsoft SSO Button */}
        <Link
          href="/api/auth/microsoft"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            background: '#fff', color: '#1e293b',
            padding: '13px 20px', borderRadius: 12,
            fontWeight: 700, fontSize: '.95rem',
            textDecoration: 'none',
            transition: 'transform .2s, box-shadow .2s',
            boxShadow: '0 4px 16px rgba(0,0,0,.4)',
            marginBottom: 16,
          }}
        >
          <MicrosoftIcon />
          Sign in with Microsoft
        </Link>

        {/* Clear cache button */}
        <a
          href="/api/auth/microsoft/logout"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', color: 'rgba(255,255,255,.35)',
            padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)',
            fontSize: '.82rem', textDecoration: 'none', transition: 'all .2s',
          }}
        >
          Clear Cache &amp; Reload
        </a>

        {/* Footer notes */}
        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,.3)', fontSize: '.75rem', margin: '0 0 6px' }}>
            Need help? Contact your administrator
          </p>
          <p style={{ color: 'rgba(255,255,255,.2)', fontSize: '.72rem', margin: 0 }}>
            Sign-in uses Microsoft SSO — only company accounts are permitted
          </p>
        </div>
      </div>
    </div>
  )
}
