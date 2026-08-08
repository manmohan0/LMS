import React, { useEffect, useState, useCallback } from 'react'
import { useAtom } from 'jotai'
import { currentUserAtom } from '../../atoms'
import { coursesAPI, categoriesAPI, usersAPI } from '../../api'
import { DataTable } from '../../components/DataTable'
import { Modal, ConfirmModal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'

interface Course {
  id: number; title: string; level: string; instructor_name: string
  category_name: string; enrollment_count: number; lesson_count: number
  price: number; is_published: boolean; created_at: string
}
interface CourseForm {
  title: string; description: string; level: string; duration: string
  price: string; is_published: boolean; category_id: string; instructor_id: string; thumbnail: string
}
const emptyForm: CourseForm = { title: '', description: '', level: 'beginner', duration: '', price: '0', is_published: false, category_id: '', instructor_id: '', thumbnail: '' }

export const CourseManagement: React.FC = () => {
  const [user] = useAtom(currentUserAtom)
  const [courses, setCourses] = useState<Course[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [cats, setCats] = useState<any[]>([])
  const [instructors, setInstructors] = useState<any[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editCourse, setEditCourse] = useState<Course | null>(null)
  const [form, setForm] = useState<CourseForm>(emptyForm)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  useEffect(() => {
    categoriesAPI.list({ per_page: 100 }).then((r) => setCats(r.data.categories))
    usersAPI.listInstructors().then((r) => setInstructors(r.data.instructors))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const fetcher = user?.role === 'instructor' ? coursesAPI.myCourses : coursesAPI.listAll
      const res = await fetcher({ page, per_page: 10, search })
      setCourses(res.data.courses)
      setTotal(res.data.meta.total)
    } catch { toast.error('Failed to load courses') }
    finally { setLoading(false) }
  }, [page, search, user])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditCourse(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (c: Course) => {
    setEditCourse(c)
    setForm({ title: c.title, description: '', level: c.level, duration: '', price: String(c.price), is_published: c.is_published, category_id: '', instructor_id: '', thumbnail: '' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return }
    setSaving(true)
    try {
      const payload = { ...form, price: parseFloat(form.price) || 0, category_id: form.category_id ? parseInt(form.category_id) : undefined, instructor_id: form.instructor_id ? parseInt(form.instructor_id) : undefined }
      if (editCourse) { await coursesAPI.update(editCourse.id, payload); toast.success('Course updated') }
      else { await coursesAPI.create(payload); toast.success('Course created') }
      setModalOpen(false); load()
    } catch (err: any) { toast.error(err.response?.data?.error || 'Save failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try { await coursesAPI.delete(deleteId); toast.success('Course deleted'); setDeleteId(null); load() }
    catch { toast.error('Delete failed') }
  }

  const handleTogglePublish = async (c: Course) => {
    try {
      await coursesAPI.update(c.id, { is_published: !c.is_published })
      toast.success(`Course ${c.is_published ? 'unpublished' : 'published'}`)
      load()
    } catch { toast.error('Update failed') }
  }

  const levelBadge = (level: string) => {
    const map: Record<string, string> = { beginner: 'badge-success', intermediate: 'badge-warning', advanced: 'badge-danger' }
    return <span className={`badge ${map[level] || 'badge-primary'}`}>{level}</span>
  }

  const columns = [
    { key: 'title', label: 'Title', render: (c: Course) => <div><strong>{c.title}</strong><br /><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{c.category_name || 'No category'}</span></div> },
    { key: 'instructor_name', label: 'Instructor', render: (c: Course) => c.instructor_name || '—' },
    { key: 'level', label: 'Level', render: (c: Course) => levelBadge(c.level) },
    { key: 'price', label: 'Price', render: (c: Course) => c.price === 0 ? <span className="badge badge-success">Free</span> : `$${c.price}` },
    { key: 'enrollment_count', label: 'Students', render: (c: Course) => <span className="badge badge-info">{c.enrollment_count}</span> },
    { key: 'lesson_count', label: 'Lessons', render: (c: Course) => c.lesson_count },
    { key: 'is_published', label: 'Status', render: (c: Course) => <span className={`badge ${c.is_published ? 'badge-success' : 'badge-warning'}`}>{c.is_published ? 'Published' : 'Draft'}</span> },
  ]

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Course Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{total} courses</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Add Course</button>
      </div>

      <DataTable
        data={courses} columns={columns} loading={loading} searchable
        searchPlaceholder="Search courses…" onSearch={(q) => { setSearch(q); setPage(1) }}
        total={total} page={page} perPage={10} onPageChange={setPage}
        actions={(c) => (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-secondary" style={{ padding: '0.35rem 0.65rem' }} onClick={() => openEdit(c)}><Pencil size={14} /></button>
            <button className="btn-secondary" style={{ padding: '0.35rem 0.65rem' }} onClick={() => handleTogglePublish(c)} title={c.is_published ? 'Unpublish' : 'Publish'}>
              {c.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button className="btn-danger" style={{ padding: '0.35rem 0.65rem' }} onClick={() => setDeleteId(c.id)}><Trash2 size={14} /></button>
          </div>
        )}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editCourse ? 'Edit Course' : 'New Course'} maxWidth={560}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Title</label>
            <input className="input" placeholder="Course title" value={form.title} onChange={set('title')} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea className="input" rows={3} placeholder="Course description…" value={form.description} onChange={set('description')} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Level</label>
              <select className="input" value={form.level} onChange={set('level')}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div className="form-group">
              <label>Price ($)</label>
              <input className="input" type="number" min="0" step="0.01" placeholder="0.00" value={form.price} onChange={set('price')} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Category</label>
              <select className="input" value={form.category_id} onChange={set('category_id')}>
                <option value="">— Select —</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Instructor</label>
              <select className="input" value={form.instructor_id} onChange={set('instructor_id')}>
                <option value="">— Select —</option>
                {instructors.map((i) => <option key={i.id} value={i.id}>{i.full_name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Duration</label>
            <input className="input" placeholder="e.g. 20 hours" value={form.duration} onChange={set('duration')} />
          </div>
          <div className="form-group">
            <label>Thumbnail URL</label>
            <input className="input" placeholder="https://…" value={form.thumbnail} onChange={set('thumbnail')} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', padding: '0.75rem', background: 'var(--bg-input)', borderRadius: 10 }}>
            <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
            Publish immediately
          </label>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <div className="spinner" style={{ width: 16, height: 16 }} /> : null}
              {saving ? 'Saving…' : editCourse ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete Course" message="This will permanently delete the course and all associated lessons, assignments, and quizzes." confirmLabel="Delete" />
    </div>
  )
}
