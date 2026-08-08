import React, { useEffect, useState, useCallback } from 'react'
import { useAtom } from 'jotai'
import { currentUserAtom } from '../../atoms'
import { coursesAPI, categoriesAPI, usersAPI } from '../../api'
import { DataTable } from '../../components/DataTable'
import { Modal, ConfirmModal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Plus, Pencil, Trash2, Eye, EyeOff, BookOpen, Video, Clock, ChevronUp, ChevronDown } from 'lucide-react'

interface Course {
  id: number; title: string; level: string; instructor_name: string
  category_name: string; enrollment_count: number; lesson_count: number
  price: number; is_published: boolean; created_at: string
}
interface CourseForm {
  title: string; description: string; level: string; duration: string
  price: string; is_published: boolean; category_id: string; instructor_id: string; thumbnail: string
}
interface Lesson {
  id: number; course_id: number; title: string; content: string | null
  video_url: string | null; order: number; duration_minutes: number; created_at: string
}
interface LessonForm {
  title: string; content: string; video_url: string; duration_minutes: string; order: string
}

const emptyForm: CourseForm = { title: '', description: '', level: 'beginner', duration: '', price: '0', is_published: false, category_id: '', instructor_id: '', thumbnail: '' }
const emptyLessonForm: LessonForm = { title: '', content: '', video_url: '', duration_minutes: '10', order: '0' }

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

  // Lesson Management states
  const [lessonsCourse, setLessonsCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loadingLessons, setLoadingLessons] = useState(false)
  const [lessonModalOpen, setLessonModalOpen] = useState(false)
  const [editLesson, setEditLesson] = useState<Lesson | null>(null)
  const [lessonForm, setLessonForm] = useState<LessonForm>(emptyLessonForm)
  const [savingLesson, setSavingLesson] = useState(false)
  const [deleteLessonId, setDeleteLessonId] = useState<number | null>(null)

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
    // Optimistically update local state — no full reload needed
    setCourses((prev) =>
      prev.map((course) =>
        course.id === c.id ? { ...course, is_published: !course.is_published } : course
      )
    )
    try {
      await coursesAPI.update(c.id, { is_published: !c.is_published })
      toast.success(`Course ${c.is_published ? 'unpublished' : 'published'}`)
    } catch {
      // Revert on failure
      setCourses((prev) =>
        prev.map((course) =>
          course.id === c.id ? { ...course, is_published: c.is_published } : course
        )
      )
      toast.error('Update failed')
    }
  }

  // ── Lessons Handlers ────────────────────────────────────────────────────────

  const fetchLessons = async (courseId: number) => {
    setLoadingLessons(true)
    try {
      const res = await coursesAPI.listLessons(courseId)
      setLessons(res.data.lessons || [])
    } catch {
      toast.error('Failed to load lessons')
    } finally {
      setLoadingLessons(false)
    }
  }

  const openLessonsModal = (c: Course) => {
    setLessonsCourse(c)
    setEditLesson(null)
    setLessonForm(emptyLessonForm)
    setLessonModalOpen(false)
    fetchLessons(c.id)
  }

  const openCreateLesson = () => {
    setEditLesson(null)
    setLessonForm({ ...emptyLessonForm, order: String(lessons.length) })
    setLessonModalOpen(true)
  }

  const openEditLesson = (l: Lesson) => {
    setEditLesson(l)
    setLessonForm({
      title: l.title,
      content: l.content || '',
      video_url: l.video_url || '',
      duration_minutes: String(l.duration_minutes || 0),
      order: String(l.order || 0),
    })
    setLessonModalOpen(true)
  }

  const handleSaveLesson = async () => {
    if (!lessonsCourse) return
    if (!lessonForm.title.trim()) { toast.error('Lesson title required'); return }
    setSavingLesson(true)
    try {
      const payload = {
        title: lessonForm.title.trim(),
        content: lessonForm.content || '',
        video_url: lessonForm.video_url || '',
        duration_minutes: parseInt(lessonForm.duration_minutes) || 0,
        order: parseInt(lessonForm.order) || 0,
      }
      if (editLesson) {
        await coursesAPI.updateLesson(lessonsCourse.id, editLesson.id, payload)
        toast.success('Lesson updated')
      } else {
        await coursesAPI.createLesson(lessonsCourse.id, payload)
        toast.success('Lesson created')
      }
      setLessonModalOpen(false)
      fetchLessons(lessonsCourse.id)
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save lesson')
    } finally {
      setSavingLesson(false)
    }
  }

  const handleDeleteLesson = async () => {
    if (!lessonsCourse || !deleteLessonId) return
    try {
      await coursesAPI.deleteLesson(lessonsCourse.id, deleteLessonId)
      toast.success('Lesson deleted')
      setDeleteLessonId(null)
      fetchLessons(lessonsCourse.id)
      load()
    } catch {
      toast.error('Failed to delete lesson')
    }
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
    { key: 'lesson_count', label: 'Lessons', render: (c: Course) => <span className="badge badge-primary">{c.lesson_count}</span> },
    { key: 'is_published', label: 'Status', render: (c: Course) => <span className={`badge ${c.is_published ? 'badge-success' : 'badge-warning'}`}>{c.is_published ? 'Published' : 'Draft'}</span> },
  ]

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const setL = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setLessonForm((prev) => ({ ...prev, [field]: e.target.value }))

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
            <button className="btn-secondary" style={{ padding: '0.35rem 0.65rem' }} onClick={() => openLessonsModal(c)} title="Manage Lessons">
              <BookOpen size={14} />
            </button>
            <button className="btn-secondary" style={{ padding: '0.35rem 0.65rem' }} onClick={() => openEdit(c)} title="Edit Course"><Pencil size={14} /></button>
            <button className="btn-secondary" style={{ padding: '0.35rem 0.65rem' }} onClick={() => handleTogglePublish(c)} title={c.is_published ? 'Unpublish' : 'Publish'}>
              {c.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button className="btn-danger" style={{ padding: '0.35rem 0.65rem' }} onClick={() => setDeleteId(c.id)} title="Delete Course"><Trash2 size={14} /></button>
          </div>
        )}
      />

      {/* Course Edit/Create Modal */}
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

      {/* Lessons List Drawer / Modal */}
      <Modal isOpen={!!lessonsCourse} onClose={() => setLessonsCourse(null)} title={`Lessons: ${lessonsCourse?.title || ''}`} maxWidth={720}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {lessons.length} lesson{lessons.length === 1 ? '' : 's'} in this course
            </span>
            <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={openCreateLesson}>
              <Plus size={15} /> Add Lesson
            </button>
          </div>

          {loadingLessons ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading lessons…</div>
          ) : lessons.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-input)', borderRadius: 12, border: '1px dashed var(--border)' }}>
              <BookOpen size={32} color="var(--primary)" style={{ marginBottom: '0.5rem', opacity: 0.8 }} />
              <p style={{ fontWeight: 600 }}>No lessons added yet</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Click "Add Lesson" above to create the first lesson for this course.</p>
              <button className="btn-primary" onClick={openCreateLesson} style={{ margin: '0 auto' }}>
                <Plus size={15} /> Add First Lesson
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {lessons.map((lesson, idx) => (
                <div key={lesson.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {idx + 1}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>{lesson.title}</h4>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.2rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {lesson.duration_minutes > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} /> {lesson.duration_minutes} mins</span>}
                        {lesson.video_url && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Video size={12} /> Video attached</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="btn-secondary" style={{ padding: '0.3rem 0.5rem' }} onClick={() => openEditLesson(lesson)} title="Edit Lesson">
                      <Pencil size={13} />
                    </button>
                    <button className="btn-danger" style={{ padding: '0.3rem 0.5rem' }} onClick={() => setDeleteLessonId(lesson.id)} title="Delete Lesson">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button className="btn-secondary" onClick={() => setLessonsCourse(null)}>Close</button>
          </div>
        </div>
      </Modal>

      {/* Add / Edit Single Lesson Form Modal */}
      <Modal isOpen={lessonModalOpen} onClose={() => setLessonModalOpen(false)} title={editLesson ? 'Edit Lesson' : 'Add New Lesson'} maxWidth={540}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Lesson Title *</label>
            <input className="input" placeholder="e.g. Introduction to Variables" value={lessonForm.title} onChange={setL('title')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Duration (minutes)</label>
              <input className="input" type="number" min="0" placeholder="10" value={lessonForm.duration_minutes} onChange={setL('duration_minutes')} />
            </div>
            <div className="form-group">
              <label>Display Order</label>
              <input className="input" type="number" min="0" placeholder="0" value={lessonForm.order} onChange={setL('order')} />
            </div>
          </div>
          <div className="form-group">
            <label>Video URL (Optional)</label>
            <input className="input" placeholder="https://www.youtube.com/watch?v=..." value={lessonForm.video_url} onChange={setL('video_url')} />
          </div>
          <div className="form-group">
            <label>Lesson Content / Notes</label>
            <textarea className="input" rows={5} placeholder="Write lesson content, markdown, or instructions here…" value={lessonForm.content} onChange={setL('content')} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setLessonModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSaveLesson} disabled={savingLesson}>
              {savingLesson ? <div className="spinner" style={{ width: 16, height: 16 }} /> : null}
              {savingLesson ? 'Saving…' : editLesson ? 'Update Lesson' : 'Save Lesson'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Course Delete Confirmation */}
      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete Course" message="This will permanently delete the course and all associated lessons, assignments, and quizzes." confirmLabel="Delete" />

      {/* Lesson Delete Confirmation */}
      <ConfirmModal isOpen={!!deleteLessonId} onClose={() => setDeleteLessonId(null)} onConfirm={handleDeleteLesson}
        title="Delete Lesson" message="Are you sure you want to delete this lesson? Students will no longer be able to view it." confirmLabel="Delete" />
    </div>
  )
}

