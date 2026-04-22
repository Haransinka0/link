import { createProject } from '../actions'
import { createServiceClient } from '@/utils/supabase/service'
import { getSessionUser } from '@/utils/session'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function CreateProjectPage() {
  const user = await getSessionUser()
  const supabase = createServiceClient()

  // Only admin/manager can create projects
  const { data: me } = user?.id
    ? await supabase.from('users').select('role').eq('id', user.id).single()
    : { data: null }

  if (!me || (me.role !== 'admin' && me.role !== 'manager')) {
    redirect('/projects')
  }

  // Get potential managers (admin or manager role users)
  const { data: managers } = await supabase
    .from('users')
    .select('id, name, email')
    .in('role', ['admin', 'manager'])
    .eq('is_active', true)
    .order('name')

  return (
    <div className="animate-in max-w-2xl mx-auto pb-12">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/projects" className="btn btn-ghost btn-icon">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="page-title">Create Project</h1>
            <p className="page-sub">Set up a new workspace for LinkedIn content scheduling</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '28px 32px' }}>
        <form action={createProject} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div className="form-group">
            <label className="form-label">Project Name <span style={{ color: '#EF4444' }}>*</span></label>
            <input name="name" className="form-input" required placeholder="e.g. Q4 Marketing Campaign" />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea name="description" className="form-textarea" rows={4} placeholder="What is this project about?" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select name="priority" className="form-select" defaultValue="medium">
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Project Manager</label>
              <select name="manager_id" className="form-select">
                <option value="">— Select a manager —</option>
                {managers?.map(m => (
                  <option key={m.id} value={m.id}>{m.name || m.email}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Link href="/projects" className="btn btn-ghost">Cancel</Link>
            <button type="submit" className="btn btn-primary">Create Project</button>
          </div>
        </form>
      </div>
    </div>
  )
}
