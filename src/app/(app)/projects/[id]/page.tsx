import { createServiceClient } from '@/utils/supabase/service'
import { getSessionUser } from '@/utils/session'
import Link from 'next/link'
import { Plus, ArrowLeft, FileText, Image as ImageIcon, BarChart2, Edit } from 'lucide-react'

type TemplateItem = {
  id: string
  title: string
  body: string
  status: string
  updated_at: string
  ai_generated?: boolean
  image_url?: string | null
}

export const dynamic = 'force-dynamic'

export default async function ProjectSinglePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  await getSessionUser()

  // Fetch project — use simple select, no tricky FK aliases
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (!project) {
    return (
      <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Project not found</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24 }}>This project may have been deleted or you don't have access.</p>
        <Link href="/projects" className="btn btn-primary" style={{ textDecoration: 'none' }}>← Back to Projects</Link>
      </div>
    )
  }

  // Fetch manager separately
  const { data: manager } = project.manager_id
    ? await supabase.from('users').select('name').eq('id', project.manager_id).single()
    : { data: null }

  // Fetch members
  const { data: memberRows } = await supabase
    .from('project_members')
    .select('user_id, users(name)')
    .eq('project_id', id)

  // Fetch templates for this project
  const { data: templatesData } = await supabase
    .from('post_templates')
    .select('id, title, body, status, updated_at, ai_generated, image_url')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  const templates = (templatesData as TemplateItem[] | null) || []
  const members = memberRows || []

  function getInitials(name: string) {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2)
  }

  const statDrafts = templates.filter(t => t.status === 'draft').length
  const statPending = templates.filter(t => t.status === 'pending_review').length
  const statScheduled = templates.filter(t => t.status === 'scheduled').length
  const statPublished = templates.filter(t => t.status === 'published').length

  const STATUS_COLOR: Record<string, string> = {
    published: '#22C55E',
    scheduled: '#8B5CF6',
    approved: '#3B82F6',
    pending_review: '#F59E0B',
    draft: '#94A3B8',
  }

  const PRIORITY_STYLE: Record<string, { bg: string; color: string }> = {
    high:   { bg: '#FEE2E2', color: '#DC2626' },
    medium: { bg: '#FEF3C7', color: '#D97706' },
    low:    { bg: '#DCFCE7', color: '#16A34A' },
  }
  const pri = PRIORITY_STYLE[project.priority] || PRIORITY_STYLE.medium

  return (
    <div className="animate-in pb-12">
      {/* Breadcrumb */}
      <div style={{ marginBottom: 20 }}>
        <Link href="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back to Projects
        </Link>
      </div>

      {/* Project Header */}
      <div className="card" style={{ padding: '24px 28px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: '#EFF6FF', color: '#2563EB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 800, flexShrink: 0
            }}>
              {getInitials(project.name)}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{project.name}</h1>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                  {project.code || `PROJ-${project.id.slice(0, 6).toUpperCase()}`}
                </span>
                <span style={{ color: '#CBD5E1' }}>·</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Manager: <strong style={{ color: 'var(--color-text-primary)' }}>{manager?.name || 'Unassigned'}</strong>
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, background: pri.bg, color: pri.color }}>
                  {project.priority} priority
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, background: '#F1F5F9', color: '#475569', textTransform: 'capitalize' }}>
                  {project.status}
                </span>
              </div>
            </div>
          </div>

          <Link href={`/projects/${project.id}/templates/create`} className="btn btn-primary" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <Plus size={16} /> Add Template
          </Link>
        </div>

        {project.description && (
          <p style={{ margin: '16px 0 0', fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            {project.description}
          </p>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Drafts', value: statDrafts, color: '#94A3B8' },
          { label: 'Pending Review', value: statPending, color: '#F59E0B' },
          { label: 'Scheduled', value: statScheduled, color: '#8B5CF6' },
          { label: 'Published', value: statPublished, color: '#22C55E' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ padding: '14px 18px' }}>
            <div style={{ width: 3, height: '100%', background: s.color, position: 'absolute', left: 0, top: 0, borderRadius: '4px 0 0 4px' }} />
            <div className="stat-label">{s.label}</div>
            <div className="stat-num" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Main content — 2 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>

        {/* Templates column */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Templates ({templates.length})</h2>
            <Link href={`/projects/${project.id}/templates/create`} className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
              <Plus size={13} /> New Template
            </Link>
          </div>

          {templates.length === 0 ? (
            <div className="card" style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
              <p style={{ fontWeight: 600, marginBottom: 6 }}>No templates yet</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
                Create your first LinkedIn post template for this project.
              </p>
              <Link href={`/projects/${project.id}/templates/create`} className="btn btn-primary" style={{ textDecoration: 'none' }}>
                <Plus size={14} /> Create Template
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {templates.map(t => {
                const dispStatus = t.status === 'pending_review' ? 'pending' : t.status
                const dotColor = STATUS_COLOR[t.status] || '#94A3B8'
                return (
                  <div key={t.id} className="card" style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{t.title}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: `${dotColor}18`, color: dotColor }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: dotColor, display: 'inline-block' }} />
                            {dispStatus}
                          </span>
                          {t.ai_generated && <span style={{ fontSize: 10, background: '#EDE9FE', color: '#7C3AED', padding: '1px 7px', borderRadius: 999, fontWeight: 600 }}>AI</span>}
                          {t.image_url && <span style={{ fontSize: 10, background: '#E0F2FE', color: '#0369A1', padding: '1px 7px', borderRadius: 999, fontWeight: 600 }}>IMG</span>}
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {t.body?.replace(/::.*::/g, '').trim()}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                      <span>Updated {new Date(t.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <Link 
                        href={`/projects/${id}/templates/${t.id}/edit`}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}
                      >
                        <Edit size={12} /> Edit
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Team */}
          <div className="card">
            <div className="card-title">Project Team</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {manager && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1E40AF', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    {getInitials(manager.name || 'M')}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{manager.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Project Manager</div>
                  </div>
                </div>
              )}
              {(members as { user_id: string; users: { name: string | null }[] }[]).map((m, i) => {
                const userName = Array.isArray(m.users) ? m.users[0]?.name : (m.users as unknown as { name: string | null } | null)?.name
                return userName ? (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#3B82F6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                      {getInitials(userName)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{userName}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Team Member</div>
                    </div>
                  </div>
                ) : null
              })}
              {!manager && members.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0 }}>No team assigned yet.</p>
              )}
            </div>
          </div>

          {/* Quick create */}
          <div className="card">
            <div className="card-title">Quick Create</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link href={`/projects/${project.id}/templates/create`} className="quick-btn" style={{ textDecoration: 'none' }}>
                <FileText size={14} style={{ display: 'inline', marginRight: 6 }} /> Text Post
              </Link>
              <Link href={`/projects/${project.id}/templates/create`} className="quick-btn" style={{ textDecoration: 'none' }}>
                <ImageIcon size={14} style={{ display: 'inline', marginRight: 6 }} /> Image Post
              </Link>
              <Link href={`/projects/${project.id}/templates/create`} className="quick-btn" style={{ textDecoration: 'none' }}>
                <BarChart2 size={14} style={{ display: 'inline', marginRight: 6 }} /> Poll
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
