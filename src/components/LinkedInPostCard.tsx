'use client'

import { 
  ThumbsUp, MessageCircle, Repeat2, Send, MoreHorizontal,
  Globe, Clock
} from 'lucide-react'

interface LinkedInPostCardProps {
  authorName: string
  authorHeadline?: string
  authorPicture?: string | null
  body: string
  hashtags?: string[] | null
  imageUrl?: string | null
  timeAgo?: string
  showFollowButton?: boolean
  onLike?: () => void
  onComment?: () => void
  onRepost?: () => void
  onSend?: () => void
}

export default function LinkedInPostCard({
  authorName,
  authorHeadline = 'LinkedIn Member',
  authorPicture,
  body,
  hashtags,
  imageUrl,
  timeAgo = 'Just now',
  showFollowButton = false,
  onLike,
  onComment,
  onRepost,
  onSend,
}: LinkedInPostCardProps) {
  const initial = authorName[0]?.toUpperCase() || 'U'
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const formatHashtags = (text: string) => {
    return text.split(/(\s+)/).map((word, i) => {
      if (word.startsWith('#') || (word.trim().startsWith('#'))) {
        return <span key={i} className="hashtag">{word}</span>
      }
      return word
    })
  }

  return (
    <div className="li-post-card">
      <div className="li-post-header">
        {authorPicture ? (
          <img src={authorPicture} alt={authorName} className="li-post-avatar" />
        ) : (
          <div className="li-post-avatar">{getInitials(authorName)}</div>
        )}
        
        <div className="li-post-meta">
          <div className="li-post-name">
            {authorName}
            {showFollowButton && (
              <button className="li-post-follow">Follow</button>
            )}
          </div>
          <div className="li-post-headline">{authorHeadline}</div>
          <div className="li-post-time">
            {timeAgo} · <Globe size={12} />
          </div>
        </div>
        
        <MoreHorizontal className="li-post-menu" />
      </div>

      <div className="li-post-body">
        {formatHashtags(body)}
        {hashtags && hashtags.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {hashtags.map((tag, i) => (
              <span key={i} className="hashtag" style={{ marginRight: 6 }}>#{tag}</span>
            ))}
          </div>
        )}
      </div>

      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="Post media" className="li-post-image" />
      )}

      <div className="li-post-reactions">
        <div className="li-post-reactions-left">
          <div className="li-post-reaction-icons">
            <span>👍</span>
            <span>❤️</span>
            <span>🎉</span>
          </div>
          <span>42</span>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span style={{ marginRight: 8 }}>4 comments</span>
          <span>2 reposts</span>
        </div>
      </div>

      <div className="li-post-actions">
        <button className="li-post-action" onClick={onLike}>
          <ThumbsUp size={20} />
          Like
        </button>
        <button className="li-post-action" onClick={onComment}>
          <MessageCircle size={20} />
          Comment
        </button>
        <button className="li-post-action" onClick={onRepost}>
          <Repeat2 size={20} />
          Repost
        </button>
        <button className="li-post-action" onClick={onSend}>
          <Send size={20} />
          Send
        </button>
      </div>
    </div>
  )
}