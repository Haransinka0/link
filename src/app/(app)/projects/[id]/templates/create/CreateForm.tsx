'use client'

import { useState, useEffect } from 'react'
import { createTemplate } from './actions'
import {
  Send, Loader2, Bot, Sparkles, Image as ImageIcon, X, Hash, ChevronDown, ChevronUp
} from 'lucide-react'

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

export default function CreateForm({
  project,
  userName = 'Your Name',
  isLinkedInConnected,
  linkedInName,
  linkedInPicture,
}: {
  project: { id: string; name: string }
  userName?: string
  isLinkedInConnected: boolean
  linkedInName: string | null
  linkedInPicture: string | null
}) {
  const [templateType, setTemplateType] = useState('text')
  const [title, setTitle]           = useState('')
  const [body, setBody]             = useState('')
  const [hashtags, setHashtags]     = useState('')
  const [tone, setTone]             = useState('professional')
  const [imageUrl, setImageUrl]     = useState<string | null>(null)
  
  // Custom fields state
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

  // Update composed body when fields change
  useEffect(() => {
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
    setBody(combined)
  }, [templateType, fields, slides])

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
        // We dump it into a raw catch-all for simplicity if AI generates it
        setFields({})
        if (templateType === 'text') setF('tBody', data.text)
        else if (templateType === 'image') setF('iCaption', data.text)
        else if (templateType === 'carousel') setF('cIntro', data.text)
        else if (templateType === 'poll') setF('pIntro', data.text)
        else if (templateType === 'article') setF('aIntro', data.text)
        else if (templateType === 'sponsored') setF('sPrimary', data.text)
        else if (templateType === 'job') setF('jSummary', data.text)

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
        setFields({})
        if (templateType === 'text') setF('tBody', data.text)
        else if (templateType === 'image') setF('iCaption', data.text)
        else if (templateType === 'carousel') setF('cIntro', data.text)
        else if (templateType === 'poll') setF('pIntro', data.text)
        else if (templateType === 'article') setF('aIntro', data.text)
        else if (templateType === 'sponsored') setF('sPrimary', data.text)
        else if (templateType === 'job') setF('jSummary', data.text)
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
        
        <form action={createTemplate}>
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
              {templateType === 'text' && (
                <>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Hook / opening line</label><textarea rows={2} className="form-textarea" placeholder="Start with something that stops the scroll..." value={fields.tHook || ''} onChange={e=>setF('tHook', e.target.value)} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Main body</label><textarea rows={5} className="form-textarea" placeholder="Expand your idea in 2–3 short paragraphs." value={fields.tBody || ''} onChange={e=>setF('tBody', e.target.value)} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Key takeaway</label><textarea rows={2} className="form-textarea" placeholder="One sentence the reader should walk away remembering." value={fields.tTakeaway || ''} onChange={e=>setF('tTakeaway', e.target.value)} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Call to action</label><input type="text" className="form-input" placeholder="e.g. What do you think?" value={fields.tCta || ''} onChange={e=>setF('tCta', e.target.value)} /></div>
                    <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Hashtags</label><input type="text" className="form-input" name="hashtags" placeholder="#marketing #growth" value={hashtags} onChange={e=>setHashtags(e.target.value)} /></div>
                  </div>
                </>
              )}

              {templateType === 'image' && (
                <>
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
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Image description / alt text</label><input type="text" className="form-input" placeholder="Describe the image..." value={fields.iAlt || ''} onChange={e=>setF('iAlt', e.target.value)} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Text overlay on image</label><input type="text" className="form-input" placeholder="Short tagline or stat..." value={fields.iOverlay || ''} onChange={e=>setF('iOverlay', e.target.value)} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Caption</label><textarea rows={4} className="form-textarea" placeholder="Write the post caption..." value={fields.iCaption || ''} onChange={e=>setF('iCaption', e.target.value)} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Call to action</label><input type="text" className="form-input" placeholder="e.g. Save this for later" value={fields.iCta || ''} onChange={e=>setF('iCta', e.target.value)} /></div>
                    <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Hashtags</label><input type="text" className="form-input" name="hashtags" placeholder="#branding #design" value={hashtags} onChange={e=>setHashtags(e.target.value)} /></div>
                  </div>
                </>
              )}

              {templateType === 'carousel' && (
                <>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Cover slide title</label><input type="text" className="form-input" placeholder="Bold headline..." value={fields.cTitle || ''} onChange={e=>setF('cTitle', e.target.value)} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Intro caption</label><textarea rows={2} className="form-textarea" placeholder="1–2 sentences introducing..." value={fields.cIntro || ''} onChange={e=>setF('cIntro', e.target.value)} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Slides (add heading + bullets)</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {slides.map((s, i) => (
                        <div key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', display: 'flex', gap: 10 }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#1a73e8', color: '#fff', fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i+1}</div>
                          <input className="form-input" style={{ border: 'none', background: 'transparent', padding: 0 }} placeholder="Slide content..." value={s} onChange={e=>setS(i, e.target.value)} />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {templateType === 'poll' && (
                <>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Intro caption</label><textarea rows={2} className="form-textarea" placeholder="Explain why you're asking..." value={fields.pIntro || ''} onChange={e=>setF('pIntro', e.target.value)} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Poll question</label><input type="text" className="form-input" placeholder="Keep it short and debatable..." value={fields.pQuestion || ''} onChange={e=>setF('pQuestion', e.target.value)} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Answer options</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {['A','B','C','D'].map((letter, i) => {
                        const key = `pOpt${letter}`
                        return (
                          <div key={letter} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid #ccc', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{letter}</div>
                            <input className="form-input" style={{ border: 'none', background: 'transparent', padding: 0 }} placeholder={`Option ${letter}`} value={fields[key] || ''} onChange={e=>setF(key, e.target.value)} />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Poll duration</label><input type="text" className="form-input" placeholder="1 week" /></div>
                    <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Hashtags</label><input type="text" className="form-input" name="hashtags" placeholder="#poll" value={hashtags} onChange={e=>setHashtags(e.target.value)} /></div>
                  </div>
                </>
              )}

              {templateType === 'article' && (
                <>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Headline</label><input type="text" className="form-input" placeholder="Strong, searchable..." value={fields.aHeadline || ''} onChange={e=>setF('aHeadline', e.target.value)} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Subtitle</label><input type="text" className="form-input" placeholder="One line expanding..." value={fields.aSubtitle || ''} onChange={e=>setF('aSubtitle', e.target.value)} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Introduction</label><textarea rows={3} className="form-textarea" placeholder="Hook the reader..." value={fields.aIntro || ''} onChange={e=>setF('aIntro', e.target.value)} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Section 1</label><textarea rows={3} className="form-textarea" placeholder="First main point..." value={fields.aS1 || ''} onChange={e=>setF('aS1', e.target.value)} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Section 2</label><textarea rows={3} className="form-textarea" placeholder="Second main point..." value={fields.aS2 || ''} onChange={e=>setF('aS2', e.target.value)} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Section 3</label><textarea rows={3} className="form-textarea" placeholder="Third main point..." value={fields.aS3 || ''} onChange={e=>setF('aS3', e.target.value)} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Conclusion + CTA</label><textarea rows={2} className="form-textarea" placeholder="Summarize and invite..." value={fields.aOutro || ''} onChange={e=>setF('aOutro', e.target.value)} /></div>
                </>
              )}

              {templateType === 'sponsored' && (
                <>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Ad headline</label><input type="text" className="form-input" placeholder="Under 70 chars..." value={fields.sHeadline || ''} onChange={e=>setF('sHeadline', e.target.value)} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Primary text</label><textarea rows={3} className="form-textarea" placeholder="150 chars or less..." value={fields.sPrimary || ''} onChange={e=>setF('sPrimary', e.target.value)} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Description</label><textarea rows={2} className="form-textarea" placeholder="Supporting detail..." value={fields.sDesc || ''} onChange={e=>setF('sDesc', e.target.value)} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>CTA button label</label><input type="text" className="form-input" placeholder="e.g. Learn more" value={fields.sCta || ''} onChange={e=>setF('sCta', e.target.value)} /></div>
                    <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Destination URL</label><input type="text" className="form-input" placeholder="https://..." value={fields.sUrl || ''} onChange={e=>setF('sUrl', e.target.value)} /></div>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Target audience notes</label><input type="text" className="form-input" placeholder="e.g. HR managers..." value={fields.sTarget || ''} onChange={e=>setF('sTarget', e.target.value)} /></div>
                </>
              )}

              {templateType === 'job' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Job title</label><input type="text" className="form-input" placeholder="e.g. Senior Designer" value={fields.jTitle || ''} onChange={e=>setF('jTitle', e.target.value)} /></div>
                    <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Company name</label><input type="text" className="form-input" placeholder="e.g. Acme Corp" value={fields.jCompany || ''} onChange={e=>setF('jCompany', e.target.value)} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Location / remote</label><input type="text" className="form-input" placeholder="e.g. Remote" value={fields.jLocation || ''} onChange={e=>setF('jLocation', e.target.value)} /></div>
                    <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Employment type</label><input type="text" className="form-input" placeholder="Full-time" value={fields.jType || ''} onChange={e=>setF('jType', e.target.value)} /></div>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Role summary</label><textarea rows={2} className="form-textarea" placeholder="Description..." value={fields.jSummary || ''} onChange={e=>setF('jSummary', e.target.value)} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Key responsibilities</label><textarea rows={3} className="form-textarea" placeholder="Will do..." value={fields.jResp || ''} onChange={e=>setF('jResp', e.target.value)} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Requirements</label><textarea rows={3} className="form-textarea" placeholder="Must have..." value={fields.jReqs || ''} onChange={e=>setF('jReqs', e.target.value)} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>Benefits / perks</label><textarea rows={2} className="form-textarea" placeholder="Equity..." value={fields.jBenefits || ''} onChange={e=>setF('jBenefits', e.target.value)} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize:12 }}>How to apply</label><input type="text" className="form-input" placeholder="Link or DM..." value={fields.jApply || ''} onChange={e=>setF('jApply', e.target.value)} /></div>
                </>
              )}

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
                Save Draft
              </button>
              <button type="submit" name="action" value="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a73e8' }}>
                <Send size={14} /> Submit for Review
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
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Generate full post using the prompt above</div>
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
                  {isGenText ? <Loader2 className="animate-spin" size={14} /> : 'Generate Post Content'}
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

      {/* ── RIGHT: LinkedIn Preview (Unchanged structure) ── */}
      <div style={{ position: 'sticky', top: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
          Live Preview
        </div>

        <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', border: '1px solid #DDE6F0', boxShadow: '0 0 0 1px rgba(0,0,0,.05), 0 8px 24px rgba(0,0,0,.06)' }}>
          <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            {linkedInPicture ? <img src={linkedInPicture} alt="avatar" style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#0a66c2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>{initial}</div>}
            <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14, color: '#000' }}>{displayName}</div><div style={{ fontSize: 11, color: '#666' }}>LinkedIn Member</div></div>
          </div>
          <div style={{ padding: '10px 16px 12px' }}>
            {body ? <div style={{ whiteSpace: 'pre-wrap', color: '#1a1a1a', fontSize: 14, lineHeight: 1.55 }}>{body}</div> : <div style={{ color: '#aaa', fontSize: 14, fontStyle: 'italic' }}>Your post preview appears here...</div>}
            {hashtags && <div style={{ marginTop: 10, fontSize: 14, color: '#0a66c2', fontWeight: 600 }}>{hashtags.split(',').map(h => `#${h.trim().replace(/^#+/, '')}`).filter(Boolean).join(' ')}</div>}
          </div>
          {imageUrl && <div><img src={imageUrl} alt="Post image" style={{ width: '100%', maxHeight: 320, objectFit: 'cover' }} /></div>}
        </div>
      </div>
    </div>
  )
}
