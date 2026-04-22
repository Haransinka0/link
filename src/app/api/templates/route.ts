import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/utils/session'
import { createServiceClient } from '@/utils/supabase/service'

type TemplateType = 'text' | 'image' | 'document' | 'poll' | 'article'

function buildBody(params: {
  type: TemplateType
  content: string
  pollOptions?: string[]
}) {
  const lines: string[] = []
  lines.push(`::type=${params.type}::`)
  if (params.type === 'poll' && params.pollOptions && params.pollOptions.length) {
    lines.push(`::poll_options=${params.pollOptions.map(o => o.replaceAll('|', '/')).join('|')}::`)
  }
  lines.push('')
  lines.push(params.content.trim())
  return lines.join('\n')
}

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const supabase = await createServiceClient()

  let query = supabase
    .from('post_templates')
    .select('id,title,body,status,image_url,rejection_reason,scheduled_at,published_at,created_at,updated_at')
    .order('created_at', { ascending: false })

  if (user.role === 'employee') query = query.eq('created_by', user.id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ templates: data ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const payload = await req.json().catch(() => null) as null | {
    title: string
    type: TemplateType
    content: string
    mediaUrl?: string | null
    pollOptions?: string[]
  }

  if (!payload?.title?.trim() || !payload?.content?.trim() || !payload?.type) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const insert = {
    created_by: user.id,
    title: payload.title.trim(),
    body: buildBody({ type: payload.type, content: payload.content, pollOptions: payload.pollOptions }),
    // Approval/rejection workflow is temporarily disabled in the UI,
    // so new templates are immediately usable for scheduling.
    status: 'approved',
    image_url: payload.mediaUrl?.trim() || null,
    ai_generated: false,
  }

  const { error } = await supabase.from('post_templates').insert(insert)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const payload = await req.json().catch(() => null) as null | {
    id: string
    title: string
    type: TemplateType
    content: string
    mediaUrl?: string | null
    pollOptions?: string[]
  }

  if (!payload?.id || !payload?.title?.trim() || !payload?.content?.trim() || !payload?.type) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const patch = {
    title: payload.title.trim(),
    body: buildBody({ type: payload.type, content: payload.content, pollOptions: payload.pollOptions }),
    image_url: payload.mediaUrl?.trim() || null,
  }

  let q = supabase.from('post_templates').update(patch).eq('id', payload.id)
  if (user.role === 'employee') q = q.eq('created_by', user.id)

  const { error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = await createServiceClient()

  let q = supabase.from('post_templates').delete().eq('id', id)
  if (user.role === 'employee') q = q.eq('created_by', user.id)

  const { error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

