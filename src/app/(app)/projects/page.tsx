export const dynamic = 'force-dynamic'

import { getSessionUser } from '@/utils/session'
import type { SVGProps } from 'react'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { createServiceClient } from '@/utils/supabase/service'

type ProjectMember = {
  user_id: string
  users: { name: string | null } | null
}

type ProjectRow = {
  id: string
  name: string
  code: string | null
  description: string | null
  status: string
  priority: string
  manager: { name: string | null } | null
  members: ProjectMember[] | null
}

export default async function ProjectsPage() {
  const user = await getSessionUser()
  const supabase = createServiceClient()

  // Trust DB role
  const { data: me } = user?.id
    ? await supabase.from('users').select('role').eq('id', user.id).single()
    : { data: null }
  const effectiveRole = (me?.role || user?.role || 'employee') as string
  const canCreate = effectiveRole === 'admin' || effectiveRole === 'manager'

  let projectList: ProjectRow[] = []

  if (effectiveRole === 'employee' && user?.id) {
    // For employees: get their project_member rows first, then fetch those projects
    const { data: memberRows } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id)

    const projectIds = (memberRows || []).map(r => r.project_id).filter(Boolean)

    if (projectIds.length > 0) {
      const { data: projects } = await supabase
        .from('projects')
        .select(`
          *,
          manager:users!projects_manager_id_fkey(name),
          members:project_members(user_id, users(name))
        `)
        .in('id', projectIds)
        .order('created_at', { ascending: false })
      projectList = (projects as ProjectRow[] | null) || []
    }
  } else {
    // Admin / Manager — see all projects
    const { data: projects } = await supabase
      .from('projects')
      .select(`
        *,
        manager:users!projects_manager_id_fkey(name),
        members:project_members(user_id, users(name))
      `)
      .order('created_at', { ascending: false })
    projectList = (projects as ProjectRow[] | null) || []
  }

  function getInitials(name: string) {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2)
  }

  const COLORS = [
    { bg: '#eff6ff', text: '#2563eb' },
    { bg: '#fce7f3', text: '#db2777' },
    { bg: '#dcfce7', text: '#16a34a' },
    { bg: '#fef3c7', text: '#d97706' },
    { bg: '#ede9fe', text: '#7c3aed' },
    { bg: '#ffedd5', text: '#ea580c' },
  ]

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-sub">Manage projects and team content assignments</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {canCreate && (
            <Link href="/projects/create" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              <Plus size={16} /> Create Project
            </Link>
          )}
        </div>
      </div>

      {projectList.length === 0 ? (
        <div className="empty-state">
          <FolderOpenIcon width={48} height={48} style={{ color: 'var(--color-text-tertiary)' }} />
          <h3>No projects found</h3>
          <p>{canCreate ? 'Get started by creating your first project.' : 'You have not been added to any projects yet.'}</p>
          {canCreate && (
            <Link href="/projects/create" className="btn btn-primary" style={{ marginTop: 16, textDecoration: 'none', display: 'inline-flex' }}>
              <Plus size={16} /> Create Project
            </Link>
          )}
        </div>
      ) : (
        <div className="proj-grid">
          {projectList.map((project, i) => {
            const color = COLORS[i % COLORS.length]
            const memberCount = project.members?.length ?? 0

            return (
              <Link key={project.id} href={`/projects/${project.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div className="proj-card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div className="proj-icon" style={{ background: color.bg, color: color.text }}>
                      {getInitials(project.name)}
                    </div>
                    <span className={`badge ${
                      project.priority === 'high' ? 'b-failed' :
                      project.priority === 'medium' ? 'b-pending' : 'b-approved'
                    }`} style={{ fontSize: 10, textTransform: 'uppercase' }}>
                      {project.priority}
                    </span>
                  </div>

                  <div className="proj-name">{project.name}</div>
                  <div className="proj-desc">
                    {project.description || 'No description available for this project.'}
                  </div>

                  <div className="proj-footer">
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                      {memberCount} member{memberCount !== 1 ? 's' : ''} · {project.manager?.name || 'No manager'}
                    </div>
                    <div className="avatar-stack">
                      {project.members && project.members.slice(0, 3).map((m, idx) => (
                        <div key={idx} className="av-sm" style={{ background: color.text, color: '#fff' }}>
                          {m.users?.name ? getInitials(m.users.name) : '?'}
                        </div>
                      ))}
                      {memberCount > 3 && (
                        <div className="av-sm" style={{ background: '#E2E8F0', color: '#475569' }}>
                          +{memberCount - 3}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FolderOpenIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}
