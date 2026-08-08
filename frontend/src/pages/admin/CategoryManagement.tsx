import React, { useEffect, useState, useCallback } from 'react'
import { categoriesAPI } from '../../api'
import { DataTable } from '../../components/DataTable'
import { Modal, ConfirmModal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Plus, Pencil, Trash2 } from 'lucide-react'

interface Category { id: number; name: string; description: string; icon: string; course_count: number; created_at: string }
interface CatForm { name: string; description: string; icon: string }
const emptyForm: CatForm = { name: '', description: '', icon: '📚' }
const ICONS = ['📚', '🐍', '🌐', '📊', '⚙️', '🤖', '🎨', '🔐', '💡', '🎵', '📱', '🖥️']

export const CategoryManagement: React.FC = () => {
  const [cats, setCats] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [form, setForm] = useState<CatForm>(emptyForm)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await categoriesAPI.list({ page, per_page: 10, search })
      setCats(res.data.categories)
      setTotal(res.data.meta.total)
    } catch { toast.error('Failed to load categories') }
    finally { setLoading(false) }
  }, [page, search])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditCat(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (c: Category) => { setEditCat(c); setForm({ name: c.name, description: c.description || '', icon: c.icon || '📚' }); setModalOpen(true) }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      if (editCat) { await categoriesAPI.update(editCat.id, form); toast.success('Category updated') }
      else { await categoriesAPI.create(form); toast.success('Category created') }
      setModalOpen(false); load()
    } catch (err: any) { toast.error(err.response?.data?.error || 'Save failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try { await categoriesAPI.delete(deleteId); toast.success('Category deleted'); setDeleteId(null); load() }
    catch { toast.error('Delete failed — category may have courses') }
  }

  const columns = [
    { key: 'icon', label: 'Icon', render: (c: Category) => <span style={{ fontSize: '1.5rem' }}>{c.icon}</span> },
    { key: 'name', label: 'Name', render: (c: Category) => <strong>{c.name}</strong> },
    { key: 'description', label: 'Description', render: (c: Category) => <span style={{ color: 'var(--text-muted)' }}>{c.description || '—'}</span> },
    { key: 'course_count', label: 'Courses', render: (c: Category) => <span className="badge badge-primary">{c.course_count}</span> },
    { key: 'created_at', label: 'Created', render: (c: Category) => new Date(c.created_at).toLocaleDateString() },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Category Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{total} categories</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Add Category</button>
      </div>

      <DataTable
        data={cats} columns={columns} loading={loading} searchable
        searchPlaceholder="Search categories…" onSearch={(q) => { setSearch(q); setPage(1) }}
        total={total} page={page} perPage={10} onPageChange={setPage}
        actions={(c) => (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-secondary" style={{ padding: '0.35rem 0.65rem' }} onClick={() => openEdit(c)}><Pencil size={14} /></button>
            <button className="btn-danger" style={{ padding: '0.35rem 0.65rem' }} onClick={() => setDeleteId(c.id)}><Trash2 size={14} /></button>
          </div>
        )}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editCat ? 'Edit Category' : 'New Category'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Name</label>
            <input className="input" placeholder="e.g. Python" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea className="input" rows={3} placeholder="Category description…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ resize: 'vertical' }} />
          </div>
          <div className="form-group">
            <label>Icon</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
              {ICONS.map((icon) => (
                <button key={icon} type="button" onClick={() => setForm({ ...form, icon })}
                  style={{ width: 40, height: 40, borderRadius: 8, fontSize: '1.3rem', cursor: 'pointer', border: `2px solid ${form.icon === icon ? 'var(--primary)' : 'transparent'}`, background: form.icon === icon ? 'rgba(99,102,241,0.2)' : 'var(--bg-input)' }}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <div className="spinner" style={{ width: 16, height: 16 }} /> : null}
              {saving ? 'Saving…' : editCat ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete Category" message="This will delete the category. Courses in this category will lose their category association." confirmLabel="Delete" />
    </div>
  )
}
