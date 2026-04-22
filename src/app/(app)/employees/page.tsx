export const dynamic = 'force-dynamic';

import { createServiceClient } from '@/utils/supabase/service'
import { getSessionUser } from '@/utils/session'
import { Users, UserCheck, Building2, Globe } from 'lucide-react'
import EmployeesManager from './EmployeesManager'

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

export default async function EmployeesPage() {
  const user = await getSessionUser()
  const supabase = createServiceClient()
  const canManage = user?.role === 'admin' || user?.role === 'manager'

  // Fetch all users
  const { data: employees } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
  const employeeList = (employees as Employee[] | null) || []

  // Calculate stats
  const total = employeeList.length
  const active = employeeList.filter((e) => e.is_active).length
  const depts = new Set(employeeList.map((e) => e.department).filter(Boolean)).size
  const remote = employeeList.filter((e) => e.is_remote).length

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-sub">Track employees, roles, and account status from one place.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label flex items-center gap-2 justify-between">
            Total Employees <Users size={14} className="text-slate-400" />
          </div>
          <div className="stat-value">{total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex items-center gap-2 justify-between">
            Active <UserCheck size={14} className="text-slate-400" />
          </div>
          <div className="stat-value">{active}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex items-center gap-2 justify-between">
            Departments <Building2 size={14} className="text-slate-400" />
          </div>
          <div className="stat-value">{depts}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex items-center gap-2 justify-between">
            Remote Workers <Globe size={14} className="text-slate-400" />
          </div>
          <div className="stat-value">{remote}</div>
        </div>
      </div>

      <EmployeesManager employees={employeeList} canManage={canManage} />
    </div>
  )
}
