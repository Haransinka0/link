'use client'

import { useState } from 'react'
import { Users, Plus, X, Search, Crown, Shield, Edit, Eye } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

type Member = {
  user_id: string
  role: string
  user?: { name: string; email: string }
}

type User = {
  id: string
  name: string
  email: string
}

const ROLE_ICONS = {
  owner: Crown,
  manager: Shield,
  editor: Edit,
  viewer: Eye,
}

const ROLE_COLORS = {
  owner: { bg: '#0a66c2', text: '#fff' },
  manager: { bg: '#057642', text: '#fff' },
  editor: { bg: '#f5a623', text: '#fff' },
  viewer: { bg: '#666', text: '#fff' },
}

export default function ProjectTeamPanel({ 
  projectId, 
  members = [], 
  managerName 
}: { 
  projectId: string
  members?: Member[]
  managerName?: string 
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<'editor' | 'viewer'>('editor')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('users')
      .select('id, name, email')
      .ilike('name', `%${query}%`)
      .limit(10)
    setSearchResults(data || [])
    setLoading(false)
  }

  const addMember = async (user: User) => {
    await supabase
      .from('project_members')
      .insert({ project_id: projectId, user_id: user.id, role: selectedRole })
    setIsAdding(false)
    setSearchTerm('')
    setSearchResults([])
  }

  const removeMember = async (userId: string) => {
    await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId)
  }

  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--li-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={16} style={{ color: '#0a66c2' }} />
          <span style={{ fontSize: 14, fontWeight: 700 }}>Team Members</span>
          <span style={{ fontSize: 12, color: '#666', background: '#f3f2ef', padding: '2px 8px', borderRadius: 999 }}>
            {members.length + 1}
          </span>
        </div>
        <button onClick={() => setIsAdding(true)} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }}>
          <Plus size={14} /> Add
        </button>
      </div>

      <div style={{ padding: 12, maxHeight: 300, overflowY: 'auto' }}>
        {managerName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '8px 10px', background: '#e6f7ef', borderRadius: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#057642', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
              {getInitials(managerName)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{managerName}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                <Crown size={10} style={{ color: '#057642' }} />
                <span style={{ color: '#057642', fontWeight: 600 }}>Owner/Manager</span>
              </div>
            </div>
          </div>
        )}

        {members.map((m, i) => {
          const RoleIcon = ROLE_ICONS[m.role as keyof typeof ROLE_ICONS] || Eye
          const colors = ROLE_COLORS[m.role as keyof typeof ROLE_COLORS] || ROLE_COLORS.viewer
          const name = m.user?.name || m.user?.email || 'Unknown'
          
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, marginBottom: 4, background: '#f3f2ef' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: colors.bg, color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                {getInitials(name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#666' }}>
                  <RoleIcon size={10} style={{ color: colors.text }} />
                  <span style={{ color: colors.text, fontWeight: 600, textTransform: 'capitalize' }}>{m.role}</span>
                </div>
              </div>
              <button onClick={() => removeMember(m.user_id)} className="btn btn-ghost btn-icon" style={{ color: '#cc1016', padding: 4 }}>
                <X size={14} />
              </button>
            </div>
          )
        })}

        {members.length === 0 && !managerName && (
          <p style={{ fontSize: 12, color: '#999', textAlign: 'center', padding: 20 }}>No team members yet</p>
        )}
      </div>

      {isAdding && (
        <div style={{ padding: 12, borderTop: '1px solid var(--li-border)', background: '#fafafa' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#999' }} />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); searchUsers(e.target.value) }}
                className="form-input"
                style={{ paddingLeft: 32 }}
              />
            </div>
            <button onClick={() => setIsAdding(false)} className="btn btn-ghost btn-icon">
              <X size={14} />
            </button>
          </div>

          {searchTerm && (
            <div style={{ marginBottom: 12 }}>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as 'editor' | 'viewer')}
                className="form-select"
                style={{ marginBottom: 8 }}
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          )}

          {loading ? (
            <p style={{ fontSize: 12, color: '#999', textAlign: 'center' }}>Searching...</p>
          ) : searchResults.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {searchResults.map(user => (
                <div
                  key={user.id}
                  onClick={() => addMember(user)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', background: '#fff', border: '1px solid #eee' }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0a66c2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>
                    {getInitials(user.name)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</div>
                    <div style={{ fontSize: 11, color: '#999' }}>{user.email}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchTerm ? (
            <p style={{ fontSize: 12, color: '#999', textAlign: 'center' }}>No users found</p>
          ) : null}
        </div>
      )}
    </div>
  )
}