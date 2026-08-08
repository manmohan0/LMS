import React, { useEffect, useState, useCallback } from 'react'
import { useAtom } from 'jotai'
import { currentUserAtom } from '../../atoms'
import { assignmentsAPI, coursesAPI } from '../../api'
import { DataTable } from '../../components/DataTable'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Star, Plus, FileText, Calendar } from 'lucide-react'

interface Submission {
  id: number; assignment_id: number; assignment_title: string; student_id: number; student_name: string
  content: string; file_url: string; submitted_at: string; score: number | null; max_score: number
  feedback: string; status: string
}

interface AssignmentForm {
  course_id: string
  title: string
  description: string
  due_date: string
  max_score: string
}

const emptyAssignmentForm: AssignmentForm = {
  course_id: '',
  title: '',
  description: '',
  due_date: '',
  max_score: '100',
}

export const GradingInterface: React.FC = () => {
  const [user] = useAtom(currentUserAtom)
  const [assignments, setAssignments] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [gradeModal, setGradeModal] = useState<Submission | null>(null)
  const [score, setScore] = useState('')
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  // Create Assignment state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>(emptyAssignmentForm)
  const [creatingAssignment, setCreatingAssignment] = useState(false)

  const loadAssignments = useCallback(async () => {
    try {
      const res = await assignmentsAPI.list()
      setAssignments(res.data.assignments || [])
    } catch {
      toast.error('Failed to load assignments')
    }
  }, [])

  useEffect(() => {
    loadAssignments()
    const fetcher = user?.role === 'instructor' ? coursesAPI.myCourses : coursesAPI.listAll
    fetcher({ per_page: 100 }).then((r) => setCourses(r.data.courses || []))
  }, [loadAssignments, user])

  const loadSubmissions = useCallback(async () => {
    if (!selectedAssignment) return
    setLoading(true)
    try {
      const res = await assignmentsAPI.listSubmissions(selectedAssignment.id, { page, per_page: 10 })
      setSubmissions(res.data.submissions)
      setTotal(res.data.meta.total)
    } catch { toast.error('Failed to load submissions') }
    finally { setLoading(false) }
  }, [selectedAssignment, page])

  useEffect(() => { loadSubmissions() }, [loadSubmissions])

  const openGrade = (sub: Submission) => {
    setGradeModal(sub)
    setScore(String(sub.score ?? ''))
    setFeedback(sub.feedback || '')
  }

  const handleGrade = async () => {
    if (!gradeModal) return
    setSaving(true)
    try {
      await assignmentsAPI.grade(gradeModal.id, { score: parseFloat(score), feedback })
      toast.success('Graded successfully!')
      setGradeModal(null)
      loadSubmissions()
    } catch (err: any) { toast.error(err.response?.data?.error || 'Grade failed') }
    finally { setSaving(false) }
  }

  const handleCreateAssignment = async () => {
    if (!assignmentForm.course_id) { toast.error('Please select a course'); return }
    if (!assignmentForm.title.trim()) { toast.error('Assignment title required'); return }
    setCreatingAssignment(true)
    try {
      const payload: any = {
        course_id: parseInt(assignmentForm.course_id),
        title: assignmentForm.title.trim(),
        description: assignmentForm.description.trim() || undefined,
        max_score: parseFloat(assignmentForm.max_score) || 100,
      }
      if (assignmentForm.due_date) {
        const dueDateObj = new Date(assignmentForm.due_date)
        if (dueDateObj <= new Date()) {
          toast.error('Due date must be in the future ⏰')
          return
        }
        payload.due_date = dueDateObj.toISOString()
      }
      const res = await assignmentsAPI.create(payload)
      toast.success('Assignment created successfully! 📝')
      setCreateModalOpen(false)
      setAssignmentForm(emptyAssignmentForm)
      await loadAssignments()
      if (res.data.assignment) {
        setSelectedAssignment(res.data.assignment)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create assignment')
    } finally {
      setCreatingAssignment(false)
    }
  }

  const statusBadge = (s: string) => <span className={`badge ${s === 'graded' ? 'badge-success' : s === 'returned' ? 'badge-warning' : 'badge-info'}`}>{s}</span>

  const columns = [
    { key: 'student_name', label: 'Student' },
    { key: 'submitted_at', label: 'Submitted', render: (s: Submission) => new Date(s.submitted_at).toLocaleString() },
    { key: 'score', label: 'Score', render: (s: Submission) => s.score !== null ? `${s.score}/${s.max_score}` : '—' },
    { key: 'status', label: 'Status', render: (s: Submission) => statusBadge(s.status) },
    { key: 'content', label: 'Preview', render: (s: Submission) => <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{(s.content || 'File submission').slice(0, 50)}…</span> },
  ]

  const setForm = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setAssignmentForm((prev) => ({ ...prev, [field]: e.target.value }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Assignments & Grading Center</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Create assignments and grade student submissions.</p>
        </div>
        <button className="btn-primary" onClick={() => setCreateModalOpen(true)}>
          <Plus size={16} /> Create Assignment
        </button>
      </div>

      {/* Assignment selector */}
      <div className="glass" style={{ padding: '1.25rem' }}>
        <label style={{ fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block', color: 'var(--text-muted)' }}>Select Assignment</label>
        <select className="input" style={{ maxWidth: 450 }} value={selectedAssignment?.id || ''} onChange={(e) => setSelectedAssignment(assignments.find((a) => a.id === parseInt(e.target.value)) || null)}>
          <option value="">— Choose an assignment —</option>
          {assignments.map((a) => <option key={a.id} value={a.id}>{a.course_title} — {a.title} ({a.submission_count} submissions)</option>)}
        </select>
      </div>

      {selectedAssignment ? (
        <DataTable
          data={submissions} columns={columns} loading={loading}
          total={total} page={page} perPage={10} onPageChange={setPage}
          title={`Submissions for: ${selectedAssignment.title}`}
          actions={(s) => (
            <button className="btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => openGrade(s)}>
              <Star size={13} /> Grade
            </button>
          )}
        />
      ) : (
        <div className="empty-state">
          <p>Select an assignment above to view submissions, or click <strong>"+ Create Assignment"</strong> to add a new one.</p>
        </div>
      )}

      {/* Create Assignment Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New Assignment" maxWidth={540}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Course *</label>
            <select className="input" value={assignmentForm.course_id} onChange={setForm('course_id')}>
              <option value="">— Select Course —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Assignment Title *</label>
            <input className="input" placeholder="e.g. Assignment 1: Python Data Structures" value={assignmentForm.title} onChange={setForm('title')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Max Score (Points)</label>
              <input className="input" type="number" min="1" placeholder="100" value={assignmentForm.max_score} onChange={setForm('max_score')} />
            </div>
            <div className="form-group">
              <label>Due Date & Time</label>
              <input
                className="input"
                type="datetime-local"
                min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                value={assignmentForm.due_date}
                onChange={setForm('due_date')}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Instructions / Description</label>
            <textarea className="input" rows={4} placeholder="Describe task requirements, submission format, guidelines…" value={assignmentForm.description} onChange={setForm('description')} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setCreateModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleCreateAssignment} disabled={creatingAssignment}>
              {creatingAssignment ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <Plus size={15} />}
              {creatingAssignment ? 'Creating…' : 'Create Assignment'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Grade modal */}
      <Modal isOpen={!!gradeModal} onClose={() => setGradeModal(null)} title="Grade Submission">
        {gradeModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'var(--bg-input)', borderRadius: 10, padding: '1rem' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Student: <strong style={{ color: 'var(--text)' }}>{gradeModal.student_name}</strong></p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Submitted: {new Date(gradeModal.submitted_at).toLocaleString()}</p>
              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '0.875rem', fontFamily: 'monospace', fontSize: '0.85rem', maxHeight: 200, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {gradeModal.content || gradeModal.file_url || 'No content'}
              </div>
            </div>
            <div className="form-group">
              <label>Score (max: {gradeModal.max_score})</label>
              <input className="input" type="number" min="0" max={gradeModal.max_score} step="0.5" placeholder={`0 – ${gradeModal.max_score}`} value={score} onChange={(e) => setScore(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Feedback</label>
              <textarea className="input" rows={3} placeholder="Write feedback for the student…" value={feedback} onChange={(e) => setFeedback(e.target.value)} style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setGradeModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleGrade} disabled={saving || !score}>
                {saving ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <Star size={15} />}
                {saving ? 'Saving…' : 'Submit Grade'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

