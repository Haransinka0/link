'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { FileText, Clock, CheckCircle, XCircle, Zap, Send, Eye, Edit, Calendar } from 'lucide-react'
import LinkedInPostCard from '@/components/LinkedInPostCard'

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

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
  { value: 'failed', label: 'Failed' },
  { value: 'draft', label: 'Draft' },
] as const

function processBody(body: string) {
  return body
    ?.replace(/\[Alt:\s*.*?\]/gi, '')
    ?.replace(/\[Overlay:\s*.*?\]/gi, '')
    ?.replace(/::.*::/g, '')
    ?.trim() || ''
}

export default function HistoryPage() {
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]['value']>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateRow | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

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

  const rows = useMemo(() => {
    const filtered = status === 'all'
      ? templates
      : templates.filter(t => t.status === status)
    return filtered.slice().sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }, [status, templates])

  const getStatusBadge = (s: string) => {
    const styles: Record<string, { bg: string; color: string; label: string }> = {
      draft: { bg: '#f3f2ef', color: '#666', label: 'Draft' },
      pending_review: { bg: '#fef3cd', color: '#f5a623', label: 'Pending' },
      approved: { bg: '#e6f7ef', color: 'var(--li-green)', label: 'Approved' },
      rejected: { bg: '#fce8e8', color: 'var(--li-red)', label: 'Rejected' },
      scheduled: { bg: '#e6f2ff', color: 'var(--li-blue)', label: 'Scheduled' },
      published: { bg: '#f3e8ff', color: '#7c3aed', label: 'Published' },
      failed: { bg: '#fce8e8', color: 'var(--li-red)', label: 'Failed' },
    }
    const style = styles[s] || styles.draft
    return (
      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: style.bg, color: style.color }}>
        {style.label}
      </span>
    )
  }

  return (
    <div className="animate-in pb-12">
      <div className="page-header">
        <div>
          <h1 className="page-title">History</h1>
          <p className="page-sub">Track all your content from draft to publish with full status history.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            onClick={() => setViewMode('list')}
            style={{
              padding: '8px 12px', borderRadius: 6, border: '1px solid var(--li-border)',
              background: viewMode === 'list' ? 'var(--li-card)' : 'transparent',
              cursor: 'pointer', color: 'var(--li-text-secondary)',
            }}
          >
            <FileText size={16} />
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            style={{
              padding: '8px 12px', borderRadius: 6, border: '1px solid var(--li-border)',
              background: viewMode === 'grid' ? 'var(--li-card)' : 'transparent',
              cursor: 'pointer', color: 'var(--li-text-secondary)',
            }}
          >
            <Eye size={16} />
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <select
          className="filter-select"
          value={status}
          onChange={(e) => setStatus(e.target.value as (typeof STATUS_OPTIONS)[number]['value'])}
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {viewMode === 'list' ? (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Template</th>
                <th>Status</th>
                <th>Scheduled</th>
                <th>Published</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} onClick={() => setSelectedTemplate(r)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--li-text-secondary)', marginTop: 2, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {processBody(r.body).slice(0, 60)}...
                    </div>
                  </td>
                  <td>{getStatusBadge(r.status)}</td>
                  <td style={{ fontSize: 13 }}>
                    {r.scheduled_at ? format(new Date(r.scheduled_at), 'MMM d, HH:mm') : '—'}
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {r.published_at ? format(new Date(r.published_at), 'MMM d, HH:mm') : '—'}
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--li-text-secondary)' }}>
                    {format(new Date(r.updated_at), 'MMM d, yyyy')}
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); setSelectedTemplate(r) }}>
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--li-text-secondary)' }}>
                    No history records found for this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {rows.map(r => (
            <div 
              key={r.id} 
              className="card" 
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedTemplate(r)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{r.title}</div>
                {getStatusBadge(r.status)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--li-text-secondary)', marginBottom: 12, lineHeight: 1.5, minHeight: 40, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {processBody(r.body)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
                <div style={{ padding: '8px', background: 'var(--li-bg)', borderRadius: 6 }}>
                  <div style={{ color: 'var(--li-text-secondary)', marginBottom: 2 }}>Scheduled</div>
                  <div style={{ fontWeight: 600 }}>
                    {r.scheduled_at ? format(new Date(r.scheduled_at), 'MMM d, HH:mm') : '—'}
                  </div>
                </div>
                <div style={{ padding: '8px', background: 'var(--li-bg)', borderRadius: 6 }}>
                  <div style={{ color: 'var(--li-text-secondary)', marginBottom: 2 }}>Published</div>
                  <div style={{ fontWeight: 600 }}>
                    {r.published_at ? format(new Date(r.published_at), 'MMM d, HH:mm') : '—'}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 48, color: 'var(--li-text-secondary)' }}>
              No history records found for this filter.
            </div>
          )}
        </div>
      )}

      {selectedTemplate && (
        <div className="modal-overlay" onMouseDown={() => setSelectedTemplate(null)}>
          <div className="modal" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{selectedTemplate.title}</div>
                <div style={{ marginTop: 6 }}>{getStatusBadge(selectedTemplate.status)}</div>
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
                    {selectedTemplate.scheduled_at ? format(new Date(selectedTemplate.scheduled_at), 'MMM d, yyyy HH:mm (12h a)') : '—'}
                  </div>
                </div>
                <div style={{ padding: '12px', background: 'var(--li-bg)', borderRadius: 8, border: '1px solid var(--li-border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--li-text-secondary)', marginBottom: 4, textTransform: 'uppercase' }}>Published</div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {selectedTemplate.published_at ? format(new Date(selectedTemplate.published_at), 'MMM d, yyyy HH:mm (12h a)') : '—'}
                  </div>
                </div>
              </div>

              {selectedTemplate.rejection_reason && (
                <div style={{ padding: '12px', background: '#fce8e8', borderRadius: 8, border: '1px solid #fecaca' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--li-red)', marginBottom: 4, textTransform: 'uppercase' }}>Rejection Reason</div>
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