import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const supabase = createServiceClient()
    
    // Ensure bucket exists (ignoring errors if it exists)
    await supabase.storage.createBucket('media', { public: true })

    const ext = file.name.split('.').pop()
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
    
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    const { data, error } = await supabase.storage
      .from('media')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (error) {
      throw error
    }

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filename)

    return NextResponse.json({ url: publicUrl })
  } catch (error: any) {
    console.error('File upload error:', error)
    return NextResponse.json({ error: error.message || 'Failed to upload file' }, { status: 500 })
  }
}
