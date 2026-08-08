import React, { useEffect, useState, useCallback } from 'react'
import { useAtom } from 'jotai'
import { currentUserAtom } from '../../atoms'
import { assignmentsAPI } from '../../api'
import { DataTable } from '../../components/DataTable'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Star } from 'lucide-react'

interface Submission {
  id: number; assignment_id: number; assignment_title: string; student_id: number; student_name: string
  content: string; file_url: string; submitted_at: string; score: number | null; max_score: number
  feedback: string; status: string
}

export const GradingInterface: React.FC = () => {
  const [user] = useAtom(currentUserAtom)
  const [assignments, setAssignments] = useState<any[]>([])
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

  useEffect(() => {
    assignmentsAPI.list().then((r) => setAssignments(r.data.assignments))
  }, [])

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

  const statusBadge = (s: string) => <span className={`badge ${s === 'graded' ? 'badge-success' : s === 'returned' ? 'badge-warning' : 'badge-info'}`}>{s}</span>

  const columns = [
    { key: 'student_name', label: 'Student' },
    { key: 'submitted_at', label: 'Submitted', render: (s: Submission) => new Date(s.submitted_at).toLocaleString() },
    { key: 'score', label: 'Score', render: (s: Submission) => s.score !== null ? `${s.score}/${s.max_score}` : '—' },
    { key: 'status', label: 'Status', render: (s: Submission) => statusBadge(s.status) },
    { key: 'content', label: 'Preview', render: (s: Submission) => <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{(s.content || 'File submission').slice(0, 50)}…</span> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Grading Center</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Review and grade student assignment submissions.</p>
      </div>

      {/* Assignment selector */}
      <div className="glass" style={{ padding: '1.25rem' }}>
        <label style={{ fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block', color: 'var(--text-muted)' }}>Select Assignment</label>
        <select className="input" style={{ maxWidth: 400 }} value={selectedAssignment?.id || ''} onChange={(e) => setSelectedAssignment(assignments.find((a) => a.id === parseInt(e.target.value)) || null)}>
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
          <p>Select an assignment above to view submissions</p>
        </div>
      )}

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
