'use client'

import { eachDayOfInterval, format, startOfDay, subDays } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { FileText, Clock, CheckCircle, XCircle, Zap, Send, Calendar, AlertCircle } from 'lucide-react'

type TemplateRow = {
  id: string
  title: string
  body: string
  status: string
  scheduled_at: string | null
  published_at: string | null
  rejection_reason: string | null
  updated_at: string
  image_url: string | null
  hashtags: string[] | null
}

function processBody(body: string) {
  return body
    ?.replace(/\[Alt:\s*.*?\]/gi, '')
    ?.replace(/\[Overlay:\s*.*?\]/gi, '')
    ?.replace(/::.*::/g, '')
    ?.trim() || ''
}

const COLORS = ['#0a66c2', '#057642', '#f5a623', '#cc1016', '#7c3aed', '#666666']

export default function AnalyticsPage() {
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateRow | null>(null)
  const [viewPeriod, setViewPeriod] = useState<'7' | '30'>('7')

  async function refresh() {
    try {
      const res = await fetch('/api/templates', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load')
      setTemplates(json.templates || [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load')
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const statusCounts = useMemo(() => ({
    draft: templates.filter(t => t.status === 'draft').length,
    pending: templates.filter(t => t.status === 'pending_review').length,
    approved: templates.filter(t => t.status === 'approved').length,
    scheduled: templates.filter(t => t.status === 'scheduled').length,
    published: templates.filter(t => t.status === 'published').length,
    failed: templates.filter(t => t.status === 'failed').length,
    rejected: templates.filter(t => t.status === 'rejected').length,
  }), [templates])

  const total = templates.length

  const pieData = useMemo(() => [
    { name: 'Draft', value: statusCounts.draft, color: '#666666' },
    { name: 'Pending', value: statusCounts.pending, color: '#f5a623' },
    { name: 'Approved', value: statusCounts.approved, color: '#057642' },
    { name: 'Scheduled', value: statusCounts.scheduled, color: '#0a66c2' },
    { name: 'Published', value: statusCounts.published, color: '#7c3aed' },
    { name: 'Failed', value: statusCounts.failed + statusCounts.rejected, color: '#cc1016' },
  ].filter(d => d.value > 0), [statusCounts])

  const dailyData = useMemo(() => {
    const daysCount = parseInt(viewPeriod)
    const end = startOfDay(new Date())
    const start = startOfDay(subDays(end, daysCount - 1))
    const days = eachDayOfInterval({ start, end })

    const scheduledCounts = new Map<string, number>()
    const publishedCounts = new Map<string, number>()
    
    for (const d of days) {
      const key = format(d, 'yyyy-MM-dd')
      scheduledCounts.set(key, 0)
      publishedCounts.set(key, 0)
    }

    templates.forEach(t => {
      const date = t.scheduled_at || t.published_at
      if (!date) return
      const key = format(startOfDay(new Date(date)), 'yyyy-MM-dd')
      if (t.status === 'scheduled' && scheduledCounts.has(key)) {
        scheduledCounts.set(key, (scheduledCounts.get(key) || 0) + 1)
      }
      if (t.status === 'published' && publishedCounts.has(key)) {
        publishedCounts.set(key, (publishedCounts.get(key) || 0) + 1)
      }
    })

    return days.map(d => {
      const key = format(d, 'yyyy-MM-dd')
      return {
        date: format(d, 'MMM d'),
        scheduled: scheduledCounts.get(key) || 0,
        published: publishedCounts.get(key) || 0,
      }
    })
  }, [templates, viewPeriod])

  const topTemplates = useMemo(() => {
    return templates
      .filter(t => t.status === 'published' || t.status === 'scheduled')
      .sort((a, b) => {
        const dateA = a.published_at || a.scheduled_at || ''
        const dateB = b.published_at || b.scheduled_at || ''
        return new Date(dateB).getTime() - new Date(dateA).getTime()
      })
      .slice(0, 10)
  }, [templates])

  return (
    <div className="animate-in pb-12">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-sub">Complete overview of your LinkedIn content pipeline and performance.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            onClick={() => setViewPeriod('7')}
            style={{
              padding: '8px 16px', borderRadius: 6, border: '1px solid var(--li-border)',
              background: viewPeriod === '7' ? 'var(--li-blue)' : 'var(--li-card)',
              color: viewPeriod === '7' ? '#fff' : 'var(--li-text)',
              cursor: 'pointer', fontWeight: 600, fontSize: 13,
            }}
          >
            7 Days
          </button>
          <button 
            onClick={() => setViewPeriod('30')}
            style={{
              padding: '8px 16px', borderRadius: 6, border: '1px solid var(--li-border)',
              background: viewPeriod === '30' ? 'var(--li-blue)' : 'var(--li-card)',
              color: viewPeriod === '30' ? '#fff' : 'var(--li-text)',
              cursor: 'pointer', fontWeight: 600, fontSize: 13,
            }}
          >
            30 Days
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Drafts', value: statusCounts.draft, color: '#666', bg: '#f3f2ef', icon: FileText },
          { label: 'Pending', value: statusCounts.pending, color: '#f5a623', bg: '#fef3cd', icon: Clock },
          { label: 'Approved', value: statusCounts.approved, color: '#057642', bg: '#e6f7ef', icon: CheckCircle },
          { label: 'Scheduled', value: statusCounts.scheduled, color: '#0a66c2', bg: '#e6f2ff', icon: Zap },
          { label: 'Published', value: statusCounts.published, color: '#7c3aed', bg: '#f3e8ff', icon: Send },
          { label: 'Failed', value: statusCounts.failed, color: '#cc1016', bg: '#fce8e8', icon: XCircle },
          { label: 'Rejected', value: statusCounts.rejected, color: '#cc1016', bg: '#fce8e8', icon: AlertCircle },
        ].map(s => (
          <div key={s.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon size={16} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--li-text)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--li-text-secondary)', marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Status Distribution</h3>
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: 'var(--li-text-secondary)' }}>No data available</div>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12, justifyContent: 'center' }}>
            {pieData.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color }} />
                <span>{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Timeline ({viewPeriod} days)</h3>
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={dailyData} margin={{ left: 4, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip />
                <Bar dataKey="scheduled" name="Scheduled" fill="#0a66c2" radius={[4, 4, 0, 0]} />
                <Bar dataKey="published" name="Published" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8, fontSize: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#0a66c2', borderRadius: 2 }} /> Scheduled</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#7c3aed', borderRadius: 2 }} /> Published</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Recent Posts Timeline</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {topTemplates.map(t => (
            <div 
              key={t.id}
              onClick={() => setSelectedTemplate(t)}
              style={{
                padding: 12,
                borderRadius: 8,
                border: '1px solid var(--li-border)',
                cursor: 'pointer',
                transition: 'all .15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</span>
                <span style={{ 
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                  background: t.status === 'published' ? '#f3e8ff' : t.status === 'scheduled' ? '#e6f2ff' : '#fce8e8',
                  color: t.status === 'published' ? '#7c3aed' : t.status === 'scheduled' ? '#0a66c2' : '#cc1016',
                }}>
                  {t.status}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--li-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {processBody(t.body).slice(0, 50)}...
              </div>
              <div style={{ fontSize: 10, color: 'var(--li-text-secondary)', marginTop: 6 }}>
                {t.published_at ? format(new Date(t.published_at), 'MMM d, yyyy HH:mm') : t.scheduled_at ? format(new Date(t.scheduled_at), 'MMM d, yyyy HH:mm') : format(new Date(t.updated_at), 'MMM d, yyyy HH:mm')}
              </div>
            </div>
          ))}
          {topTemplates.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 32, color: 'var(--li-text-secondary)' }}>
              No scheduled or published posts yet.
            </div>
          )}
        </div>
      </div>

      {selectedTemplate && (
        <div className="modal-overlay" onMouseDown={() => setSelectedTemplate(null)}>
          <div className="modal" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{selectedTemplate.title}</div>
                <div style={{ marginTop: 6 }}>
                  <span style={{ 
                    fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999,
                    background: selectedTemplate.status === 'published' ? '#f3e8ff' : selectedTemplate.status === 'scheduled' ? '#e6f2ff' : '#fce8e8',
                    color: selectedTemplate.status === 'published' ? '#7c3aed' : selectedTemplate.status === 'scheduled' ? '#0a66c2' : '#cc1016',
                  }}>
                    {selectedTemplate.status}
                  </span>
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedTemplate(null)}><XCircle size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <LinkedInPostCard
                authorName="Team Member"
                authorHeadline="LinkedIn Member"
                body={processBody(selectedTemplate.body)}
                hashtags={selectedTemplate.hashtags}
                imageUrl={selectedTemplate.image_url}
                timeAgo={selectedTemplate.status === 'published' && selectedTemplate.published_at 
                  ? format(new Date(selectedTemplate.published_at), 'MMM d') 
                  : selectedTemplate.scheduled_at 
                    ? format(new Date(selectedTemplate.scheduled_at), 'MMM d') 
                    : 'Draft'}
              />
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div style={{ padding: '12px', background: 'var(--li-bg)', borderRadius: 8, border: '1px solid var(--li-border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--li-text-secondary)', marginBottom: 4, textTransform: 'uppercase' }}>Scheduled</div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {selectedTemplate.scheduled_at ? format(new Date(selectedTemplate.scheduled_at), 'MMM d, yyyy HH:mm') : '—'}
                  </div>
                </div>
                <div style={{ padding: '12px', background: 'var(--li-bg)', borderRadius: 8, border: '1px solid var(--li-border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--li-text-secondary)', marginBottom: 4, textTransform: 'uppercase' }}>Published</div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {selectedTemplate.published_at ? format(new Date(selectedTemplate.published_at), 'MMM d, yyyy HH:mm') : '—'}
                  </div>
                </div>
              </div>

              {selectedTemplate.rejection_reason && (
                <div style={{ padding: '12px', background: '#fce8e8', borderRadius: 8, border: '1px solid #fecaca' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#cc1016', marginBottom: 4, textTransform: 'uppercase' }}>Rejection Reason</div>
                  <div style={{ fontSize: 13 }}>{selectedTemplate.rejection_reason}</div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedTemplate(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}