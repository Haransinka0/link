'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/utils/supabase/service'
import { getSessionUser } from '@/utils/session'

export async function updateEmployeeProfile(formData: FormData) {
  const actor = await getSessionUser()
  if (!actor || (actor.role !== 'admin' && actor.role !== 'manager')) {
    return { success: false, error: 'You are not allowed to update employees.' }
  }

  const id = String(formData.get('id') || '')
  const role = String(formData.get('role') || '')
  const isActive = String(formData.get('is_active') || 'true') === 'true'
  const department = String(formData.get('department') || '').trim()
  const designation = String(formData.get('designation') || '').trim()
  const phone = String(formData.get('phone') || '').trim()
  const isRemote = String(formData.get('is_remote') || 'false') === 'true'

  if (!id) return { success: false, error: 'Missing employee id.' }
  if (!['admin', 'manager', 'employee'].includes(role)) {
    return { success: false, error: 'Invalid role selected.' }
  }

  if (actor.role === 'manager' && role === 'admin') {
    return { success: false, error: 'Managers cannot promote users to admin.' }
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('users')
    .update({
      role,
      is_active: isActive,
      is_remote: isRemote,
      department: department || null,
      designation: designation || null,
      phone: phone || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/employees')
  return { success: true }
}

export async function createEmployee(formData: FormData) {
  const actor = await getSessionUser()
  if (!actor || actor.role !== 'admin') {
    return { success: false, error: 'Only admins can add employees.' }
  }

  const email = String(formData.get('email') || '').trim().toLowerCase()
  const name = String(formData.get('name') || '').trim()
  const role = String(formData.get('role') || 'employee')

  if (!email) return { success: false, error: 'Email is required.' }
  if (!['admin', 'manager', 'employee'].includes(role)) {
    return { success: false, error: 'Invalid role.' }
  }

  const supabase = createServiceClient()

  const { data: created, error: createAuthError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { name },
  })

  // If auth user already exists, fall back to finding by email.
  let userId = created?.user?.id || null
  if (!userId) {
    const { data: usersPage, error: listUsersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (listUsersError) return { success: false, error: listUsersError.message }
    userId = usersPage.users.find((u) => u.email?.toLowerCase() === email)?.id || null
  }

  if (!userId) {
    return { success: false, error: createAuthError?.message || 'Unable to create user.' }
  }

  const { error: insertError } = await supabase
    .from('users')
    .insert({
      id: userId,
      email,
      name: name || email.split('@')[0],
      role,
      is_active: true,
    })

  if (insertError && insertError.code !== '23505') {
    return { success: false, error: insertError.message }
  }

  revalidatePath('/employees')
  return { success: true }
}
