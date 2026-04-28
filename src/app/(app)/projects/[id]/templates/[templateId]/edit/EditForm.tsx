'use client'

import { useState, useEffect } from 'react'
import { updateTemplate } from './actions'
import {
  Send, Loader2, Bot, Sparkles, Image as ImageIcon, X, Hash, ChevronDown, ChevronUp
} from 'lucide-react'
import LinkedInPostCard from '@/components/LinkedInPostCard'

// Map of colors for icons
const ICON_COLORS: Record<string, string> = {
  text: '#e8f0fe',
  image: '#e6f4ea',
  carousel: '#fce8e6',
  poll: '#fef9e0',
  article: '#f3e8ff',
  sponsored: '#fff0e0',
  job: '#e8f5e9'
}

const TEMPLATE_TYPES = [
  { id: 'text',       label: 'Text post',         icon: '📝', title: 'Text post',         desc: 'Pure text — idea, story, or insight' },
  { id: 'image',      label: 'Image post',        icon: '🖼', title: 'Image post',        desc: 'Visual-first post with caption' },
  { id: 'carousel',   label: 'Document/Carousel', icon: '📂', title: 'Document/Carousel', desc: 'Multi-slide swipeable content' },
  { id: 'poll',       label: 'Poll',              icon: '📊', title: 'Poll',              desc: 'Audience engagement through voting' },
  { id: 'article',    label: 'Article',           icon: '📰', title: 'Article',           desc: 'Long-form thought leadership' },
  { id: 'sponsored',  label: 'Paid/Sponsored',    icon: '💰', title: 'Paid / Sponsored',  desc: 'Promoted ad content' },
  { id: 'job',        label: 'Job post',          icon: '💼', title: 'Job post',          desc: 'Attract the right candidates' },
]

