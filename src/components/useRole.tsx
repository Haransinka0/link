'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { createClientComponentClient } from '@/utils/supabase/client'

type Role = 'owner' | 'manager' | 'editor' | 'viewer' | null

interface UserRole {
  role: Role
  projectId: string | null
  canApprove: boolean
  canEdit: boolean
  canDelete: boolean
  canManageTeam: boolean
}

interface RoleContextType {
  userRole: UserRole
  loading: boolean
  checkRole: (projectId: string) => Promise<void>
}

const defaultRole: UserRole = {
  role: null,
  projectId: null,
  canApprove: false,
  canEdit: false,
  canDelete: false,
  canManageTeam: false,
}

const RoleContext = createContext<RoleContextType>({
  userRole: defaultRole,
  loading: true,
  checkRole: async () => {},
})

export function RoleProvider({ children, projectId }: { children: React.ReactNode; projectId?: string }) {
  const [userRole, setUserRole] = useState<UserRole>(defaultRole)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  const checkRole = async (pid: string) => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setUserRole(defaultRole)
        setLoading(false)
        return
      }

      const { data: member } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', pid)
        .eq('user_id', user.id)
        .single()

      const role = member?.role as Role
      setUserRole({
        role,
        projectId: pid,
        canApprove: role === 'owner' || role === 'manager',
        canEdit: role === 'owner' || role === 'manager' || role === 'editor',
        canDelete: role === 'owner',
        canManageTeam: role === 'owner',
      })
    } catch (error) {
      console.error('Error checking role:', error)
      setUserRole(defaultRole)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) {
      checkRole(projectId)
    } else {
      setLoading(false)
    }
  }, [projectId])

  return (
    <RoleContext.Provider value={{ userRole, loading, checkRole }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole(projectId?: string) {
  const { userRole, loading, checkRole } = useContext(RoleContext)

  useEffect(() => {
    if (projectId) {
      checkRole(projectId)
    }
  }, [projectId])

  return {
    role: userRole.role,
    canApprove: userRole.canApprove,
    canEdit: userRole.canEdit,
    canDelete: userRole.canDelete,
    canManageTeam: userRole.canManageTeam,
    loading,
    projectId: userRole.projectId,
  }
}

export function useCurrentRole() {
  return useContext(RoleContext)
}

export const ROLE_PERMISSIONS = {
  owner: {
    canCreateProject: true,
    canDeleteProject: true,
    canApprove: true,
    canEdit: true,
    canDelete: true,
    canManageTeam: true,
    canViewAll: true,
  },
  manager: {
    canCreateProject: false,
    canDeleteProject: false,
    canApprove: true,
    canEdit: true,
    canDelete: false,
    canManageTeam: false,
    canViewAll: true,
  },
  editor: {
    canCreateProject: false,
    canDeleteProject: false,
    canApprove: false,
    canEdit: true,
    canDelete: false,
    canManageTeam: false,
    canViewAll: false,
  },
  viewer: {
    canCreateProject: false,
    canDeleteProject: false,
    canApprove: false,
    canEdit: false,
    canDelete: false,
    canManageTeam: false,
    canViewAll: false,
  },
}

export function hasPermission(role: Role, permission: keyof typeof ROLE_PERMISSIONS.owner) {
  return ROLE_PERMISSIONS[role || 'viewer']?.[permission] ?? false
}

export const ROLE_COLORS = {
  owner: { bg: '#0a66c2', text: '#fff' },
  manager: { bg: '#057642', text: '#fff' },
  editor: { bg: '#f5a623', text: '#fff' },
  viewer: { bg: '#666666', text: '#fff' },
}

export function RoleBadge({ role }: { role: Role }) {
  if (!role) return null
  const colors = ROLE_COLORS[role]
  
  return (
    <span style={{
      background: colors.bg,
      color: colors.text,
      padding: '2px 10px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'capitalize',
    }}>
      {role}
    </span>
  )
}