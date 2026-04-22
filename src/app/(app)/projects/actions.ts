'use server'

import { createServiceClient } from '@/utils/supabase/service'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/utils/session'
import { revalidatePath } from 'next/cache'

export async function createProject(formData: FormData) {
  const supabase = createServiceClient()
  const user = await getSessionUser()

  if (!user) throw new Error('Not authorized')

  // Always trust DB role for permissions
  const { data: me, error: meErr } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (meErr || !me) throw new Error('Not authorized')
  if (me.role !== 'admin' && me.role !== 'manager') throw new Error('Only admins and managers can create projects')

  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const priority = (formData.get('priority') as string) || 'medium'
  const manager_id = (formData.get('manager_id') as string) || null

  if (!name) throw new Error('Project name is required')

  // Insert project
  const { data: project, error: pErr } = await supabase.from('projects').insert({
    name,
    description,
    priority,
    manager_id: manager_id || null,
    status: 'active',
  }).select().single()

  if (pErr) throw new Error(pErr.message)

  // Add manager as a member if set
  if (manager_id && project) {
    await supabase.from('project_members').upsert({
      project_id: project.id,
      user_id: manager_id,
      role: 'manager',
    }, { onConflict: 'project_id,user_id' })
  }

  revalidatePath('/projects')
  redirect('/projects')
}

export async function deleteProject(projectId: string) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) throw new Error('Not authorized')

  const { data: me } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin' && me?.role !== 'manager') throw new Error('Not authorized')

  const { error } = await supabase.from('projects').delete().eq('id', projectId)
  if (error) throw new Error(error.message)

  revalidatePath('/projects')
  redirect('/projects')
}

export async function addProjectMember(projectId: string, userId: string) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) throw new Error('Not authorized')

  const { error } = await supabase.from('project_members').upsert({
    project_id: projectId,
    user_id: userId,
    role: 'member',
  }, { onConflict: 'project_id,user_id' })

  if (error) throw new Error(error.message)
  revalidatePath(`/projects/${projectId}`)
}

export async function removeProjectMember(projectId: string, userId: string) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) throw new Error('Not authorized')

  const { error } = await supabase.from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  revalidatePath(`/projects/${projectId}`)
}
