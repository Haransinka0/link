export const dynamic = 'force-dynamic';

import { createServiceClient } from '@/utils/supabase/service'
import { getSessionUser } from '@/utils/session'
import { Check, X, Clock, AlertCircle } from 'lucide-react'

type ApprovalTemplate = {
  id: string
  title: string
  body: string
  image_url: string | null
  hashtags: string[] | null
  tone: string | null
  created_at: string
  project: { name: string | null } | null
  creator: { name: string | null; email: string | null } | null
}

export default async function ApprovalsPage() {
  const user = await getSessionUser()
  const supabase = createServiceClient()

  const { data: queue, error } = await supabase.from('post_templates').select(`
    *,
    project:project_id(name),
    creator:created_by(name, email)
  `).eq('status', 'pending_review').order('created_at', { ascending: true })

  if (error) {
    console.error('Approvals fetch error:', error)
  }

  const items = (queue as ApprovalTemplate[] | null) || []
  const isApprover = user?.role === 'admin' || user?.role === 'manager'

  return (
    <div className="animate-in pb-12">
      <div className="page-header">
        <div>
          <h1 className="page-title">Approval Queue</h1>
          <p className="page-sub">Review and approve posts submitted by your team</p>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: items.length > 0 ? '#FEF3C7' : '#D1FAE5',
          color: items.length > 0 ? '#92400E' : '#065F46',
          padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700
        }}>
          <Clock size={14} />
          {items.length} Pending Review
        </div>
      </div>

      {!isApprover && (
        <div className="card" style={{ background: '#FEF9C3', border: '1px solid #FDE68A', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, color: '#78350F' }}>
          <AlertCircle size={16} />
          Only Admins and Managers can approve posts. Contact your manager to review.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 20 }}>
        {items.map(template => {
          const initial = (template.creator?.name || template.creator?.email || 'U')[0].toUpperCase()

          return (
            <div key={template.id} className="card p-0" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{template.title}</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', gap: 8 }}>
                    <span>Project: <strong style={{ color: 'var(--color-text-primary)' }}>{template.project?.name || 'N/A'}</strong></span>
                    <span>•</span>
                    <span>Submitted by <strong style={{ color: 'var(--color-text-primary)' }}>{template.creator?.name || template.creator?.email || 'Unknown'}</strong></span>
                    <span>•</span>
                    <span>{new Date(template.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="badge b-pending" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div className="act-dot" style={{ background: '#F59E0B', marginTop: 0 }}></div> Needs Approval
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 0 }}>
                {/* LinkedIn-style post preview */}
                <div style={{ padding: 24, borderRight: '1px solid #E2E8F0' }}>
                  <p style={{ margin: '0 0 12px 0', fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em' }}>Content Preview</p>

                  <div className="li-card" style={{ maxWidth: '100%', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    {/* Author */}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                      <div className="av-md" style={{ background: '#0A66C2', color: '#fff' }}>
                        {initial}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#000' }}>{template.creator?.name || 'Team Member'}</div>
                        <div style={{ fontSize: 11, color: '#666' }}>LinkedIn Member • Just now • 🌐</div>
                      </div>
                    </div>

                    {/* Post text */}
                    <div>
                      <div style={{ fontSize: 14, color: '#000', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                        {template.body
                          ?.replace(/\[Alt:\s*.*?\]/gi, '')
                          ?.replace(/\[Overlay:\s*.*?\]/gi, '')
                          ?.replace(/::.*::/g, '')
                          ?.trim()}
                      </div>
                      {template.hashtags && template.hashtags.length > 0 && (
                        <div style={{ margin: '8px 0 0', fontSize: 14, color: '#0A66C2', fontWeight: 600 }}>
                          {template.hashtags.map(h => `#${h}`).join(' ')}
                        </div>
                      )}
                    </div>

                    {/* Image */}
                    {template.image_url && (
                      <div style={{ marginTop: 12, marginLeft: -16, marginRight: -16 }}>
                        <img
                          src={template.image_url}
                          alt="Post media"
                          style={{ width: '100%', objectFit: 'contain', display: 'block', maxHeight: 400, background: '#f3f2ef' }}
                        />
                      </div>
                    )}

                    {/* Reactions bar */}
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #E2E8F0', display: 'flex', gap: 4 }}>
                      {['Like', 'Comment', 'Repost', 'Send'].map(a => (
                        <span key={a} style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#666', padding: '10px 0', borderRadius: 6, cursor: 'pointer' }}>{a}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Approval actions */}
                {isApprover && (
                  <div style={{ padding: 24, background: '#FAFAFA' }}>
                    <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                      Manager Review
                    </p>
                    <form action="/api/approvals" method="POST" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <input type="hidden" name="template_id" value={template.id} />
                      <div>
                         <label className="form-label">Review Comment (required if rejecting)</label>
                         <textarea
                           name="comment"
                           rows={4}
                           className="form-textarea"
                           placeholder="Provide feedback on the post..."
                         />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <button type="submit" name="action" value="approve" className="btn btn-primary" style={{ display: 'flex', justifyContent: 'center' }}>
                          <Check size={16} /> Approve & Move to Editor
                        </button>
                        <button type="submit" name="action" value="reject" className="btn btn-secondary" style={{ display: 'flex', justifyContent: 'center', color: '#EF4444', borderColor: '#FCA5A5' }}>
                          <X size={16} /> Reject with feedback
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {items.length === 0 && (
          <div className="empty-state">
            <Check size={48} color="#22C55E" />
            <h3 style={{ marginTop: 16 }}>You're all caught up!</h3>
            <p>No posts are waiting for your approval. Check back when your team submits new content.</p>
          </div>
        )}
      </div>
    </div>
  )
}

