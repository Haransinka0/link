import { createServiceClient } from '@/utils/supabase/service'
import { getSessionUser } from '@/utils/session'
import Link from 'next/link'

type TemplateItem = { id: string; title: string; body: string; status: string; updated_at: string; project?: { name: string } | null }

export default async function DashboardPage() {
  const user = await getSessionUser()
  const supabase = createServiceClient()

  // Fetch metrics based on role
  let templatesQuery = supabase.from('post_templates').select('*, project:project_id(name)')
  if (user?.role === 'employee') {
    templatesQuery = templatesQuery.eq('created_by', user?.id)
  }
  const { data: templates } = await templatesQuery

  const pending = templates?.filter(t => t.status === 'pending_review') || []
  const published = templates?.filter(t => t.status === 'published') || []
  const drafts = templates?.filter(t => t.status === 'draft') || []
  const scheduled = templates?.filter(t => t.status === 'scheduled') || []

  const recent = ((templates as TemplateItem[] | null) || [])
    .slice()
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5)

  // Derive dot colors based on status
  const getDotColor = (status: string) => {
    switch(status) {
      case 'published': return '#22C55E'
      case 'scheduled': return '#8B5CF6'
      case 'approved': return '#3B82F6'
      case 'pending_review': return '#F59E0B'
      case 'draft': return '#94A3B8'
      default: return '#EF4444'
    }
  }

  const firstName = user?.name ? user.name.split(' ')[0] : 'User'
  const timeHour = new Date().getHours()
  const greeting = timeHour < 12 ? 'Good morning' : timeHour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">{greeting}, {firstName}</div>
          <div className="page-sub">Here's what's happening with your LinkedIn content today.</div>
        </div>
      </div>
      
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-accent" style={{background:'#F59E0B'}}></div>
          <div className="stat-label">Pending Review</div>
          <div className="stat-num">{pending.length}</div>
          <div className="stat-hint">Needs approval</div>
        </div>
        <div className="stat-card">
          <div className="stat-accent" style={{background:'#3B82F6'}}></div>
          <div className="stat-label">Upcoming Scheduled</div>
          <div className="stat-num">{scheduled.length}</div>
          <div className="stat-hint">Waitlist ready</div>
        </div>
        <div className="stat-card">
          <div className="stat-accent" style={{background:'#8B5CF6'}}></div>
          <div className="stat-label">My Drafts</div>
          <div className="stat-num">{drafts.length}</div>
          <div className="stat-hint">Not yet submitted</div>
        </div>
        <div className="stat-card">
          <div className="stat-accent" style={{background:'#22C55E'}}></div>
          <div className="stat-label">Posts Published</div>
          <div className="stat-num">{published.length}</div>
          <div className="stat-hint">Total success</div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title">Recent activity</div>
          {recent.map((t) => {
            const dispStatus = t.status === 'pending_review' ? 'pending' : t.status
            return (
              <div key={t.id} className="activity-item">
                <div className="act-dot" style={{background: getDotColor(t.status)}}></div>
                <div>
                  <div className="act-text">
                    {t.title} <span className={`badge b-${dispStatus}`}>{dispStatus}</span>
                  </div>
                  <div className="act-time">
                    {new Date(t.updated_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric'})} 
                    {t.project?.name ? ` · ${t.project.name}` : ''}
                  </div>
                </div>
              </div>
            )
          })}
          {recent.length === 0 && (
            <div className="act-time" style={{marginTop: 6}}>No recent activity found.</div>
          )}
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          <div className="card">
            <div className="card-title">Quick actions</div>
            <Link href="/projects" className="quick-btn primary text-center">+ New Post</Link>
            <Link href="/approvals" className="quick-btn text-center">Review approvals ({pending.length})</Link>
            <Link href="/calendar" className="quick-btn text-center">Go to calendar</Link>
          </div>

          <div className="card">
            <div className="card-title">LinkedIn Connection</div>
            <div className="li-card">
              <div className="li-connected"></div>
              <div style={{flex:1}}>
                <div style={{fontSize:12, fontWeight:500, color:'#1E40AF'}}>
                  Shared Company Account
                </div>
                <div style={{fontSize:11, color:'#3B82F6'}}>
                  Token securely bonded via CRON
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
