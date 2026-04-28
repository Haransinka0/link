'use client'

import {
  addDays, addMonths, endOfMonth, endOfWeek, format,
  isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths, subDays,
  isToday as isDateToday
} from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { 
  ChevronLeft, ChevronRight, X, Calendar, Clock, CheckCircle2, 
  AlertCircle, Zap, Send, FileText, Eye, MoreHorizontal, Edit
} from 'lucide-react'
import LinkedInPostCard from '@/components/LinkedInPostCard'

type TemplateRow = {
  id: string
  title: string
  body: string
  status: string
  scheduled_at: string | null
  published_at: string | null
  image_url: string | null
  hashtags: string[] | null
  project?: { name: string } | null
}

type ViewMode = 'month' | 'week'

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function processBody(body: string) {
  return body
    ?.replace(/\[Alt:\s*.*?\]/gi, '')
    ?.replace(/\[Overlay:\s*.*?\]/gi, '')
    ?.replace(/::.*::/g, '')
    ?.trim() || ''
}

function toDatetimeLocalValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface CalendarEvent extends TemplateRow {
  at: Date
}

export default function CalendarPage() {
  const [mode, setMode] = useState<ViewMode>('month')
  const [cursor, setCursor] = useState(() => new Date())
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [selected, setSelected] = useState<TemplateRow | null>(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleDay, setScheduleDay] = useState<Date | null>(null)
  const [scheduleTemplateId, setScheduleTemplateId] = useState('')
  const [scheduleLocal, setScheduleLocal] = useState('')
  const [loading, setLoading] = useState(true)
  const [previewTemplate, setPreviewTemplate] = useState<TemplateRow | null>(null)
  const [selectedDayView, setSelectedDayView] = useState<Date | null>(null)

  async function refresh() {
    try {
      const res = await fetch('/api/templates', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load')
      setTemplates(json.templates || [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  const drafts = useMemo(() => templates.filter(t => t.status === 'draft'), [templates])
  const pendingReview = useMemo(() => templates.filter(t => t.status === 'pending_review'), [templates])
  const approved = useMemo(() => templates.filter(t => t.status === 'approved'), [templates])
  const scheduled = useMemo(() => templates.filter(t => t.status === 'scheduled'), [templates])
  const published = useMemo(() => templates.filter(t => t.status === 'published'), [templates])
  const rejected = useMemo(() => templates.filter(t => t.status === 'rejected'), [templates])

  const calendarEvents = useMemo(() => {
    return templates
      .filter(t => t.status === 'scheduled' || t.status === 'published' || t.status === 'failed')
      .map(t => {
        const at = t.status === 'published' ? t.published_at : t.scheduled_at
        return { ...t, at: at ? new Date(at) : null }
      })
      .filter((e): e is CalendarEvent => e.at !== null)
      .sort((a, b) => a.at.getTime() - b.at.getTime())
  }, [templates])

  const allTemplatesGrouped = useMemo(() => {
    return templates.map(t => {
      if (t.status === 'scheduled' || t.status === 'published') {
        const at = t.status === 'published' ? t.published_at : t.scheduled_at
        return { ...t, at: at ? new Date(at) : null }
      }
      return { ...t, at: null }
    }).filter((e): e is CalendarEvent => e.at !== null)
  }, [templates])

  const groupedByStatus = useMemo(() => ({
    draft: drafts.length,
    pending: pendingReview.length,
    approved: approved.length,
    scheduled: scheduled.length,
    published: published.length,
    rejected: rejected.length,
  }), [drafts, pendingReview, approved, scheduled, published, rejected])

  function openSchedule(day: Date) {
    const d = new Date(day)
    d.setHours(9, 0, 0, 0)
    setScheduleDay(day)
    setScheduleTemplateId(approved[0]?.id ?? '')
    setScheduleLocal(toDatetimeLocalValue(d))
    setScheduleOpen(true)
  }

  function openDayView(day: Date) {
    setSelectedDayView(day)
    setSelected(null)
  }

  async function schedulePost() {
    if (!scheduleDay || !scheduleTemplateId || !scheduleLocal) return
    try {
      const res = await fetch('/api/scheduler', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'schedule', templateId: scheduleTemplateId, scheduledAt: scheduleLocal }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Schedule failed')
      toast.success('Post scheduled successfully!')
      setScheduleOpen(false)
      setScheduleDay(null)
      setScheduleTemplateId('')
      setScheduleLocal('')
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Schedule failed')
    }
  }

  async function cancelScheduled(templateId: string) {
    try {
      const res = await fetch('/api/scheduler', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', templateId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Cancel failed')
      toast.success('Schedule cancelled')
      setSelected(null)
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Cancel failed')
    }
  }

  const range = useMemo(() => {
    if (mode === 'week') {
      return {
        start: startOfWeek(cursor, { weekStartsOn: 1 }),
        end: endOfWeek(cursor, { weekStartsOn: 1 }),
      }
    }
    return {
      start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
    }
  }, [cursor, mode])

  const days = useMemo(() => {
    const out: Date[] = []
    let d = range.start
    while (d <= range.end) { out.push(d); d = addDays(d, 1) }
    return out
  }, [range])

  const title = useMemo(() => {
    if (mode === 'week') return `${format(range.start, 'MMM d')} – ${format(range.end, 'MMM d, yyyy')}`
    return format(cursor, 'MMMM yyyy')
  }, [cursor, mode, range])

  const getEventsForDay = (day: Date) => allTemplatesGrouped.filter(e => isSameDay(e.at, day))
  const selectedTemplateForPreview = previewTemplate || (scheduleTemplateId ? templates.find(t => t.id === scheduleTemplateId) : null)

  const dayViewEvents = selectedDayView ? getEventsForDay(selectedDayView) : []

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%', minHeight: '80vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>Content Calendar</h1>
          <p className="page-sub">Plan, schedule, and track your entire LinkedIn content pipeline.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', background: 'var(--li-bg)', borderRadius: 8, padding: 3, gap: 2 }}>
            {(['month', 'week'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setMode(v)}
                style={{
                  padding: '8px 20px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, transition: 'all .15s',
                  background: mode === v ? 'var(--li-card)' : 'transparent',
                  color: mode === v ? 'var(--li-text)' : 'var(--li-text-secondary)',
                  boxShadow: mode === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          <button onClick={() => setCursor(new Date())} className="btn btn-secondary" style={{ fontSize: 13, padding: '8px 16px' }}>
            Today
          </button>

          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => setCursor(mode === 'week' ? subDays(cursor, 7) : subMonths(cursor, 1))}
              style={{
                width: 36, height: 36, borderRadius: 6, border: '1px solid var(--li-border)',
                background: 'var(--li-card)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--li-text-secondary)',
              }}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setCursor(mode === 'week' ? addDays(cursor, 7) : addMonths(cursor, 1))}
              style={{
                width: 36, height: 36, borderRadius: 6, border: '1px solid var(--li-border)',
                background: 'var(--li-card)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--li-text-secondary)',
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
        {[
          { label: 'Drafts', value: groupedByStatus.draft, color: '#666', bg: '#f3f2ef', icon: FileText },
          { label: 'Pending', value: groupedByStatus.pending, color: '#f5a623', bg: '#fef3cd', icon: Clock },
          { label: 'Approved', value: groupedByStatus.approved, color: 'var(--li-green)', bg: '#e6f7ef', icon: CheckCircle2 },
          { label: 'Scheduled', value: groupedByStatus.scheduled, color: 'var(--li-blue)', bg: '#e6f2ff', icon: Zap },
          { label: 'Published', value: groupedByStatus.published, color: '#7c3aed', bg: '#f3e8ff', icon: Send },
          { label: 'Rejected', value: groupedByStatus.rejected, color: 'var(--li-red)', bg: '#fce8e8', icon: X },
        ].map(s => (
          <div key={s.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon size={18} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--li-text)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--li-text-secondary)', marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedDayView ? '1fr 400px' : '1fr', gap: 16, alignItems: 'start' }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--li-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{title}</span>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--li-text-secondary)', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f5a623' }} /> Pending</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--li-blue)' }} /> Scheduled</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--li-green)' }} /> Published</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--li-red)' }} /> Failed</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--li-border)' }}>
            {DAY_HEADERS.map(d => (
              <div key={d} style={{ padding: '12px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--li-text-secondary)', textTransform: 'uppercase', background: 'var(--li-card)' }}>
                {d}
              </div>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: 80, textAlign: 'center', color: 'var(--li-text-secondary)', fontSize: 14 }}>
              Loading calendar…
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {days.map((day, idx) => {
                const dayEvents = getEventsForDay(day)
                const isCurrentMonth = isSameMonth(day, cursor)
                const isToday = isDateToday(day)
                const isSelected = selectedDayView && isSameDay(day, selectedDayView)

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => openDayView(day)}
                    style={{
                      minHeight: mode === 'month' ? 140 : 180,
                      padding: '10px',
                      background: isToday ? '#f0f7ff' : isSelected ? '#e6f2ff' : 'var(--li-card)',
                      cursor: 'pointer',
                      position: 'relative',
                      borderRight: (idx + 1) % 7 !== 0 ? '1px solid var(--li-border)' : 'none',
                      borderBottom: idx < days.length - 7 ? '1px solid var(--li-border)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 600,
                        background: isToday ? 'var(--li-blue)' : 'transparent',
                        color: isToday ? '#fff' : !isCurrentMonth ? '#ccc' : 'var(--li-text)',
                      }}>
                        {format(day, 'd')}
                      </div>
                      {dayEvents.length > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--li-text-secondary)', fontWeight: 600 }}>{dayEvents.length}</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {dayEvents.slice(0, 4).map(ev => (
                        <div
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); setSelected(ev) }}
                          style={{
                            padding: '4px 6px',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 600,
                            background: ev.status === 'scheduled' ? '#e6f2ff' : ev.status === 'published' ? '#e6f7ef' : ev.status === 'pending_review' ? '#fef3cd' : '#fce8e8',
                            color: ev.status === 'scheduled' ? 'var(--li-blue)' : ev.status === 'published' ? 'var(--li-green)' : ev.status === 'pending_review' ? '#f5a623' : 'var(--li-red)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            cursor: 'pointer',
                          }}
                        >
                          {ev.at ? format(ev.at, 'HH:mm') : ''} {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 4 && (
                        <div style={{ fontSize: 10, color: 'var(--li-text-secondary)', paddingLeft: 4, fontWeight: 500 }}>
                          +{dayEvents.length - 4} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {selectedDayView && (
          <div className="card" style={{ maxHeight: '70vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--li-border)' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{format(selectedDayView, 'EEEE, MMMM d, yyyy')}</div>
                <div style={{ fontSize: 12, color: 'var(--li-text-secondary)', marginTop: 2 }}>{dayViewEvents.length} posts</div>
              </div>
              <button onClick={() => setSelectedDayView(null)} className="btn btn-ghost btn-icon">
                <X size={18} />
              </button>
            </div>

            <button onClick={() => openSchedule(selectedDayView)} className="btn btn-primary" style={{ width: '100%', marginBottom: 16 }}>
              <Zap size={16} /> Schedule New Post
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {dayViewEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--li-text-secondary)' }}>
                  <Calendar size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <p>No posts scheduled for this day</p>
                </div>
              ) : (
                dayViewEvents.map(ev => (
                  <div
                    key={ev.id}
                    onClick={() => setSelected(ev)}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      border: '1px solid var(--li-border)',
                      cursor: 'pointer',
                      background: selected?.id === ev.id ? '#f0f7ff' : 'var(--li-bg)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{ev.title}</span>
                      <span style={{ 
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                        background: ev.status === 'scheduled' ? '#e6f2ff' : ev.status === 'published' ? '#e6f7ef' : '#fce8e8',
                        color: ev.status === 'scheduled' ? 'var(--li-blue)' : ev.status === 'published' ? 'var(--li-green)' : 'var(--li-red)',
                      }}>
                        {ev.status === 'scheduled' ? format(ev.at!, 'HH:mm') : ev.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--li-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {processBody(ev.body).slice(0, 80)}...
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {selected && (
        <div className="modal-overlay" onMouseDown={() => setSelected(null)}>
          <div className="modal" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{selected.title}</div>
                <div style={{ marginTop: 6 }}>
                  {selected.status === 'scheduled' && <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: '#e6f2ff', color: 'var(--li-blue)' }}>Scheduled</span>}
                  {selected.status === 'published' && <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: '#e6f7ef', color: 'var(--li-green)' }}>Published</span>}
                  {selected.status === 'pending_review' && <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: '#fef3cd', color: '#f5a623' }}>Pending Review</span>}
                  {selected.status === 'failed' && <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: '#fce8e8', color: 'var(--li-red)' }}>Failed</span>}
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelected(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <LinkedInPostCard
                authorName="Team Member"
                authorHeadline="LinkedIn Member"
                body={processBody(selected.body)}
                hashtags={selected.hashtags}
                imageUrl={selected.image_url}
                timeAgo={selected.status === 'published' && selected.published_at ? format(new Date(selected.published_at), 'MMM d') : selected.scheduled_at ? format(new Date(selected.scheduled_at), 'MMM d') : 'Scheduled'}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ padding: '12px', background: 'var(--li-bg)', borderRadius: 8, border: '1px solid var(--li-border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--li-text-secondary)', marginBottom: 4, textTransform: 'uppercase' }}>Scheduled</div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {selected.scheduled_at ? format(new Date(selected.scheduled_at), 'MMM d, yyyy • HH:mm (12h a)') : '—'}
                  </div>
                </div>
                <div style={{ padding: '12px', background: 'var(--li-bg)', borderRadius: 8, border: '1px solid var(--li-border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--li-text-secondary)', marginBottom: 4, textTransform: 'uppercase' }}>Published</div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {selected.published_at ? format(new Date(selected.published_at), 'MMM d, yyyy • HH:mm (12h a)') : '—'}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              {selected.status === 'scheduled' && (
                <button className="btn btn-danger" onClick={() => void cancelScheduled(selected.id)}>
                  Cancel Schedule
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {scheduleOpen && (
        <div className="modal-overlay" onMouseDown={() => setScheduleOpen(false)}>
          <div className="modal" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Schedule Post</div>
                <div style={{ marginTop: 4, fontSize: 13, color: 'var(--li-text-secondary)' }}>
                  <Calendar size={13} style={{ display: 'inline', marginRight: 5 }} />
                  {scheduleDay ? format(scheduleDay, 'EEEE, MMMM d, yyyy') : ''}
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setScheduleOpen(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {selectedTemplateForPreview && (
                <div style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--li-text-secondary)', marginBottom: 8 }}>Post Preview</div>
                  <LinkedInPostCard
                    authorName="Team Member"
                    authorHeadline="LinkedIn Member"
                    body={processBody(selectedTemplateForPreview.body)}
                    hashtags={selectedTemplateForPreview.hashtags}
                    imageUrl={selectedTemplateForPreview.image_url}
                    timeAgo="Just now"
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Select Template</label>
                <select
                  className="form-select"
                  value={scheduleTemplateId}
                  onChange={e => { setScheduleTemplateId(e.target.value); setPreviewTemplate(templates.find(t => t.id === e.target.value) || null) }}
                  disabled={approved.length === 0}
                >
                  {approved.length === 0 ? (
                    <option value="">No approved templates</option>
                  ) : (
                    approved.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))
                  )}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 2 }}>
                  <label className="form-label">Date</label>
                  <input
                    className="form-input"
                    type="date"
                    value={scheduleLocal.split('T')[0] || ''}
                    onChange={e => setScheduleLocal(`${e.target.value}T${scheduleLocal.split('T')[1] || '09:00'}`)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Hour (24h)</label>
                  <select
                    className="form-select"
                    value={scheduleLocal.split('T')[1]?.split(':')[0] || '09'}
                    onChange={e => setScheduleLocal(`${scheduleLocal.split('T')[0]}T${e.target.value}:${scheduleLocal.split('T')[1]?.split(':')[1] || '00'}`)}
                  >
                    {Array.from({ length: 24 }).map((_, i) => (
                      <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')} ({i === 0 ? '12AM' : i < 12 ? i + 'AM' : i === 12 ? '12PM' : i - 12 + 'PM'})</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Minute</label>
                  <select
                    className="form-select"
                    value={scheduleLocal.split('T')[1]?.split(':')[1] || '00'}
                    onChange={e => setScheduleLocal(`${scheduleLocal.split('T')[0]}T${scheduleLocal.split('T')[1]?.split(':')[0] || '09'}:${e.target.value}`)}
                  >
                    {Array.from({ length: 12 }).map((_, i) => (
                      <option key={i} value={String(i * 5).padStart(2, '0')}>{String(i * 5).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ fontSize: 12, background: '#e6f2ff', color: 'var(--li-blue)', padding: '12px 14px', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <Clock size={14} />
                Time shown in 24-hour format. Posts publish automatically at the scheduled time.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setScheduleOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => void schedulePost()} disabled={!scheduleTemplateId}>
                <Zap size={14} /> Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}