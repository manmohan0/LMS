import React, { useEffect, useState, useCallback } from 'react'
import { usersAPI } from '../../api'
import { DataTable } from '../../components/DataTable'
import { Modal, ConfirmModal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Plus, Pencil, Trash2, UserCheck, UserX } from 'lucide-react'

interface User {
  id: number
  full_name: string
  email: string
  role: string
  phone: string
  is_active: boolean
  created_at: string
}

interface UserForm {
  full_name: string
  email: string
  password: string
  role: string
  phone: string
  bio: string
}

const emptyForm: UserForm = { full_name: '', email: '', password: '', role: 'student', phone: '', bio: '' }

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await usersAPI.list({ page, per_page: 10, search, role: roleFilter || undefined })
      setUsers(res.data.users)
      setTotal(res.data.meta.total)
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [page, search, roleFilter])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditUser(null); setForm(emptyForm); setFormErrors({}); setModalOpen(true) }
  const openEdit = (u: User) => {
    setEditUser(u)
    setForm({ full_name: u.full_name, email: u.email, password: '', role: u.role, phone: u.phone || '', bio: '' })
    setFormErrors({})
    setModalOpen(true)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.full_name.trim()) e.full_name = 'Required'
    if (!form.email) e.email = 'Required'
    if (!editUser && !form.password) e.password = 'Required for new users'
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (editUser) {
        await usersAPI.update(editUser.id, form)
        toast.success('User updated')
      } else {
        await usersAPI.create(form)
        toast.success('User created')
      }
      setModalOpen(false)
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await usersAPI.delete(deleteId)
      toast.success('User deleted')
      setDeleteId(null)
      load()
    } catch {
      toast.error('Delete failed')
    }
  }

  const handleToggleActive = async (u: User) => {
    try {
      await usersAPI.update(u.id, { is_active: !u.is_active })
      toast.success(`User ${u.is_active ? 'deactivated' : 'activated'}`)
      load()
    } catch {
      toast.error('Update failed')
    }
  }

  const roleBadge = (role: string) => {
    const map: Record<string, string> = { admin: 'badge-danger', instructor: 'badge-warning', student: 'badge-success' }
    return <span className={`badge ${map[role] || 'badge-primary'}`}>{role}</span>
  }

  const columns = [
    { key: 'full_name', label: 'Name' },
    { key: 'email', label: 'Email', render: (u: User) => <span style={{ color: 'var(--text-muted)' }}>{u.email}</span> },
    { key: 'role', label: 'Role', render: (u: User) => roleBadge(u.role) },
    { key: 'phone', label: 'Phone', render: (u: User) => u.phone || '—' },
    {
      key: 'is_active', label: 'Status',
      render: (u: User) => <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>{u.is_active ? 'Active' : 'Inactive'}</span>
    },
    { key: 'created_at', label: 'Joined', render: (u: User) => new Date(u.created_at).toLocaleDateString() },
  ]

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>User Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{total} users registered</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select className="input" style={{ width: 160 }} value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}>
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="instructor">Instructor</option>
            <option value="student">Student</option>
          </select>
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> Add User
          </button>
        </div>
      </div>

      <DataTable
        data={users}
        columns={columns}
        loading={loading}
        searchable
        searchPlaceholder="Search users…"
        onSearch={(q) => { setSearch(q); setPage(1) }}
        total={total}
        page={page}
        perPage={10}
        onPageChange={setPage}
        actions={(u) => (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-secondary" style={{ padding: '0.35rem 0.65rem' }} onClick={() => openEdit(u)} title="Edit">
              <Pencil size={14} />
            </button>
            <button className="btn-secondary" style={{ padding: '0.35rem 0.65rem' }} onClick={() => handleToggleActive(u)} title={u.is_active ? 'Deactivate' : 'Activate'}>
              {u.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
            </button>
            <button className="btn-danger" style={{ padding: '0.35rem 0.65rem' }} onClick={() => setDeleteId(u.id)} title="Delete">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      />

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editUser ? 'Edit User' : 'Create User'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { field: 'full_name', label: 'Full Name', type: 'text', placeholder: 'John Doe' },
            { field: 'email', label: 'Email', type: 'email', placeholder: 'john@example.com' },
            { field: 'phone', label: 'Phone', type: 'tel', placeholder: '+91 9876543210' },
          ].map(({ field, label, type, placeholder }) => (
            <div key={field} className="form-group">
              <label>{label}</label>
              <input className="input" type={type} placeholder={placeholder} value={(form as any)[field]} onChange={set(field)} />
              {formErrors[field] && <span className="form-error">{formErrors[field]}</span>}
            </div>
          ))}

          <div className="form-group">
            <label>Password {editUser && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(leave blank to keep)</span>}</label>
            <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} />
            {formErrors.password && <span className="form-error">{formErrors.password}</span>}
          </div>

          <div className="form-group">
            <label>Role</label>
            <select className="input" value={form.role} onChange={set('role')}>
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="form-group">
            <label>Bio</label>
            <textarea className="input" rows={3} placeholder="About this user…" value={form.bio} onChange={set('bio')} style={{ resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <div className="spinner" style={{ width: 16, height: 16 }} /> : null}
              {saving ? 'Saving…' : editUser ? 'Update User' : 'Create User'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone and will remove all associated data."
        confirmLabel="Delete"
      />
    </div>
  )
}
