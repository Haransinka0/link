// Helper to get the current user from Microsoft session cookies
// (called from Server Components and API routes)

import { cookies } from 'next/headers'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: string
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const id    = cookieStore.get('ms_user_id')?.value
  const email = cookieStore.get('ms_user_email')?.value
  const name  = cookieStore.get('ms_user_name')?.value
  const role  = cookieStore.get('ms_user_role')?.value || 'employee'

  if (!id || !email) return null
  return { id, email, name: name || email.split('@')[0], role }
}
