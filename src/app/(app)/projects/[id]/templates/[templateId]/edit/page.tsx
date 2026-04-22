import { createServiceClient } from '@/utils/supabase/service'
import { getSessionUser } from '@/utils/session'
import EditForm from './EditForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cookies } from 'next/headers'

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string, templateId: string }> }) {
  const { id, templateId } = await params
  const user = await getSessionUser()
  const supabase = createServiceClient()
  const cookieStore = await cookies()
  const linkedInName = cookieStore.get('linkedin_name')?.value || null
  const linkedInPicture = cookieStore.get('linkedin_picture')?.value || null
  const isLinkedInConnected = !!cookieStore.get('linkedin_token')?.value

  // Fetch the specific project
  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', id)
    .single()

  // Fetch the specific template
  const { data: template } = await supabase
    .from('post_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  return (
    <div className="animate-in pb-12 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/projects/${id}`} className="btn btn-ghost btn-icon">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h2 className="page-title">Edit Template</h2>
          <p className="page-sub">Update your draft for {project?.name || 'Loading...'} and re-submit for review.</p>
        </div>
      </div>

      {!project || !template ? (
        <div className="card p-6">
          <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem' }}>Project or Template not found</h3>
          <div style={{ marginTop: 14 }}>
            <Link href="/projects" className="btn btn-secondary">Back to Projects</Link>
          </div>
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
