'use client'

import { usePathname } from 'next/navigation'
import { LogOut, Bell, Search, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

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
  const [notifCount, setNotifCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)
        
        setNotifCount(count || 0)
      } catch (e) {
        console.error('Error fetching notifications:', e)
      }
    }

    fetchNotifications()
  }, [])

  return (
    <div className="topbar">
      <span className="topbar-title">{title}</span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="search-bar" style={{ width: 240 }}>
          <Search size={16} style={{ color: '#999' }} />
          <input type="text" placeholder="Search..." />
        </div>

        <button className="btn btn-primary" style={{ padding: '8px 16px' }}>
          <Plus size={16} />
          New Post
        </button>

        <button
          className="topbar-btn btn-icon"
          style={{ borderRadius: 8, background: 'transparent', position: 'relative' }}
          aria-label="Notifications"
        >
          <Bell size={18} />
          {notifCount > 0 && (
            <span style={{ position: 'absolute', top: -2, right: -2, background: '#cc1016', color: '#fff', fontSize: 10, width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
              {notifCount > 9 ? '9+' : notifCount}
            </span>
          )}
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