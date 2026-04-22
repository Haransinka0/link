'use client'

import { useState, useTransition, useRef } from 'react'
import { postToLinkedIn, disconnectLinkedIn } from './actions'
import {
  Send, Sparkles, Loader2, ImagePlus, X, LogOut,
  Wand2, Image as ImageIcon, ChevronDown, ChevronUp, Bot
} from 'lucide-react'

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'motivational', label: 'Motivational' },
  { value: 'promotional', label: 'Promotional' }
]

export default function CreateForm({ 
  isConnected,
  userName = 'Your Name',
  userPicture
}: { 
  isConnected: boolean
  userName?: string
  userPicture?: string
}) {
  // post state
  const [body, setBody] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [tone, setTone] = useState('professional')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)

  // AI state
  const [aiOpen, setAiOpen] = useState(true)
  const [aiTopic, setAiTopic] = useState('')
  const [isGenText, setIsGenText] = useState(false)
  const [isGenImage, setIsGenImage] = useState(false)
  const [aiError, setAiError] = useState('')

  // post state
  const [isPending, startTransition] = useTransition()
  const [isDisconnecting, startDisconnecting] = useTransition()
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const charCount = body.length

  // ── AI Handlers ──────────────────────────────────────────────────────────────

  const handleGenerateText = async () => {
    if (!aiTopic.trim()) return
    setIsGenText(true)
    setAiError('')
    try {
      const res = await fetch('/api/ai/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic, tone })
      })
      const data = await res.json()
      if (data.text) {
        setBody(data.text)
        setMessage(null)
      } else {
        setAiError(data.error || 'Generation failed.')
      }
    } catch {
      setAiError('Network error. Please try again.')
    } finally {
      setIsGenText(false)
    }
  }

  const handleGenerateImage = async () => {
    if (!aiTopic.trim()) return
    setIsGenImage(true)
    setAiError('')
    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic })
      })
      const data = await res.json()
      if (data.image) {
        const dataUrl = `data:${data.mimeType};base64,${data.image}`
        setImagePreview(dataUrl)
        // Convert base64 to File object for uploading
        const bytes = Uint8Array.from(atob(data.image), c => c.charCodeAt(0))
        const blob = new Blob([bytes], { type: data.mimeType })
        setImageFile(new File([blob], 'ai-generated.png', { type: data.mimeType }))
      } else {
        // Intercept 429 errors from Google to be more helpful
        if (data.error && data.error.includes('Too Many Requests')) {
          setAiError('Image generation failed: You have exceeded the free tier quota. Please add a billing account in Google AI Studio to increase your quota.');
        } else {
          setAiError(data.error || 'Image generation failed.');
        }
      }
    } catch {
      setAiError('Network error. Please try again.')
    } finally {
      setIsGenImage(false)
    }
  }

  // ── Image Upload ──────────────────────────────────────────────────────────────

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Post Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isConnected) {
      setMessage({ type: 'error', text: 'You must connect to LinkedIn first.' })
      return
    }
    const formData = new FormData()
    const hashtagStr = hashtags
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean)
      .map(t => `#${t}`)
      .join(' ')
    formData.set('body', hashtagStr ? `${body}\n\n${hashtagStr}` : body)
    if (imageFile) formData.set('image', imageFile)

    startTransition(async () => {
      setMessage(null)
      const res = await postToLinkedIn(formData)
      if (res.success) {
        setMessage({ type: 'success', text: '🎉 Post published to LinkedIn successfully!' })
        setBody('')
        setHashtags('')
        removeImage()
        setAiTopic('')
      } else {
        setMessage({ type: 'error', text: res.error || 'Unknown error occurred.' })
      }
    })
  }

  const handleDisconnect = () => {
    startDisconnecting(async () => {
      await disconnectLinkedIn()
    })
  }

  const displayHashtags = hashtags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean)
  const isAiLoading = isGenText || isGenImage

  return (
    <div className="space-y-6">
      {/* ── AI Assistant Panel ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 overflow-hidden shadow-sm">
        {/* header */}
        <button
          type="button"
          onClick={() => setAiOpen(o => !o)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/40 transition"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-900 text-sm">AI Content Assistant</p>
              <p className="text-xs text-slate-500">Powered by Google Gemini 2.0 Flash</p>
            </div>
          </div>
          {aiOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {aiOpen && (
          <div className="px-6 pb-6 border-t border-violet-100 pt-4 space-y-4">
            {aiError && (
              <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
                {aiError}
              </div>
            )}

            {/* topic input */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                What&apos;s your post about?
              </label>
              <input
                type="text"
                value={aiTopic}
                onChange={e => setAiTopic(e.target.value)}
                placeholder="e.g. AI trends in 2025, leadership tips, product launch…"
                className="w-full px-4 py-3 bg-white border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:border-violet-400 text-slate-900 text-sm placeholder:text-slate-400 transition"
                onKeyDown={e => e.key === 'Enter' && handleGenerateText()}
              />
            </div>

            {/* action buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleGenerateText}
                disabled={!aiTopic.trim() || isAiLoading}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold px-5 py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm"
              >
                {isGenText ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                ) : (
                  <><Wand2 className="w-4 h-4" /> Generate Post Content</>
                )}
              </button>

              <button
                type="button"
                onClick={handleGenerateImage}
                disabled={!aiTopic.trim() || isAiLoading}
                className="inline-flex items-center gap-2 bg-white hover:bg-violet-50 text-violet-700 border border-violet-300 font-semibold px-5 py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isGenImage ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                ) : (
                  <><ImageIcon className="w-4 h-4" /> Generate Image</>
                )}
              </button>
            </div>

            {/* tip */}
            <p className="text-xs text-slate-400">
              💡 Tip: Type your topic above → Generate Content fills your post → Generate Image creates a matching visual
            </p>
          </div>
        )}
      </div>

      {/* ── Main Grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Composer */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">

            {message && (
              <div className={`p-4 rounded-lg text-sm font-medium border ${
                message.type === 'error'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {message.text}
              </div>
            )}

            {/* body */}
            <div>
              <div className="flex justify-between items-end mb-1.5">
                <label htmlFor="body" className="text-sm font-medium text-slate-700">Post Content</label>
                <span className={`text-xs ${charCount > 3000 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                  {charCount}/3000
                </span>
              </div>
              <textarea
                id="body"
                required
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Write your post here or use the AI Assistant above to generate content…"
                rows={8}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none text-slate-900 text-sm"
              />
            </div>

            {/* image upload */}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Attach Image</p>
              {imagePreview ? (
                <div className="relative rounded-lg overflow-hidden border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {isGenImage && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={isGenImage}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 rounded-lg py-5 text-sm font-medium text-slate-500 hover:text-blue-600 transition disabled:opacity-50"
                >
                  {isGenImage
                    ? <><Loader2 className="w-5 h-5 animate-spin text-violet-500" /> AI generating image…</>
                    : <><ImagePlus className="w-5 h-5" /> Click to upload or use AI to generate</>
                  }
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </div>

            {/* hashtags + tone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="hashtags" className="text-sm font-medium text-slate-700 mb-1 block">Hashtags</label>
                <input
                  id="hashtags"
                  type="text"
                  value={hashtags}
                  onChange={e => setHashtags(e.target.value)}
                  placeholder="marketing, tech, ai"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-slate-900 text-sm"
                />
              </div>
              <div>
                <label htmlFor="tone" className="text-sm font-medium text-slate-700 mb-1 block">Brand Tone</label>
                <div className="relative">
                  <select
                    id="tone"
                    value={tone}
                    onChange={e => setTone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-slate-900 text-sm appearance-none bg-white"
                  >
                    {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <Sparkles className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
              {isConnected && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {isDisconnecting ? 'Disconnecting…' : 'Disconnect LinkedIn'}
                </button>
              )}
              <button
                type="submit"
                disabled={!isConnected || isPending || charCount === 0}
                className={`ml-auto inline-flex items-center gap-2 font-semibold py-2.5 px-6 rounded-lg shadow-sm transition-all text-sm ${
                  isConnected && charCount > 0
                    ? 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isPending ? 'Posting…' : 'Post to LinkedIn'}
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview */}
        <div className="flex flex-col">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Live Preview</p>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm font-sans overflow-hidden max-w-md w-full mx-auto lg:mx-0">
            {/* profile */}
            <div className="p-4 flex items-start gap-3">
              {userPicture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userPicture} alt={userName} className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-slate-200" />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-slate-300 to-slate-400 rounded-full flex-shrink-0" />
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900">{userName}</p>
                <p className="text-xs text-slate-500">Just now · 🌐</p>
              </div>
            </div>

            {/* content */}
            <div className="px-4 pb-3">
              {body ? (
                <p className="text-sm text-slate-900 whitespace-pre-wrap leading-relaxed">{body}</p>
              ) : (
                <p className="text-sm text-slate-300 italic">Your post content will appear here as you type or generate…</p>
              )}
              {displayHashtags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {displayHashtags.map((tag, i) => (
                    <span key={i} className="text-sm text-blue-600 font-semibold">#{tag}</span>
                  ))}
                </div>
              )}
            </div>

            {/* image */}
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreview} alt="Post" className="w-full max-h-64 object-cover border-t border-slate-100" />
            ) : (
              <div className="w-full h-40 bg-slate-50 border-t border-slate-100 flex items-center justify-center">
                <ImagePlus className="w-7 h-7 text-slate-200" />
              </div>
            )}

            {/* reactions */}
            <div className="p-3 border-t border-slate-100 flex gap-5 text-xs font-semibold text-slate-500">
              <span>👍 Like</span>
              <span>💬 Comment</span>
              <span>🔁 Repost</span>
              <span>📤 Send</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
