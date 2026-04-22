import { getSessionUser } from '@/utils/session'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

import AppShellClient from '@/components/AppShellClient'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  
  // Count pending approvals for badge
  let pendingCount = 0
  if (user.role === 'admin' || user.role === 'manager') {
    // Basic count of templates pending review (in a real app, query based on approval_chain)
    const { count } = await supabase
      .from('post_templates')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_review')
    pendingCount = count || 0
  }

  return (
    <AppShellClient userName={user.name} userEmail={user.email} pendingCount={pendingCount}>
      {children}
    </AppShellClient>
  )
}
