'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  FolderKanban, 
  CalendarDays, 
  CheckSquare, 
  Users, 
  History,
  BarChart3,
  Settings
} from 'lucide-react'

interface SidebarProps {
  userName: string
  userEmail: string
  pendingCount?: number
}

const MAIN_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
]

const TEAM_NAV = [
  { href: '/approvals', label: 'Approvals', icon: CheckSquare, badge: true },
  { href: '/employees', label: 'Team', icon: Users },
]

const TOOLS_NAV = [
  { href: '/history', label: 'History', icon: History },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
]

export default function Sidebar({ userName, userEmail, pendingCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="sidebar">
      <Link href="/dashboard" className="sb-logo">
        <div className="sb-logo-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <path d="M22 6l-10 7L2 6"/>
          </svg>
        </div>
        LinkedPost
      </Link>

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

      <div className="sb-section">Team</div>
      {TEAM_NAV.map(item => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        const showBadge = item.badge && pendingCount > 0
        return (
          <Link key={item.href} href={item.href} className={`sb-item ${active ? 'active' : ''}`}>
            <item.icon className="sb-icon" />
            {item.label}
            {showBadge && <span className="sb-badge">{pendingCount}</span>}
          </Link>
        )
      })}

      <div className="sb-section">Tools</div>
      {TOOLS_NAV.map(item => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link key={item.href} href={item.href} className={`sb-item ${active ? 'active' : ''}`}>
            <item.icon className="sb-icon" />
            {item.label}
          </Link>
        )
      })}

      <div style={{ marginTop: 'auto', padding: 16, paddingTop: 8 }}>
        <Link href="/settings" className="sb-item">
          <Settings className="sb-icon" />
          Settings
        </Link>
        
        <div className="sb-footer" style={{ marginTop: 12, borderRadius: 8, padding: 12 }}>
          <div className="sb-avatar">{initials}</div>
          <div style={{ overflow: 'hidden' }}>
            <div className="sb-uname">{userName}</div>
            <div className="sb-uemail" title={userEmail}>{userEmail}</div>
          </div>
        </div>
      </div>
    </div>
  )
}