import React, { useEffect, useState, useCallback } from 'react'
import { assignmentsAPI } from '../../api'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { PageLoader } from '../../components/Spinner'
import { FileText, Send, Calendar, CheckCircle2, Clock, Star } from 'lucide-react'

interface Assignment {
  id: number
  course_id: number
  course_title?: string
  title: string
  description: string
  due_date: string | null
  max_score: number
  created_at: string
}

interface Submission {
  id: number
  assignment_id: number
  content: string
  file_url: string | null
  submitted_at: string
  score: number | null
  max_score: number
  feedback: string | null
  status: string
}

export const StudentAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [submissions, setSubmissions] = useState<Record<number, Submission>>({})
  const [loading, setLoading] = useState(true)
  const [submitModalAssignment, setSubmitModalAssignment] = useState<Assignment | null>(null)
  const [content, setContent] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [assRes, subRes] = await Promise.all([
        assignmentsAPI.list({ per_page: 50 }),
        assignmentsAPI.mySubmissions({ per_page: 100 }),
      ])
      setAssignments(assRes.data.assignments || [])

      const subMap: Record<number, Submission> = {}
      if (subRes.data.submissions) {
        subRes.data.submissions.forEach((s: Submission) => {
          subMap[s.assignment_id] = s
        })
      }
      setSubmissions(subMap)
    } catch {
      toast.error('Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openSubmit = (a: Assignment) => {
    const existing = submissions[a.id]
    setSubmitModalAssignment(a)
    setContent(existing?.content || '')
    setFileUrl(existing?.file_url || '')
  }

  const handleSubmit = async () => {
    if (!submitModalAssignment) return
    if (!content.trim() && !fileUrl.trim()) {
      toast.error('Please enter response text or a file/link URL')
      return
    }
    setSubmitting(true)
    try {
      await assignmentsAPI.submit(submitModalAssignment.id, {
        content: content.trim(),
        file_url: fileUrl.trim() || undefined,
      })
      toast.success('Assignment submitted successfully! 🚀')
      setSubmitModalAssignment(null)
      loadData()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>My Assignments</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>View, submit, and track feedback for all course assignments.</p>
      </div>

      {assignments.length === 0 ? (
        <div className="glass" style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <FileText size={44} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3>No assignments yet</h3>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Assignments posted by your instructors will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {assignments.map((a) => {
            const sub = submissions[a.id]
            const isSubmitted = !!sub
            const isGraded = sub?.status === 'graded'

            return (
              <div key={a.id} className="glass" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem', borderRadius: 14 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span className="badge badge-primary">{a.course_title || 'Course Assignment'}</span>
                    {isGraded ? (
                      <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Star size={12} /> {sub.score}/{a.max_score} pts
                      </span>
                    ) : isSubmitted ? (
                      <span className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle2 size={12} /> Submitted
                      </span>
                    ) : (
                      <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} /> Pending
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.4rem' }}>{a.title}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '0.85rem' }}>
                    {a.description || 'No description provided.'}
                  </p>

                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>Max Points: <strong style={{ color: 'var(--text)' }}>{a.max_score}</strong></span>
                    {a.due_date && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={13} /> {new Date(a.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {sub?.feedback && (
                    <div style={{ marginTop: '0.85rem', padding: '0.75rem', background: 'rgba(16,185,129,0.1)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)' }}>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981', marginBottom: '0.25rem' }}>Instructor Feedback:</p>
                      <p style={{ fontSize: '0.825rem', color: 'var(--text)' }}>{sub.feedback}</p>
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button className={isSubmitted ? 'btn-secondary' : 'btn-primary'} style={{ width: '100%', justifyContent: 'center' }} onClick={() => openSubmit(a)}>
                    <Send size={15} /> {isSubmitted ? 'View / Resubmit' : 'Submit Assignment'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Submission Modal */}
      <Modal isOpen={!!submitModalAssignment} onClose={() => setSubmitModalAssignment(null)} title={`Submit: ${submitModalAssignment?.title || ''}`} maxWidth={540}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {submitModalAssignment?.description}
          </p>

          <div className="form-group">
            <label>Submission Text / Answer *</label>
            <textarea className="input" rows={5} placeholder="Type your answer, solution, or notes here…" value={content} onChange={(e) => setContent(e.target.value)} style={{ resize: 'vertical' }} />
          </div>

          <div className="form-group">
            <label>Attachment URL / Link (Optional)</label>
            <input className="input" placeholder="https://github.com/… or Google Docs link" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setSubmitModalAssignment(null)}>Cancel</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <Send size={15} />}
              {submitting ? 'Submitting…' : 'Submit Assignment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
