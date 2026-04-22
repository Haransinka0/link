'use server'

import { createServiceClient } from '@/utils/supabase/service'
import { getSessionUser } from '@/utils/session'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateTemplate(formData: FormData) {
  const user = await getSessionUser()
  if (!user) throw new Error('Not authenticated')

  const id = formData.get('id') as string
  const project_id = formData.get('project_id') as string
  const title = formData.get('title') as string
  const body = formData.get('body') as string
  const hashtagsRaw = formData.get('hashtags') as string
  const tone = formData.get('tone') as string
  const image_url = formData.get('image_url') as string
  
  const action = formData.get('action') as string
  const status = action === 'submit' ? 'pending_review' : 'draft'

  const hashtags = hashtagsRaw ? hashtagsRaw.split(',').map(h => h.trim().replace(/^#/, '')).filter(Boolean) : []
  
  const supabase = createServiceClient()
  const { data, error } = await supabase.from('post_templates').update({
    title,
    body,
    hashtags,
    tone: tone || 'professional',
    image_url: image_url || null,
    status,
    updated_at: new Date().toISOString()
  }).eq('id', id).select().single()

  if (error) {
    throw new Error(error.message)
  }

  if (status === 'pending_review' && data) {
    await supabase.from('approval_events').insert({
      template_id: data.id,
      reviewer_id: user.id,
      action: 'submitted',
      comment: 'Re-submitted after edit'
    })
  }

  revalidatePath(`/projects/${project_id}`)
  redirect(`/projects/${project_id}`)
}
