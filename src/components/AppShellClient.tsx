'use client'

import dynamic from 'next/dynamic'
import Sidebar from '@/components/Sidebar'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const Topbar = dynamic(() => import('@/components/Topbar'), { ssr: false })

export default function AppShellClient({
  children,
  userName,
  userEmail,
  pendingCount,
}: {
  children: React.ReactNode
  userName: string
  userEmail: string
  pendingCount: number
}) {
  const router = useRouter()

  useEffect(() => {
    let alive = true
    const tick = async () => {
      try {
        const res = await fetch('/api/publish-scheduled', { method: 'POST' })
        if (!res.ok) return
        const json = await res.json().catch(() => null)
        if (!alive) return
        if (json?.published || json?.failed) {
          router.refresh()
        }
      } catch {
        // silent
      }
    }

    const id = window.setInterval(tick, 30000)
    void tick()

    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [router])

  return (
    <div className="app">
      <Sidebar userName={userName} userEmail={userEmail} pendingCount={pendingCount} />
      <main className="main">
        <Topbar />
        <div className="app-content">{children}</div>
      </main>
    </div>
  )
}

