import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/utils/session'
import { createServiceClient } from '@/utils/supabase/service'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const payload = await req.json().catch(() => null) as null | {
    action: 'schedule' | 'cancel'
    templateId: string
    scheduledAt?: string
  }

  if (!payload?.templateId || !payload?.action) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  if (payload.action === 'schedule') {
    if (!payload.scheduledAt) return NextResponse.json({ error: 'Missing scheduledAt' }, { status: 400 })
    const iso = new Date(payload.scheduledAt).toISOString()
    let q = supabase
      .from('post_templates')
      .update({ status: 'scheduled', scheduled_at: iso })
      .eq('id', payload.templateId)

    // Non-admins can only schedule their own approved templates
    if (user.role === 'employee') {
      q = q.eq('created_by', user.id)
    }
    q = q.eq('status', 'approved')

    const { error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (payload.action === 'cancel') {
    let q = supabase
      .from('post_templates')
      .update({ status: 'approved', scheduled_at: null })
      .eq('id', payload.templateId)

    if (user.role === 'employee') {
      q = q.eq('created_by', user.id)
    }
    q = q.eq('status', 'scheduled')

    const { error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

