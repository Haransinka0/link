import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/utils/supabase/service'
import { getSessionUser } from '@/utils/session'
import { publishTemplate } from '@/app/actions'

export async function POST() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const cookieStore = await cookies()
  const linkedToken = cookieStore.get('linkedin_token')?.value || process.env.LINKEDIN_ACCESS_TOKEN
  const linkedUrn = cookieStore.get('linkedin_urn')?.value || process.env.LINKEDIN_MEMBER_URN

  if (!linkedToken || !linkedUrn) {
    return NextResponse.json({ error: 'LinkedIn not connected' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const nowIso = new Date().toISOString()

  const { data: dueTemplates, error } = await supabase
    .from('post_templates')
    .select('id')
    .eq('status', 'scheduled')
    .lte('scheduled_at', nowIso)
    .order('scheduled_at', { ascending: true })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = (dueTemplates || []).map(t => t.id)

  let published = 0
  let failed = 0

  for (const id of ids) {
    const result = await publishTemplate(id)
    if (result?.success) published += 1
    else failed += 1
  }

  return NextResponse.json({ ok: true, due: ids.length, published, failed })
}

