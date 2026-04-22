'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, CalendarDays, History, Briefcase, Users } from 'lucide-react'

interface SidebarProps {
  userName: string
  userEmail: string
  pendingCount?: number
}

const MAIN_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: Briefcase },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
]

export default function Sidebar({ userName, userEmail, pendingCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sb-logo">
        <div className="sb-dot"></div>
        LinkedPost
      </div>

      {/* Main Section */}
      <div className="sb-section">Main</div>
      {MAIN_NAV.map(item => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link key={item.href} href={item.href} className={`sb-item ${active ? 'active' : ''}`}>
            <item.icon className="sb-icon" />
            {item.label}
          </Link>
        )
      })}

      <Link href="/approvals" className={`sb-item ${pathname.startsWith('/approvals') ? 'active' : ''}`}>
        <svg className="sb-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M13 4L6 11l-3-3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Approvals
        {pendingCount > 0 && <span className="sb-badge">{pendingCount}</span>}
      </Link>

      {/* Team Section */}
      <div className="sb-section">Team</div>
      <Link href="/employees" className={`sb-item ${pathname.startsWith('/employees') ? 'active' : ''}`}>
        <Users className="sb-icon" />
        Employees
      </Link>

      {/* Tools Section */}
      <div className="sb-section">Tools</div>
      <Link href="/history" className={`sb-item ${pathname.startsWith('/history') ? 'active' : ''}`}>
        <History className="sb-icon" />
        History
      </Link>

      {/* Footer */}
      <div className="sb-footer" style={{ textDecoration: 'none' }}>
        <div className="sb-avatar">{initials}</div>
        <div style={{ overflow: 'hidden' }}>
          <div className="sb-uname">{userName}</div>
          <div className="sb-uemail" title={userEmail}>{userEmail}</div>
        </div>
      </div>
    </div>
  )
}

