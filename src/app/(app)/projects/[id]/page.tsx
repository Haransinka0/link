import { createServiceClient } from '@/utils/supabase/service'
import { getSessionUser } from '@/utils/session'
import Link from 'next/link'
import { Plus, ArrowLeft, FileText, Image as ImageIcon, BarChart2, Edit, MessageCircle, Users, Trash2 } from 'lucide-react'
import ProjectTeamPanel from './ProjectTeamPanel'
import TemplateDiscussion from './TemplateDiscussion'

type TemplateItem = {
  id: string
  title: string
  body: string
  status: string
  updated_at: string
  ai_generated?: boolean
  image_url?: string | null
}

type ProjectMember = {
  user_id: string
  role: string
  users?: { name: string }[]
}

export const dynamic = 'force-dynamic'

export default async function ProjectSinglePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getSessionUser()
  const supabase = createServiceClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (!project) {
    return (
      <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Project not found</h2>
        <p style={{ color: 'var(--li-text-secondary)', marginBottom: 24 }}>This project may have been deleted or you don't have access.</p>
        <Link href="/projects" className="btn btn-primary" style={{ textDecoration: 'none' }}>← Back to Projects</Link>
      </div>
    )
  }

  const { data: manager } = project.manager_id
    ? await supabase.from('users').select('name').eq('id', project.manager_id).single()
    : { data: null }

  const { data: memberRows } = await supabase
    .from('project_members')
    .select('*, user:user_id(name, email)')
    .eq('project_id', id)

  const { data: templatesData } = await supabase
    .from('post_templates')
    .select('id, title, body, status, updated_at, ai_generated, image_url')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  const templates = (templatesData as TemplateItem[] | null) || []
  const members = (memberRows as ProjectMember[] | null) || []

  function getInitials(name: string) {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2)
  }

  const statDrafts = templates.filter(t => t.status === 'draft').length
  const statPending = templates.filter(t => t.status === 'pending_review').length
  const statScheduled = templates.filter(t => t.status === 'scheduled').length
  const statPublished = templates.filter(t => t.status === 'published').length

  const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
    published: { bg: '#e6f7ef', color: '#057642' },
    scheduled: { bg: '#e6f2ff', color: '#0a66c2' },
    approved: { bg: '#e6f7ef', color: '#057642' },
    pending_review: { bg: '#fef3cd', color: '#f5a623' },
    rejected: { bg: '#fce8e8', color: '#cc1016' },
    draft: { bg: '#f3f2ef', color: '#666666' },
    failed: { bg: '#fce8e8', color: '#cc1016' },
  }

  const PRIORITY_STYLE: Record<string, { bg: string; color: string }> = {
    high:   { bg: '#fce8e8', color: '#cc1016' },
    medium: { bg: '#fef3cd', color: '#f5a623' },
    low:    { bg: '#e6f7ef', color: '#057642' },
  }
  const pri = PRIORITY_STYLE[project.priority] || PRIORITY_STYLE.medium

  return (
    <div className="animate-in pb-12">
      <div style={{ marginBottom: 20 }}>
        <Link href="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--li-text-secondary)', textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back to Projects
        </Link>
      </div>

      <div className="card" style={{ padding: '24px 28px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 12,
              background: '#e6f2ff', color: '#0a66c2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 700, flexShrink: 0
            }}>
              {getInitials(project.name)}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{project.name}</h1>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--li-text-secondary)', fontWeight: 500 }}>
                  {project.code || `PROJ-${project.id.slice(0, 6).toUpperCase()}`}
                </span>
                <span style={{ color: '#ddd' }}>·</span>
                <span style={{ fontSize: 12, color: 'var(--li-text-secondary)' }}>
                  Owner: <strong style={{ color: 'var(--li-text)' }}>{manager?.name || 'Unassigned'}</strong>
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: pri.bg, color: pri.color }}>
                  {project.priority}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: '#f3f2ef', color: '#666', textTransform: 'capitalize' }}>
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
          <p style={{ margin: '16px 0 0', fontSize: 14, color: 'var(--li-text-secondary)', lineHeight: 1.6, paddingTop: 16, borderTop: '1px solid var(--li-border)' }}>
            {project.description}
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Drafts', value: statDrafts, color: '#666', icon: FileText },
          { label: 'Pending', value: statPending, color: '#f5a623', icon: MessageCircle },
          { label: 'Scheduled', value: statScheduled, color: '#0a66c2', icon: Plus },
          { label: 'Published', value: statPublished, color: '#057642', icon: BarChart2 },
        ].map(s => (
          <div key={s.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.color === '#666' ? '#f3f2ef' : s.color === '#f5a623' ? '#fef3cd' : s.color === '#0a66c2' ? '#e6f2ff' : '#e6f7ef', color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon size={18} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--li-text)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--li-text-secondary)', marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Templates ({templates.length})</h2>
            <Link href={`/projects/${project.id}/templates/create`} className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
              <Plus size={13} /> New Template
            </Link>
          </div>

          {templates.length === 0 ? (
            <div className="card" style={{ padding: 48, textAlign: 'center' }}>
              <FileText size={40} style={{ color: '#ccc', marginBottom: 12 }} />
              <p style={{ fontWeight: 600, marginBottom: 6 }}>No templates yet</p>
              <p style={{ fontSize: 13, color: 'var(--li-text-secondary)', marginBottom: 20 }}>
                Create your first LinkedIn post template for this project.
              </p>
              <Link href={`/projects/${project.id}/templates/create`} className="btn btn-primary" style={{ textDecoration: 'none' }}>
                <Plus size={14} /> Create Template
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {templates.map(t => {
                const status = STATUS_COLOR[t.status] || STATUS_COLOR.draft
                return (
                  <div key={t.id} className="card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{t.title}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: status.bg, color: status.color }}>
                            {t.status === 'pending_review' ? 'Pending' : t.status}
                          </span>
                          {t.ai_generated && <span style={{ fontSize: 10, background: '#f3e8ff', color: '#7c3aed', padding: '3px 8px', borderRadius: 999, fontWeight: 600 }}>AI</span>}
                          {t.image_url && <span style={{ fontSize: 10, background: '#e6f2ff', color: '#0a66c2', padding: '3px 8px', borderRadius: 999, fontWeight: 600 }}>IMG</span>}
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--li-text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {t.body?.replace(/\[Alt:\s*.*?\]/gi, '')?.replace(/\[Overlay:\s*.*?\]/gi, '')?.replace(/::.*::/g, '')?.trim()}
                        </p>
                      </div>
                      <Link href={`/projects/${id}/templates/${t.id}/edit`} style={{ textDecoration: 'none' }}>
                        <button className="btn btn-ghost btn-icon" style={{ color: '#666' }}>
                          <Edit size={14} />
                        </button>
                      </Link>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--li-border)', fontSize: 11, color: 'var(--li-text-secondary)' }}>
                      <span>Updated {new Date(t.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Link href={`/projects/${id}/templates/${t.id}/edit`} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#0a66c2', textDecoration: 'none', fontWeight: 500 }}>
                          <Edit size={12} /> Edit
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ProjectTeamPanel projectId={id} members={members} managerName={manager?.name} />
        </div>
      </div>
    </div>
  )
}