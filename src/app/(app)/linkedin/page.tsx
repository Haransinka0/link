import { cookies } from 'next/headers'
import Link from 'next/link'
import { CheckCircle2, Link2Off, ExternalLink } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function LinkedInPage() {
  const cookieStore = await cookies()
  const envToken = process.env.LINKEDIN_ACCESS_TOKEN
  const envUrn = process.env.LINKEDIN_MEMBER_URN
  const connected = !!cookieStore.get('linkedin_token')?.value || (!!envToken && !!envUrn)
  const name = cookieStore.get('linkedin_name')?.value || (process.env.LINKEDIN_NAME ? String(process.env.LINKEDIN_NAME) : 'LinkedIn Account')
  const picture = cookieStore.get('linkedin_picture')?.value || null

  return (
    <div className="animate-in pb-12">
      <div className="page-header">
        <div>
          <h1 className="page-title">LinkedIn Connection</h1>
          <p className="page-sub">Manage the account used to publish scheduled posts.</p>
        </div>
      </div>

      <div className="card p-6">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={picture} alt="LinkedIn profile" style={{ width: 48, height: 48, borderRadius: 999, objectFit: 'cover', border: '1px solid var(--border)' }} />
            ) : (
              <div className="avatar" style={{ width: 48, height: 48 }}>{name[0]}</div>
            )}
            <div>
              <p style={{ margin: 0, fontWeight: 800 }}>{name}</p>
              <p style={{ margin: '3px 0 0', color: 'var(--text-muted)', fontSize: '.85rem' }}>
                Status: <span className={`badge ${connected ? 'badge-approved' : 'badge-pending'}`}>{connected ? 'Connected' : 'Not connected'}</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {connected ? (
              <a href="/api/auth/linkedin/disconnect" className="btn btn-secondary">
                <Link2Off size={16} /> Disconnect
              </a>
            ) : (
              <a href="/api/auth/linkedin" className="btn btn-primary">
                <CheckCircle2 size={16} /> Connect LinkedIn
              </a>
            )}
            <Link href="/dashboard" className="btn btn-ghost">Back to Dashboard</Link>
          </div>
        </div>

        <div className="divider" />

        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '.9rem' }}>
          If LinkedIn connection fails, verify the redirect URI in your LinkedIn app matches your environment:
        </p>
        <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: '.85rem' }}>
          <code className="bg-slate-100 px-2 py-1 rounded">http://localhost:3000/api/auth/linkedin/callback</code>
          {' '}and ensure scopes include <code className="bg-slate-100 px-2 py-1 rounded">openid</code> and <code className="bg-slate-100 px-2 py-1 rounded">w_member_social</code>.
        </p>
        <p style={{ margin: '10px 0 0', fontSize: '.85rem' }}>
          <a href="https://www.linkedin.com/developers/apps" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
            Open LinkedIn Developer Apps <ExternalLink size={14} />
          </a>
        </p>
      </div>
    </div>
  )
}

