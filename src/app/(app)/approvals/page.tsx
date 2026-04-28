export const dynamic = 'force-dynamic';

import { createServiceClient } from '@/utils/supabase/service'
import { getSessionUser } from '@/utils/session'
import { Check, X, Clock, AlertCircle } from 'lucide-react'
import LinkedInPostCard from '@/components/LinkedInPostCard'

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

function processBody(body: string) {
  return body
    ?.replace(/\[Alt:\s*.*?\]/gi, '')
    ?.replace(/\[Overlay:\s*.*?\]/gi, '')
    ?.replace(/::.*::/g, '')
    ?.trim() || ''
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
          background: items.length > 0 ? '#fef3cd' : '#d4edda',
          color: items.length > 0 ? '#856404' : '#155724',
          padding: '6px 14px', borderRadius: 999, fontSize: 14, fontWeight: 600
        }}>
          <Clock size={14} />
          {items.length} Pending Review
        </div>
      </div>

      {!isApprover && (
        <div className="card" style={{ background: '#fef3cd', border: '1px solid #ffeeba', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, color: '#856404' }}>
          <AlertCircle size={16} />
          Only Admins and Managers can approve posts. Contact your manager to review.
        </div>
      )}

      <div style={{ display: 'grid', gap: 20 }}>
        {items.map(template => {
          const creatorName = template.creator?.name || template.creator?.email || 'Team Member'
          const processedBody = processBody(template.body)

          return (
            <div key={template.id} className="approval-card">
              <div className="approval-header">
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{template.title}</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--li-text-secondary)', display: 'flex', gap: 8 }}>
                    <span>Project: <strong>{template.project?.name || 'N/A'}</strong></span>
                    <span>·</span>
                    <span>Submitted by <strong>{creatorName}</strong></span>
                    <span>·</span>
                    <span>{new Date(template.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <span className="status-badge needs-approval">
                  <Clock size={12} /> Needs Approval
                </span>
              </div>

              <div className="two-pane">
                <div style={{ padding: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--li-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                    Content Preview
                  </div>
                  
                  <LinkedInPostCard
                    authorName={creatorName}
                    authorHeadline="LinkedIn Member"
                    body={processedBody}
                    hashtags={template.hashtags}
                    imageUrl={template.image_url}
                    timeAgo="Just now"
                    showFollowButton={false}
                  />
                </div>

                {isApprover && (
                  <div className="two-pane-right" style={{ padding: 20 }}>
                    <div className="card-title">Manager Review</div>
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
                          <Check size={16} /> Approve
                        </button>
                        <button type="submit" name="action" value="reject" className="btn btn-danger" style={{ display: 'flex', justifyContent: 'center' }}>
                          <X size={16} /> Reject
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
            <Check size={48} color="var(--li-green)" />
            <h3>You're all caught up!</h3>
            <p>No posts are waiting for your approval. Check back when your team submits new content.</p>
          </div>
        )}
      </div>
    </div>
  )
}