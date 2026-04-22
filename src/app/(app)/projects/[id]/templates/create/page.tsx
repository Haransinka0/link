import { createServiceClient } from '@/utils/supabase/service'
import { getSessionUser } from '@/utils/session'
import CreateForm from './CreateForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cookies } from 'next/headers'

export default async function CreateTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  return (
    <div className="animate-in pb-12 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/projects/${id}`} className="btn btn-ghost btn-icon">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h2 className="page-title">Create New Template</h2>
          <p className="page-sub">Draft a post for {project?.name || 'Loading...'}, use AI assistance, and submit for approval.</p>
        </div>
      </div>

      {!project ? (
        <div className="card p-6">
          <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem' }}>Project not found</h3>
          <div style={{ marginTop: 14 }}>
            <Link href="/projects" className="btn btn-secondary">Back to Projects</Link>
          </div>
        </div>
      ) : (
        <CreateForm
          project={project}
          userName={user?.name || 'Your Name'}
          isLinkedInConnected={isLinkedInConnected}
          linkedInName={linkedInName}
          linkedInPicture={linkedInPicture}
        />
      )}
    </div>
  )
}
