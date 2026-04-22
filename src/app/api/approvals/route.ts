import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'
import { getSessionUser } from '@/utils/session'

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return NextResponse.redirect(new URL('/login', appUrl))
  }

  const formData = await request.formData()
  const template_id = formData.get('template_id') as string
  const action = formData.get('action') as string
  const comment = (formData.get('comment') as string) || ''

  if (!template_id || !action) {
    return NextResponse.redirect(new URL('/approvals', appUrl))
  }

  const supabase = createServiceClient()

  if (action === 'approve') {
    await supabase.from('post_templates')
      .update({ status: 'approved' })
      .eq('id', template_id)

    await supabase.from('approval_events').insert({
      template_id,
      reviewer_id: user.id,
      action: 'approved',
      comment: comment || 'Approved',
    })
  } else if (action === 'reject') {
    if (!comment.trim()) {
      // Redirect back with error if no comment for rejection
      return NextResponse.redirect(new URL('/approvals?error=comment_required', appUrl))
    }
    await supabase.from('post_templates')
      .update({ status: 'rejected', rejection_reason: comment })
      .eq('id', template_id)

    await supabase.from('approval_events').insert({
      template_id,
      reviewer_id: user.id,
      action: 'rejected',
      comment,
    })
  }

  return NextResponse.redirect(new URL('/approvals', appUrl))
}
