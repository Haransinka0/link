'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Save, Search, Plus, X } from 'lucide-react'
import { createEmployee, updateEmployeeProfile } from './actions'

type Employee = {
  id: string
  name: string | null
  email: string
  role: 'admin' | 'manager' | 'employee'
  department: string | null
  designation: string | null
  phone: string | null
  is_active: boolean | null
  is_remote: boolean | null
}

type Props = {
  employees: Employee[]
  canManage: boolean
}

export default function EmployeesManager({ employees, canManage }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [rows, setRows] = useState(employees)
  const [addOpen, setAddOpen] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addName, setAddName] = useState('')
  const [addRole, setAddRole] = useState<Employee['role']>('employee')

  const departments = useMemo(
    () => Array.from(new Set(rows.map((r) => r.department).filter(Boolean))) as string[],
    [rows]
  )
  const [departmentFilter, setDepartmentFilter] = useState('all')

  const filtered = useMemo(() => {
    return rows.filter((emp) => {
      const text = `${emp.name || ''} ${emp.email} ${emp.department || ''} ${emp.designation || ''}`.toLowerCase()
      const matchesSearch = text.includes(search.toLowerCase())
      const matchesRole = roleFilter === 'all' || emp.role === roleFilter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && !!emp.is_active) ||
        (statusFilter === 'inactive' && !emp.is_active)
      const matchesDepartment = departmentFilter === 'all' || (emp.department || '') === departmentFilter
      return matchesSearch && matchesRole && matchesStatus && matchesDepartment
    })
  }, [rows, search, roleFilter, statusFilter, departmentFilter])

  const updateLocalRow = (id: string, patch: Partial<Employee>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const saveRow = (row: Employee) => {
    const formData = new FormData()
    formData.set('id', row.id)
    formData.set('role', row.role)
    formData.set('is_active', row.is_active ? 'true' : 'false')
    formData.set('is_remote', row.is_remote ? 'true' : 'false')
    formData.set('department', row.department || '')
    formData.set('designation', row.designation || '')
    formData.set('phone', row.phone || '')

    setPendingId(row.id)
    startTransition(async () => {
      const result = await updateEmployeeProfile(formData)
      if (!result.success) {
        alert(result.error || 'Unable to update employee')
      }
      setPendingId(null)
    })
  }

  return (
    <>
      <div className="filter-bar">
        <div className="search-bar">
          <Search size={16} className="text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} type="text" placeholder="Search employees..." />
        </div>
        <select className="filter-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="employee">Employee</option>
        </select>
        <select className="filter-select" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
          <option value="all">All Departments</option>
          {departments.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>
        <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {canManage && (
          <button className="btn btn-primary" type="button" onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Add employee
          </button>
        )}
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Designation</th>
              <th>Department</th>
              <th>Role</th>
              <th>Status</th>
              <th>Remote</th>
              <th>Email</th>
              <th>Phone</th>
              <th style={{ width: 64 }}>Save</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp) => {
              const editingDisabled = !canManage || (isPending && pendingId === emp.id)
              return (
                <tr key={emp.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ width: 32, height: 32 }}>
                        {emp.name ? emp.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.name || 'Unnamed User'}</span>
                    </div>
                  </td>
                  <td>
                    <input
                      className="form-input"
                      value={emp.designation || ''}
                      onChange={(e) => updateLocalRow(emp.id, { designation: e.target.value })}
                      disabled={editingDisabled}
                    />
                  </td>
                  <td>
                    <input
                      className="form-input"
                      value={emp.department || ''}
                      onChange={(e) => updateLocalRow(emp.id, { department: e.target.value })}
                      disabled={editingDisabled}
                    />
                  </td>
                  <td>
                    <select
                      className="form-select"
                      value={emp.role}
                      onChange={(e) => updateLocalRow(emp.id, { role: e.target.value as Employee['role'] })}
                      disabled={editingDisabled}
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="employee">Employee</option>
                    </select>
                  </td>
                  <td>
                    <select
                      className="form-select"
                      value={emp.is_active ? 'active' : 'inactive'}
                      onChange={(e) => updateLocalRow(emp.id, { is_active: e.target.value === 'active' })}
                      disabled={editingDisabled}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!emp.is_remote}
                      onChange={(e) => updateLocalRow(emp.id, { is_remote: e.target.checked })}
                      disabled={editingDisabled}
                      aria-label="Remote"
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                      <Mail size={14} /> {emp.email}
                    </div>
                  </td>
                  <td>
                    <input
                      className="form-input"
                      value={emp.phone || ''}
                      onChange={(e) => updateLocalRow(emp.id, { phone: e.target.value })}
                      disabled={editingDisabled}
                      placeholder="Phone"
                    />
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary btn-icon"
                      onClick={() => saveRow(emp)}
                      disabled={editingDisabled}
                      aria-label="Save employee"
                    >
                      <Save size={15} />
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-8 text-slate-500">
                  No employees matched your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {addOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Add employee</div>
              <button className="btn btn-ghost btn-icon" type="button" onClick={() => setAddOpen(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="name@company.com" />
              </div>
              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">Name</label>
                <input className="form-input" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Full name" />
              </div>
              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">Role</label>
                <select className="form-select" value={addRole} onChange={(e) => setAddRole(e.target.value as Employee['role'])}>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" type="button" onClick={() => setAddOpen(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                type="button"
                disabled={!addEmail.trim() || isPending}
                onClick={() => {
                  const fd = new FormData()
                  fd.set('email', addEmail)
                  fd.set('name', addName)
                  fd.set('role', addRole)
                  startTransition(async () => {
                    const res = await createEmployee(fd)
                    if (!res.success) {
                      alert(res.error || 'Unable to add employee')
                      return
                    }
                    setAddOpen(false)
                    setAddEmail('')
                    setAddName('')
                    setAddRole('employee')
                    router.refresh()
                  })
                }}
              >
                <Plus size={16} /> Add
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
