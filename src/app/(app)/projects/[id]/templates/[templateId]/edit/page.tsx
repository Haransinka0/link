import { createServiceClient } from '@/utils/supabase/service'
import { getSessionUser } from '@/utils/session'
import EditForm from './EditForm'
import Link from 'next/link'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import { cookies } from 'next/headers'

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string, templateId: string }> }) {
  const { id, templateId } = await params
  const user = await getSessionUser()
  const supabase = createServiceClient()
  const cookieStore = await cookies()
  const linkedInName = cookieStore.get('linkedin_name')?.value || null
  const linkedInPicture = cookieStore.get('linkedin_picture')?.value || null
  const isLinkedInConnected = !!cookieStore.get('linkedin_token')?.value

  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', id)
    .single()

  const { data: template } = await supabase
    .from('post_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  const { data: discussionCount } = await supabase
    .from('template_discussions')
    .select('*', { count: 'exact', head: true })
    .eq('template_id', templateId)

  const count = discussionCount || 0

  return (
    <div className="animate-in pb-12" style={{ maxWidth: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Link href={`/projects/${id}`} className="btn btn-ghost btn-icon" style={{ textDecoration: 'none' }}>
          <ArrowLeft size={20} />
        </Link>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Edit Template</h2>
          <p style={{ fontSize: 14, color: 'var(--li-text-secondary)', marginTop: 4 }}>
            Update your draft for {project?.name || 'Loading...'}
          </p>
        </div>
        <Link 
          href="#" 
          className="btn btn-secondary" 
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <MessageCircle size={16} />
          Discussion
          {count > 0 && (
            <span style={{ background: '#0a66c2', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>
              {count}
            </span>
          )}
        </Link>
      </div>

      {!project || !template ? (
        <div className="card" style={{ padding: 32 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16 }}>Project or Template not found</h3>
          <Link href="/projects" className="btn btn-secondary" style={{ marginTop: 16, textDecoration: 'none' }}>
            Back to Projects
          </Link>
        </div>
      ) : (
        <EditForm
          project={project}
          template={template}
          userName={user?.name || 'Your Name'}
          isLinkedInConnected={isLinkedInConnected}
          linkedInName={linkedInName}
          linkedInPicture={linkedInPicture}
        />
      )}
    </div>
  )
}