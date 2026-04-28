import { createServiceClient } from '@/utils/supabase/service'
import { getSessionUser } from '@/utils/session'
import Link from 'next/link'
import { Clock, Send, FileEdit, CheckCircle, Calendar, Users, Sparkles, CheckSquare } from 'lucide-react'

type TemplateItem = { id: string; title: string; body: string; status: string; updated_at: string; project?: { name: string } | null }

export default async function DashboardPage() {
  const user = await getSessionUser()
  const supabase = createServiceClient()

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
    .slice(0, 6)

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

  const getGreetingIcon = () => {
    const hour = new Date().getHours()
    if (hour < 12) return '🌅'
    if (hour < 18) return '☀️'
    return '🌙'
  }

  const firstName = user?.name ? user.name.split(' ')[0] : 'User'
  const timeHour = new Date().getHours()
  const greeting = timeHour < 12 ? 'Good morning' : timeHour < 18 ? 'Good afternoon' : 'Good evening'

  const statCards = [
    { label: 'Pending Review', num: pending.length, hint: 'Awaiting approval', icon: Clock, accent: '#f59e0b', bg: '#fef3c7' },
    { label: 'Scheduled', num: scheduled.length, hint: 'Ready to post', icon: Calendar, accent: '#8b5cf6', bg: '#ede9fe' },
    { label: 'Drafts', num: drafts.length, hint: 'Work in progress', icon: FileEdit, accent: '#64748b', bg: '#f1f5f9' },
    { label: 'Published', num: published.length, hint: 'Successfully posted', icon: Send, accent: '#10b981', bg: '#dcfce7' },
  ]

  return (
    <div className="animate-in">
      <div className="greeting-header">
        <div className="greeting-icon">{getGreetingIcon()}</div>
        <div>
          <div className="page-title">{greeting}, {firstName}</div>
          <div className="page-sub">Here's what's happening with your content today.</div>
        </div>
      </div>
      
      <div className="stat-grid">
        {statCards.map((stat, i) => (
          <div key={i} className="stat-card" style={{ '--stat-accent': stat.accent } as React.CSSProperties}>
            <div className="stat-icon" style={{ background: stat.bg, color: stat.accent }}>
              <stat.icon size={20} />
            </div>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-num">{stat.num}</div>
            <div className="stat-hint">{stat.hint}</div>
          </div>
        ))}
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title">
            <span>Recent Activity</span>
            <Link href="/history" style={{ fontSize: 13, color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>View all</Link>
          </div>
          {recent.map((t) => {
            const dispStatus = t.status === 'pending_review' ? 'pending' : t.status
            return (
              <div key={t.id} className="activity-item">
                <div className="act-dot" style={{ background: getDotColor(t.status) }}></div>
                <div style={{ flex: 1 }}>
                  <div className="act-text">
                    {t.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span className={`badge b-${dispStatus}`}>{dispStatus}</span>
                    <span className="act-time">
                      {new Date(t.updated_at).toLocaleDateString('en-GB', { day:'numeric', month:'short'})} 
                      {t.project?.name ? ` · ${t.project.name}` : ''}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
          {recent.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
              <Sparkles size={32} style={{ opacity: 0.5, marginBottom: 8 }} />
              <div>No recent activity yet</div>
              <Link href="/projects" style={{ color: '#3b82f6', marginTop: 8, display: 'inline-block', textDecoration: 'none', fontWeight: 500 }}>Create your first post</Link>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-title">Quick Actions</div>
            <Link href="/projects" className="quick-btn primary">+ Create New Post</Link>
            <Link href="/approvals" className="quick-btn">
              <CheckSquare size={16} style={{ marginRight: 8 }} />
              Review Approvals
              {pending.length > 0 && <span style={{ marginLeft: 'auto', background: '#fef3c7', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: '#92400e' }}>{pending.length}</span>}
            </Link>
            <Link href="/calendar" className="quick-btn">
              <Calendar size={16} style={{ marginRight: 8 }} />
              View Calendar
            </Link>
            <Link href="/employees" className="quick-btn">
              <Users size={16} style={{ marginRight: 8 }} />
              Manage Team
            </Link>
          </div>

          <div className="card">
            <div className="card-title">LinkedIn</div>
            <div className="li-card">
              <div className="li-connected"></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1e40af' }}>
                  Connected Account
                </div>
                <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 2 }}>
                  Posts scheduled via CRON
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}