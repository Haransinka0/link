import { createServiceClient } from '@/utils/supabase/service'

export type Role = 'owner' | 'manager' | 'editor' | 'viewer'

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: Role
  user?: {
    name: string
    email: string
  }
}

export interface Discussion {
  id: string
  template_id: string
  user_id: string
  message: string
  created_at: string
  user?: {
    name: string
    email: string
  }
}

const supabase = createServiceClient()

export async function getUserRole(projectId: string, userId: string): Promise<Role | null> {
  const { data } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single()
  
  return data?.role as Role | null
}

export async function canApprove(projectId: string, userId: string): Promise<boolean> {
  const role = await getUserRole(projectId, userId)
  return role === 'owner' || role === 'manager'
}

export async function canEdit(projectId: string, userId: string): Promise<boolean> {
  const role = await getUserRole(projectId, userId)
  return role === 'owner' || role === 'manager' || role === 'editor'
}

export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const { data } = await supabase
    .from('project_members')
    .select('*, user:user_id(name, email)')
    .eq('project_id', projectId)
    .order('added_at', { ascending: true })
  
  return (data as ProjectMember[]) || []
}

export async function addProjectMember(
  projectId: string, 
  userId: string, 
  role: Role
): Promise<void> {
  await supabase
    .from('project_members')
    .insert({ project_id: projectId, user_id: userId, role })
}

export async function updateMemberRole(
  projectId: string, 
  userId: string, 
  role: Role
): Promise<void> {
  await supabase
    .from('project_members')
    .update({ role })
    .eq('project_id', projectId)
    .eq('user_id', userId)
}

export async function removeProjectMember(
  projectId: string, 
  userId: string
): Promise<void> {
  await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId)
}

export async function getTemplateDiscussion(templateId: string): Promise<Discussion[]> {
  const { data } = await supabase
    .from('template_discussions')
    .select('*, user:user_id(name, email)')
    .eq('template_id', templateId)
    .order('created_at', { ascending: true })
  
  return (data as Discussion[]) || []
}

export async function addDiscussionMessage(
  templateId: string, 
  userId: string, 
  message: string
): Promise<void> {
  await supabase
    .from('template_discussions')
    .insert({ template_id: templateId, user_id: userId, message })
}

export async function deleteDiscussionMessage(messageId: string): Promise<void> {
  await supabase
    .from('template_discussions')
    .delete()
    .eq('id', messageId)
}

export async function createNotification(
  userId: string,
  type: 'approval_request' | 'approval_decision' | 'mention',
  title: string,
  message: string,
  templateId?: string
): Promise<void> {
  await supabase
    .from('notifications')
    .insert({ 
      user_id: userId, 
      type, 
      title, 
      message, 
      template_id: templateId 
    })
}

export async function getUserNotifications(userId: string) {
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  return data || []
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  
  return count || 0
}

export async function submitForApproval(templateId: string): Promise<void> {
  await supabase
    .from('post_templates')
    .update({ status: 'pending_review' })
    .eq('id', templateId)
}

export async function approveTemplate(
  templateId: string, 
  approverId: string
): Promise<void> {
  await supabase
    .from('post_templates')
    .update({ 
      status: 'approved',
      approved_by: approverId,
      approved_at: new Date().toISOString()
    })
    .eq('id', templateId)
}

export async function rejectTemplate(
  templateId: string, 
  approverId: string,
  reason: string
): Promise<void> {
  await supabase
    .from('post_templates')
    .update({ 
      status: 'rejected',
      approved_by: approverId,
      rejection_reason: reason
    })
    .eq('id', templateId)
}

export function getRolePermissions(role: Role | null) {
  const allPermissions = {
    owner: {
      canCreateProject: true,
      canDeleteProject: true,
      canApprove: true,
      canEdit: true,
      canDelete: true,
      canManageTeam: true,
      canViewAll: true,
      canSchedule: true,
    },
    manager: {
      canCreateProject: false,
      canDeleteProject: false,
      canApprove: true,
      canEdit: true,
      canDelete: false,
      canManageTeam: false,
      canViewAll: true,
      canSchedule: true,
    },
    editor: {
      canCreateProject: false,
      canDeleteProject: false,
      canApprove: false,
      canEdit: true,
      canDelete: false,
      canManageTeam: false,
      canViewAll: false,
      canSchedule: true,
    },
    viewer: {
      canCreateProject: false,
      canDeleteProject: false,
      canApprove: false,
      canEdit: false,
      canDelete: false,
      canManageTeam: false,
      canViewAll: false,
      canSchedule: false,
    },
  }
  return allPermissions[role || 'viewer']
}