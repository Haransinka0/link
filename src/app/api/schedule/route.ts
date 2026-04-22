import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getSessionUser } from '@/utils/session'

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return NextResponse.redirect(new URL('/login', appUrl))
  }

  const formData = await request.formData()
  const template_id = formData.get('template_id') as string
  const scheduled_at = formData.get('scheduled_at') as string

  const supabase = await createClient()

  // Update template
  await supabase.from('post_templates').update({ 
    status: 'scheduled',
    scheduled_at: new Date(scheduled_at).toISOString()
  }).eq('id', template_id)

  return NextResponse.redirect(new URL('/schedule', appUrl))
}
