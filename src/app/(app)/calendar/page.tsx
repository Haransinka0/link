'use client'

import {
  addDays, addMonths, endOfMonth, endOfWeek, format,
  isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths, subDays
} from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, X, Calendar, Clock, CheckCircle2, AlertCircle, Zap } from 'lucide-react'

type TemplateRow = {
  id: string
  title: string
  body: string
  status: string
  scheduled_at: string | null
  published_at: string | null
}

type ViewMode = 'month' | 'week'

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function toDatetimeLocalValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function EventPill({ status, title, onClick }: { status: string; title: string; onClick: (e: React.MouseEvent) => void }) {
  const styles: Record<string, { bg: string; text: string; dot: string }> = {
    scheduled:  { bg: 'rgba(59,130,246,0.12)',  text: '#1d4ed8', dot: '#3B82F6' },
    published:  { bg: 'rgba(34,197,94,0.12)',   text: '#166534', dot: '#22C55E' },
    failed:     { bg: 'rgba(239,68,68,0.12)',   text: '#991b1b', dot: '#EF4444' },
  }
  const s = styles[status] || { bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' }
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: s.bg, color: s.text,
        border: 'none', borderRadius: 5,
        padding: '3px 7px', fontSize: 11, fontWeight: 600,
        cursor: 'pointer', textAlign: 'left', width: '100%',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
    </button>
  )
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

  const approvedTemplates = useMemo(
    () => templates.filter(t => t.status === 'approved'),
    [templates]
  )

  const events = useMemo(() => {
    return templates
      .filter(t => t.status === 'scheduled' || t.status === 'published' || t.status === 'failed')
      .map(t => {
        const at = t.status === 'published' ? t.published_at : t.scheduled_at
        return { ...t, at: at ? new Date(at) : null }
      })
      .filter(e => e.at)
      .sort((a, b) => a.at!.getTime() - b.at!.getTime())
  }, [templates])

  function openSchedule(day: Date) {
    const d = new Date(day)
    d.setHours(9, 0, 0, 0)
    setScheduleDay(day)
    setScheduleTemplateId(approvedTemplates[0]?.id ?? '')
    setScheduleLocal(toDatetimeLocalValue(d))
    setScheduleOpen(true)
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
      toast.success('✅ Post scheduled successfully!')
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

  const totalScheduled = templates.filter(t => t.status === 'scheduled').length
  const totalPublished = templates.filter(t => t.status === 'published').length
  const totalApproved  = approvedTemplates.length

  return (
    <div className="animate-in pb-8" style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>Content Calendar</h1>
          <p className="page-sub">Schedule and track your LinkedIn posts across time.</p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Month/Week toggle */}
          <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 10, padding: 3, gap: 2 }}>
            {(['month', 'week'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setMode(v)}
                style={{
                  padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, transition: 'all .15s',
                  background: mode === v ? 'var(--color-bg)' : 'transparent',
                  color: mode === v ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  boxShadow: mode === v ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          {/* Today button */}
          <button
            onClick={() => setCursor(new Date())}
            style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--color-bg)', color: 'var(--color-text-secondary)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Today
          </button>

          {/* Prev/Next arrows */}
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { dir: -1, label: 'Previous', icon: <ChevronLeft size={16} /> },
              { dir: 1,  label: 'Next',     icon: <ChevronRight size={16} /> },
            ].map(({ dir, label, icon }) => (
              <button
                key={label}
                aria-label={label}
                onClick={() => setCursor(
                  mode === 'week'
                    ? (dir === -1 ? subDays(cursor, 7) : addDays(cursor, 7))
                    : (dir === -1 ? subMonths(cursor, 1) : addMonths(cursor, 1))
                )}
                style={{
                  width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--color-bg)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Approved & Ready',  value: totalApproved,  icon: <CheckCircle2 size={16} />, color: '#22C55E', bg: '#F0FDF4' },
          { label: 'Scheduled Posts',   value: totalScheduled, icon: <Clock size={16} />,         color: '#3B82F6', bg: '#EFF6FF' },
          { label: 'Posts Published',   value: totalPublished, icon: <Zap size={16} />,           color: '#8B5CF6', bg: '#F5F3FF' },
        ].map(s => (
          <div key={s.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Calendar + Sidebar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 260px', gap: 16, alignItems: 'start' }}>

        {/* Calendar card */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Calendar header */}
          <div style={{
            padding: '18px 24px', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 17, fontWeight: 800 }}>{title}</span>
            <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--color-text-secondary)', alignItems: 'center' }}>
              {[
                { label: 'Scheduled', color: '#3B82F6' },
                { label: 'Published', color: '#22C55E' },
                { label: 'Failed',    color: '#EF4444' },
              ].map(l => (
                <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, display: 'inline-block' }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
            {DAY_HEADERS.map(d => (
              <div key={d} style={{
                padding: '10px 0', textAlign: 'center',
                fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)',
                letterSpacing: '.06em', textTransform: 'uppercase',
              }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
              Loading calendar…
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {days.map((day, idx) => {
                const dayEvents = events.filter(e => isSameDay(e.at!, day))
                const faded = mode === 'month' && !isSameMonth(day, cursor)
                const isToday = isSameDay(day, new Date())
                const isWeekend = day.getDay() === 0 || day.getDay() === 6
                const borderRight = (idx + 1) % 7 !== 0
                const borderBottom = idx < days.length - 7

                return (
                  <div
                    key={day.toISOString()}
                    role="button"
                    tabIndex={0}
                    onClick={() => openSchedule(day)}
                    onKeyDown={e => e.key === 'Enter' && openSchedule(day)}
                    style={{
                      minHeight: mode === 'month' ? 110 : 140,
                      padding: '8px 10px',
                      borderRight: borderRight ? '1px solid var(--border)' : 'none',
                      borderBottom: borderBottom ? '1px solid var(--border)' : 'none',
                      background: isToday
                        ? 'rgba(59,130,246,0.04)'
                        : faded
                          ? 'rgba(0,0,0,0.015)'
                          : isWeekend
                            ? 'rgba(0,0,0,0.008)'
                            : 'transparent',
                      cursor: 'pointer',
                      transition: 'background .1s',
                      position: 'relative',
                    }}
                    onMouseEnter={e => { if (!isToday) (e.currentTarget as HTMLDivElement).style.background = 'rgba(59,130,246,0.04)' }}
                    onMouseLeave={e => {
                      if (isToday) return
                      const base = faded ? 'rgba(0,0,0,0.015)' : isWeekend ? 'rgba(0,0,0,0.008)' : 'transparent';
                      (e.currentTarget as HTMLDivElement).style.background = base
                    }}
                  >
                    {/* Date number */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: isToday ? 800 : 600,
                        background: isToday ? '#3B82F6' : 'transparent',
                        color: isToday ? '#fff' : faded ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                      }}>
                        {format(day, 'd')}
                      </div>
                      {dayEvents.length > 0 && !isToday && (
                        <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>{dayEvents.length}</span>
                      )}
                    </div>

                    {/* Events */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {dayEvents.slice(0, 3).map(ev => (
                        <EventPill
                          key={ev.id}
                          status={ev.status}
                          title={ev.title}
                          onClick={e => { e.stopPropagation(); setSelected(ev) }}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', paddingLeft: 4, fontWeight: 600 }}>
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Approved templates */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={14} style={{ color: '#22C55E' }} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>Ready to Schedule</span>
            </div>
            <div style={{ padding: 12 }}>
              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: '0 0 10px' }}>
                Click any date to schedule these approved posts.
              </p>
              {approvedTemplates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--color-text-tertiary)' }}>
                  <AlertCircle size={22} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <p style={{ fontSize: 12 }}>No approved posts yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {approvedTemplates.map(t => (
                    <div key={t.id} style={{
                      padding: '10px 12px', borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--surface-2)',
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 3 }}>{t.title}</div>
                      <div style={{
                        fontSize: 11, color: 'var(--color-text-tertiary)',
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>
                        {t.body.replace(/::.*::/g, '').trim()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Upcoming */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={14} style={{ color: '#3B82F6' }} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>Upcoming</span>
            </div>
            <div style={{ padding: 12 }}>
              {events.filter(e => e.status === 'scheduled').length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '12px 0' }}>
                  No scheduled posts.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {events.filter(e => e.status === 'scheduled').slice(0, 5).map(ev => (
                    <div
                      key={ev.id}
                      onClick={() => setSelected(ev)}
                      role="button"
                      tabIndex={0}
                      style={{
                        display: 'flex', gap: 10, alignItems: 'flex-start',
                        padding: '8px 10px', borderRadius: 8,
                        border: '1px solid var(--border)', cursor: 'pointer',
                        background: 'var(--surface-2)',
                      }}
                    >
                      <div style={{ width: 3, height: 28, borderRadius: 2, background: '#3B82F6', flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>{ev.title}</div>
                        <div style={{ fontSize: 10, color: '#3B82F6', marginTop: 2, fontWeight: 600 }}>
                          {ev.at ? format(ev.at, 'MMM d, h:mm a') : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── View post modal ── */}
      {selected && (
        <div className="modal-overlay" onMouseDown={() => setSelected(null)}>
          <div className="modal" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{selected.title}</div>
                <div style={{ marginTop: 6 }}>
                  {[
                    { s: 'scheduled', label: 'Scheduled', color: '#3B82F6', bg: '#EFF6FF' },
                    { s: 'published', label: 'Published',  color: '#16A34A', bg: '#F0FDF4' },
                    { s: 'failed',    label: 'Failed',     color: '#DC2626', bg: '#FEF2F2' },
                  ].map(m => selected.status === m.s ? (
                    <span key={m.s} style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: m.bg, color: m.color }}>
                      {m.label}
                    </span>
                  ) : null)}
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelected(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, color: '#475569', whiteSpace: 'pre-wrap', padding: 16, background: '#F8FAFC', borderRadius: 10, lineHeight: 1.6, border: '1px solid var(--border)' }}>
                {selected.body
                  ?.replace(/\[Alt:\s*.*?\]/gi, '')
                  ?.replace(/\[Overlay:\s*.*?\]/gi, '')
                  ?.replace(/::.*::/g, '')
                  ?.trim()}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>Scheduled</div>
                  <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: 13 }}>
                    {selected.scheduled_at ? format(new Date(selected.scheduled_at), 'MMM d, yyyy · h:mm a') : '—'}
                  </div>
                </div>
                <div style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>Published</div>
                  <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: 13 }}>
                    {selected.published_at ? format(new Date(selected.published_at), 'MMM d, yyyy · h:mm a') : '—'}
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

      {/* ── Schedule modal ── */}
      {scheduleOpen && (
        <div className="modal-overlay" onMouseDown={() => setScheduleOpen(false)}>
          <div className="modal" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Schedule Post</div>
                <div style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  <Calendar size={13} style={{ display: 'inline', marginRight: 5 }} />
                  {scheduleDay ? format(scheduleDay, 'EEEE, MMMM d, yyyy') : ''}
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setScheduleOpen(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Select Template</label>
                <select
                  className="form-select"
                  value={scheduleTemplateId}
                  onChange={e => setScheduleTemplateId(e.target.value)}
                  disabled={approvedTemplates.length === 0}
                >
                  {approvedTemplates.length === 0 ? (
                    <option value="">No approved templates available</option>
                  ) : (
                    approvedTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))
                  )}
                </select>
              </div>
              <div className="form-group" style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 2 }}>
                  <label className="form-label">Date</label>
                  <input
                    className="form-input"
                    type="date"
                    value={scheduleLocal.split('T')[0] || ''}
                    onChange={e => {
                      const time = scheduleLocal.split('T')[1] || '09:00';
                      setScheduleLocal(`${e.target.value}T${time}`);
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Hour</label>
                  <select
                    className="form-select"
                    value={scheduleLocal.split('T')[1]?.split(':')[0] || '09'}
                    onChange={e => {
                      const date = scheduleLocal.split('T')[0];
                      const minute = scheduleLocal.split('T')[1]?.split(':')[1] || '00';
                      setScheduleLocal(`${date}T${e.target.value}:${minute}`);
                    }}
                  >
                    {Array.from({ length: 24 }).map((_, i) => {
                      const val = String(i).padStart(2, '0');
                      const ampm = i < 12 ? 'AM' : 'PM';
                      const h12 = i % 12 === 0 ? 12 : i % 12;
                      return <option key={val} value={val}>{val} ({h12} {ampm})</option>
                    })}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Minute</label>
                  <select
                    className="form-select"
                    value={scheduleLocal.split('T')[1]?.split(':')[1] || '00'}
                    onChange={e => {
                      const date = scheduleLocal.split('T')[0];
                      const hour = scheduleLocal.split('T')[1]?.split(':')[0] || '09';
                      setScheduleLocal(`${date}T${hour}:${e.target.value}`);
                    }}
                  >
                    {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ fontSize: 12, background: '#EFF6FF', color: '#1D4ED8', padding: '10px 14px', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <Clock size={13} style={{ flexShrink: 0 }} />
                The post will be automatically published at the selected time via the scheduler (restricted to 5-minute intervals).
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setScheduleOpen(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => void schedulePost()}
                disabled={!scheduleTemplateId || !scheduleLocal || approvedTemplates.length === 0}
              >
                <Zap size={14} /> Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
