'use client'

import { eachDayOfInterval, format, startOfDay, subDays } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type TemplateRow = {
  id: string
  status: string
  published_at: string | null
}

export default function AnalyticsPage() {
  const [templates, setTemplates] = useState<TemplateRow[]>([])

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

  const total = templates.length
  const successful = templates.filter(t => t.status === 'published').length
  const failed = templates.filter(t => t.status === 'failed').length
  const successRate = total ? Math.round((successful / total) * 100) : 0

  const chartData = useMemo(() => {
    const end = startOfDay(new Date())
    const start = startOfDay(subDays(end, 6))
    const days = eachDayOfInterval({ start, end })

    const counts = new Map<string, number>()
    for (const d of days) counts.set(format(d, 'yyyy-MM-dd'), 0)

    templates.forEach(t => {
      if (t.status !== 'published' || !t.published_at) return
      const key = format(startOfDay(new Date(t.published_at)), 'yyyy-MM-dd')
      if (counts.has(key)) counts.set(key, (counts.get(key) || 0) + 1)
    })

    return days.map(d => {
      const key = format(d, 'yyyy-MM-dd')
      return {
        day: format(d, 'EEE'),
        posts: counts.get(key) || 0,
      }
    })
  }, [templates])

  return (
    <div className="animate-in pb-12">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-sub">A lightweight overview of posting performance.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Posts</div>
          <div className="stat-value">{total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Successful</div>
          <div className="stat-value">{successful}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Failed</div>
          <div className="stat-value">{failed}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Success Rate</div>
          <div className="stat-value">{successRate}%</div>
        </div>
      </div>

      <div className="card p-6">
        <h3 style={{ margin: 0, fontWeight: 900, color: '#0f172a' }}>Posts per day (last 7 days)</h3>
        <p className="page-sub" style={{ marginTop: 6, marginBottom: 14 }}>Counts are based on posted items.</p>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ left: 4, right: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="posts" fill="#2563eb" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

