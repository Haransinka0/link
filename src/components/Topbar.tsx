'use client'

import { usePathname } from 'next/navigation'
import { LogOut, Bell } from 'lucide-react'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/projects': 'Projects',
  '/calendar': 'Calendar',
  '/approvals': 'Approvals',
  '/employees': 'Employees',
  '/history': 'History',
  '/linkedin': 'LinkedIn',
  '/schedule': 'Schedule',
  '/analytics': 'Analytics',
}

export default function Topbar() {
  const pathname = usePathname()

  const title = Object.entries(PAGE_TITLES).find(([key]) => pathname.startsWith(key))?.[1] || 'LinkedPost'

  return (
    <div className="topbar">
      <span className="topbar-title">{title}</span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          className="topbar-btn"
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          aria-label="Notifications"
        >
          <Bell size={16} />
        </button>

        <a
          href="/api/auth/microsoft/logout"
          className="topbar-btn"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <LogOut size={13} /> Sign Out
        </a>
      </div>
    </div>
  )
}