export default function EditForm({
  project,
  template,
  userName = 'Your Name',
  isLinkedInConnected,
  linkedInName,
  linkedInPicture,
}: {
  project: { id: string; name: string }
  template: any
  userName?: string
  isLinkedInConnected: boolean
  linkedInName: string | null
  linkedInPicture: string | null
}) {
  const [templateType, setTemplateType] = useState(template.template_type || 'text')
  const [title, setTitle]           = useState(template.title || '')
  const [body, setBody]             = useState(template.body || '')
  const [hashtags, setHashtags]     = useState(Array.isArray(template.hashtags) ? template.hashtags.join(', ') : (template.hashtags || ''))
  const [tone, setTone]             = useState(template.tone || 'professional')
  const [imageUrl, setImageUrl]     = useState<string | null>(template.image_url || null)
  
  // Custom fields state - for simplicity, if editing, we might just use the raw body
  // but let's try to parse if possible or just use body if parsing fails.
  const [fields, setFields] = useState<Record<string, string>>({})
  const [slides, setSlides] = useState<string[]>(['', '', '', '', ''])
  
  const [aiOpen, setAiOpen]         = useState(false)
  const [aiTopic, setAiTopic]       = useState('')
  const [isGenText, setIsGenText]   = useState(false)
  const [isGenImage, setIsGenImage] = useState(false)
  const [isEnhancing, setIsEnhancing]   = useState(false)
  const [isGenHashtags, setIsGenHashtags] = useState(false)
  const [aiError, setAiError]       = useState<string | null>(null)
  
  const [isUploading, setIsUploading] = useState(false)

  const displayName = linkedInName || userName
  const initial = displayName[0]?.toUpperCase() || 'U'

  // If initial body was loaded, we don't want the effect to overwrite it immediately 
  // unless fields actually change.
  const [isInitialized, setIsInitialized] = useState(false)

  // Update composed body when fields change
  useEffect(() => {
    if (!isInitialized) {
        setIsInitialized(true)
        return
    }
    let combined = ''
    if (templateType === 'text') {
      combined = [fields.tHook, fields.tBody, fields.tTakeaway, fields.tCta].filter(Boolean).join('\n\n')
    } else if (templateType === 'image') {
      combined = [fields.iAlt ? `[Alt: ${fields.iAlt}]` : '', fields.iOverlay ? `[Overlay: ${fields.iOverlay}]` : '', fields.iCaption, fields.iCta].filter(Boolean).join('\n\n')
    } else if (templateType === 'carousel') {
      const slidesText = slides.map((s, i) => s ? `Slide ${i+1}: ${s}` : '').filter(Boolean).join('\n')
      combined = [fields.cTitle ? `[Cover: ${fields.cTitle}]` : '', fields.cIntro, slidesText].filter(Boolean).join('\n\n')
    } else if (templateType === 'poll') {
      const opts = [fields.pOptA, fields.pOptB, fields.pOptC, fields.pOptD].filter(Boolean).map((o,i) => `${['A','B','C','D'][i]}. ${o}`).join('\n')
      combined = [fields.pIntro, fields.pQuestion ? `Poll: ${fields.pQuestion}` : '', opts].filter(Boolean).join('\n\n')
    } else if (templateType === 'article') {
      combined = [fields.aHeadline, fields.aSubtitle, fields.aIntro, fields.aS1, fields.aS2, fields.aS3, fields.aOutro].filter(Boolean).join('\n\n')
    } else if (templateType === 'sponsored') {
      combined = [fields.sHeadline, fields.sPrimary, fields.sDesc, fields.sCta ? `[Button: ${fields.sCta}]` : '', fields.sUrl, fields.sTarget ? `[Targeting: ${fields.sTarget}]` : ''].filter(Boolean).join('\n\n')
    } else if (templateType === 'job') {
      const meta = [fields.jTitle, fields.jCompany, fields.jLocation, fields.jType].filter(Boolean).join(' | ')
      combined = [meta, fields.jSummary, fields.jResp ? `Responsibilities:\n${fields.jResp}` : '', fields.jReqs ? `Requirements:\n${fields.jReqs}` : '', fields.jBenefits ? `Benefits:\n${fields.jBenefits}` : '', fields.jApply ? `How to apply: ${fields.jApply}` : ''].filter(Boolean).join('\n\n')
    }
    if (combined) setBody(combined)
  }, [templateType, fields, slides, isInitialized])

  const setF = (k: string, v: string) => setFields(p => ({ ...p, [k]: v }))
  const setS = (i: number, v: string) => setSlides(p => { const n = [...p]; n[i] = v; return n; })

  // ── AI Setup ─────────────────────────────────────────────────────────────
  const AI_PROMPTS: Record<string, string> = {
    text: '"Write a LinkedIn text post with a strong hook about [topic], followed by 2–3 insight-packed paragraphs, a memorable takeaway, and a CTA asking readers to share their opinion. End with 3–5 relevant hashtags."',
    image: '"Write a LinkedIn image post caption about [topic]. Include a punchy one-liner for overlay text, a 3–4 sentence caption with context and value, a CTA, and 3–5 hashtags."',
    carousel: '"Create a 6-slide LinkedIn carousel on [topic]. Slide 1: bold cover title. Slides 2–5: each with a heading and 2–3 bullet points. Slide 6: a strong CTA. Also write a short intro caption for the post."',
    poll: '"Write a LinkedIn poll about [topic]. Include a 2-sentence context caption, a punchy poll question, 4 short answer options (under 30 chars each), and a follow-up note promising to share results."',
    article: '"Write a LinkedIn article on [topic]. Include a compelling headline, subtitle, intro paragraph, 3 sections each with a heading and 2–3 paragraphs, and a conclusion with a CTA to comment or connect."',
    sponsored: '"Write a LinkedIn sponsored post ad for [product/service]. Include a benefit-led headline under 70 chars, primary text under 150 chars, a short description, and a CTA button label. Target audience: [audience]."',
    job: '"Write a LinkedIn job post for a [job title] at [company]. Include a 2-sentence role summary, 4 key responsibilities, 4 requirements, 3 benefits, and a clear CTA to apply. Tone: professional but human."'
  }

  useEffect(() => {
    setAiTopic(AI_PROMPTS[templateType])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateType])

  async function handleGenerateText() {
    if (!aiTopic.trim()) return
    setIsGenText(true); setAiError(null)
    try {
      const res = await fetch('/api/ai/generate-text', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: aiTopic, tone }) })
      const data = await res.json()
      if (res.ok && data.text) {
        setBody(data.text) // Direct update since we are editing
        if (!title) setTitle('AI Generated Post')
      } else { setAiError(data.error || 'Failed to generate text.') }
    } catch { setAiError('Connection error. Please try again.') }
    finally { setIsGenText(false) }
  }

  async function handleGenerateHashtags() {
    const content = body || aiTopic
    if (!content.trim()) return
    setIsGenHashtags(true); setAiError(null)
    try {
      const res = await fetch('/api/ai/generate-text', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'hashtags', existingContent: content }) })
      const data = await res.json()
      if (res.ok && data.hashtags) setHashtags(data.hashtags)
    } finally { setIsGenHashtags(false) }
  }

  async function handleEnhance() {
    if (!body.trim()) { setAiError('Write some content first to enhance it.'); return }
    setIsEnhancing(true); setAiError(null)
    try {
      const res = await fetch('/api/ai/generate-text', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'enhance', existingContent: body, tone }) })
      const data = await res.json()
      if (res.ok && data.text) {
        setBody(data.text)
      } else { setAiError(data.error || 'Failed to enhance text.') }
    } catch { setAiError('Connection error. Please try again.') }
    finally { setIsEnhancing(false) }
  }

  async function handleGenerateImage() {
    if (!aiTopic.trim()) { setAiError('Enter a topic for the image.'); return }
    setIsGenImage(true); setAiError(null)
    try {
      const res = await fetch('/api/ai/generate-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: aiTopic }) })
      const data = await res.json()
      if (res.ok && data.imageUrl) setImageUrl(data.imageUrl)
      else setAiError(data.error || 'Failed to generate image.')
    } catch { setAiError('Connection error. Please try again.') }
    finally { setIsGenImage(false) }
  }

  async function handleFileUpload(file: File) {
    if (!file) return
    setIsUploading(true)
    setAiError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok && data.url) setImageUrl(data.url)
      else setAiError(data.error || 'Failed to upload file.')
    } catch { setAiError('Connection error during upload.') }
    finally { setIsUploading(false) }
  }

  const activeType = TEMPLATE_TYPES.find(t => t.id === templateType)!

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px', gap: 24, alignItems: 'start' }}>

      {/* ── LEFT: Composer ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        
        <form action={updateTemplate}>
          <input type="hidden" name="id" value={template.id} />
          <input type="hidden" name="project_id" value={project.id} />
          <input type="hidden" name="template_type" value={templateType} />
          <input type="hidden" name="image_url" value={imageUrl || ''} />
          <input type="hidden" name="body" value={body} />
          <input type="hidden" name="tone" value={tone} />

          {/* Top meta title */}
          <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
             <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 13 }}>Post Title (Internal) <span style={{ color: '#EF4444' }}>*</span></label>
              <input name="title" value={title} onChange={e => setTitle(e.target.value)} className="form-input" required placeholder="e.g. Q3 Launch Announcement" />
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: 12 }}>
            Template type
          </div>
          
          {/* TABS */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {TEMPLATE_TYPES.map(t => (
              <div 
                key={t.id} 
                onClick={() => setTemplateType(t.id)}
                style={{ 
                  padding: '6px 14px', borderRadius: 999, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                  border: templateType === t.id ? '1px solid #1a73e8' : '1px solid var(--border)',
                  background: templateType === t.id ? '#1a73e8' : 'var(--surface-2)',
                  color: templateType === t.id ? '#fff' : 'var(--color-text-secondary)',
                  fontWeight: templateType === t.id ? 500 : 400
                }}
              >
                {t.label}
              </div>
            ))}
          </div>

          {/* DYNAMIC CARD */}
          <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: ICON_COLORS[activeType.id] || '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                {activeType.icon}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>{activeType.title}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>{activeType.desc}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* For simplicity while editing, just show a main body textarea if parsing fields is complex */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize:12 }}>Content Body</label>
                <textarea rows={10} className="form-textarea" placeholder="Write your post content..." value={body} onChange={e=>setBody(e.target.value)} />
              </div>

              {templateType === 'image' && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize:12 }}>Post Image/Video</label>
                  <div 
                    style={{ border: '2px dashed var(--border)', borderRadius: 8, padding: '24px', textAlign: 'center', background: 'var(--surface-2)', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]) }}
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto', color: '#1a73e8' }} />
                        <div style={{ fontSize: 13, marginTop: 8, fontWeight: 500, color: '#1a73e8' }}>Uploading media...</div>
                      </>
                    ) : imageUrl ? (
                      <>
                        {imageUrl.match(/\.(mp4|webm)$/i) ? (
                          <video src={imageUrl} style={{ maxHeight: 150, borderRadius: 6, margin: '0 auto', display: 'block' }} controls />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageUrl} alt="Uploaded preview" style={{ maxHeight: 150, borderRadius: 6, margin: '0 auto', display: 'block' }} />
                        )}
                        <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: 4, color: '#fff' }} onClick={(e) => { e.stopPropagation(); setImageUrl(null) }}><X size={14} /></div>
                      </>
                    ) : (
                      <>
                        <ImageIcon size={28} style={{ margin: '0 auto', color: 'var(--color-text-tertiary)' }} />
                        <div style={{ fontSize: 13, marginTop: 8, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Click or Drag & Drop to upload image/video</div>
                      </>
                    )}
                    <input id="file-upload" type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]) }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Tone</label>
                  <select className="form-input" value={tone} onChange={e=>setTone(e.target.value)}>
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="motivational">Motivational</option>
                    <option value="promotional">Promotional</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Hashtags</label><input type="text" className="form-input" name="hashtags" placeholder="#marketing #growth" value={hashtags} onChange={e=>setHashtags(e.target.value)} /></div>
              </div>

              {/* AI Prompt Box Matching the UI */}
              <div style={{ background: '#f8fafc', borderLeft: '3px solid #1a73e8', borderRadius: '0 6px 6px 0', padding: '12px 14px', marginTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#1a73e8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>AI prompt</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>
                  {AI_PROMPTS[templateType]}
                </div>
              </div>
            </div>
            
            {/* Submit buttons */}
            <div style={{ paddingTop: 20, marginTop: 20, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="submit" name="action" value="draft" className="btn btn-secondary">
                Update Draft
              </button>
              <button type="submit" name="action" value="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a73e8' }}>
                <Send size={14} /> Submit Update for Review
              </button>
            </div>
          </div>
        </form>

        {/* Floating AI Panel */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <button type="button" onClick={() => setAiOpen(!aiOpen)} style={{ width: '100%', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: aiOpen ? '1px solid var(--border)' : 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={16} color="#fff" />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>AI Assistant</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Generate or improve post using AI</div>
            </div>
            {aiOpen ? <ChevronUp size={16} color="var(--color-text-tertiary)" /> : <ChevronDown size={16} color="var(--color-text-tertiary)" />}
          </button>
          {aiOpen && (
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Customize Prompt</label>
                <textarea rows={3} value={aiTopic} onChange={e => setAiTopic(e.target.value)} className="form-textarea" />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button type="button" onClick={handleGenerateText} disabled={isGenText} className="btn btn-primary" style={{ background: '#1a73e8', fontSize: 12, padding: '7px 14px', flex: 1, display: 'flex', justifyContent: 'center' }}>
                  {isGenText ? <Loader2 className="animate-spin" size={14} /> : 'Generate Content'}
                </button>
                <button type="button" onClick={handleEnhance} disabled={isEnhancing || !body.trim()} className="btn btn-secondary" style={{ fontSize: 12, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isEnhancing ? <Loader2 className="animate-spin" size={14} /> : 'Enhance Grammar'}
                </button>
                <button type="button" onClick={handleGenerateHashtags} disabled={isGenHashtags || !body.trim()} className="btn btn-secondary" style={{ fontSize: 12, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isGenHashtags ? <Loader2 className="animate-spin" size={14} /> : 'Generate Hashtags'}
                </button>
                <button type="button" onClick={handleGenerateImage} disabled={isGenImage || !aiTopic.trim()} className="btn btn-secondary" style={{ fontSize: 12, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isGenImage ? <Loader2 className="animate-spin" size={14} /> : 'Generate Image'}
                </button>
              </div>
              {aiError && <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px 14px', borderRadius: 8, fontSize: 12 }}>{aiError}</div>}
            </div>
          )}
        </div>

      </div>

      {/* ── RIGHT: LinkedIn Preview ── */}
      <div style={{ position: 'sticky', top: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--li-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
          Live Preview
        </div>

        <LinkedInPostCard
          authorName={displayName}
          authorPicture={linkedInPicture}
          authorHeadline="LinkedIn Member"
          body={body || 'Your post preview appears here...'}
          hashtags={hashtags ? hashtags.split(',').map(h => h.trim().replace(/^#+/, '')).filter(Boolean) : null}
          imageUrl={imageUrl}
          timeAgo="Just now"
        />
      </div>
    </div>
  )
}
