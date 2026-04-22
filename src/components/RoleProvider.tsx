'use client'

import React, { createContext, useContext, useMemo, useState } from 'react'

export type ViewingRole = 'user' | 'admin'

type RoleContextValue = {
  role: ViewingRole
  setRole: (role: ViewingRole) => void
}

const RoleContext = createContext<RoleContextValue | null>(null)

const STORAGE_KEY = 'linkedpost:viewingRole'

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<ViewingRole>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved === 'user' || saved === 'admin') return saved
    } catch {
      // ignore
    }
    return 'user'
  })

  const setRole = (next: ViewingRole) => {
    setRoleState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }

  const value = useMemo(() => ({ role, setRole }), [role])

  return <RoleContext value={value}>{children}</RoleContext>
}

export function useViewingRole(): RoleContextValue {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useViewingRole must be used within RoleProvider')
  return ctx
}

