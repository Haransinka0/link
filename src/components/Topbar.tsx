'use client'

import { usePathname } from 'next/navigation'
import { LogOut, Bell, Search, Plus } from 'lucide-react'
import Link from 'next/link'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/projects': 'Projects',
  '/calendar': 'Calendar',
  '/approvals': 'Approvals',
  '/employees': 'Team',
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="search-bar" style={{ width: 240 }}>
          <Search size={16} style={{ color: '#94a3b8' }} />
          <input type="text" placeholder="Search..." />
        </div>

        <button
          className="btn btn-primary"
          style={{ padding: '8px 16px' }}
        >
          <Plus size={16} />
          New Post
        </button>

        <button
          className="topbar-btn btn-icon"
          style={{ borderRadius: 8, background: 'transparent' }}
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>

        <a
          href="/api/auth/microsoft/logout"
          className="topbar-btn"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <LogOut size={16} />
        </a>
      </div>
    </div>
  )
}