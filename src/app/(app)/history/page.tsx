'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

type TemplateRow = {
  id: string
  title: string
  status: string
  scheduled_at: string | null
  published_at: string | null
  rejection_reason: string | null
  updated_at: string
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending_review', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'failed', label: 'Failed' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Posted' },
] as const

export default function HistoryPage() {
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]['value']>('all')

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

  return (
    <div className="animate-in pb-12">
      <div className="page-header">
        <div>
          <h1 className="page-title">History</h1>
          <p className="page-sub">Review scheduled and posted items with responses.</p>
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

      <div className="card p-6" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Template</th>
              <th>Scheduled time</th>
              <th>Posted time</th>
              <th>Status</th>
              <th>Response</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 800, color: '#0f172a' }}>{r.title}</td>
                <td>{r.scheduled_at ? new Date(r.scheduled_at).toLocaleString() : '—'}</td>
                <td>{r.published_at ? new Date(r.published_at).toLocaleString() : '—'}</td>
                <td>
                  <span
                    className={`badge badge-${
                      r.status === 'pending_review'
                        ? 'pending'
                        : r.status === 'published'
                          ? 'published'
                          : r.status === 'failed'
                            ? 'failed'
                            : r.status
                    }`}
                  >
                    {r.status === 'pending_review'
                      ? 'pending'
                      : r.status === 'published'
                        ? 'posted'
                        : r.status === 'failed'
                          ? 'failed'
                          : r.status}
                  </span>
                </td>
                <td style={{ color: '#475569' }}>
                  {r.status === 'published'
                    ? 'Posted successfully'
                    : (r.rejection_reason || (r.status === 'rejected' ? 'Rejected' : r.status))}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 22, color: '#64748b' }}>
                  No history records found for this filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

