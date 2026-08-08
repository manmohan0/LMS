import React, { useEffect, useState, useCallback } from 'react'
import { quizzesAPI } from '../../api'
import { useToast } from '../../components/Toast'
import { PageLoader } from '../../components/Spinner'
import { Modal } from '../../components/Modal'
import { Clock, CheckCircle, XCircle, Play, Award } from 'lucide-react'

interface Quiz { id: number; title: string; course_title: string; time_limit_minutes: number; pass_score: number; question_count: number; total_points: number; is_published: boolean }
interface Question { id: number; text: string; question_type: string; points: number; choices: { id: number; text: string }[] }

export const StudentQuizzes: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [quizModal, setQuizModal] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const toast = useToast()

  useEffect(() => {
    quizzesAPI.list()
      .then((r) => setQuizzes(r.data.quizzes))
      .catch(() => toast.error('Failed to load quizzes'))
      .finally(() => setLoading(false))
  }, [])

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return
    const t = setInterval(() => setTimeLeft((p) => (p !== null ? p - 1 : null)), 1000)
    return () => clearInterval(t)
  }, [timeLeft])

  const startQuiz = async (quiz: Quiz) => {
    try {
      const res = await quizzesAPI.get(quiz.id)
      setQuestions(res.data.quiz.questions || [])
      setAnswers({})
      setResult(null)
      setQuizModal(quiz)
      if (quiz.time_limit_minutes) setTimeLeft(quiz.time_limit_minutes * 60)
    } catch { toast.error('Failed to load quiz') }
  }

  const handleSubmit = async () => {
    if (!quizModal) return
    setSubmitting(true)
    try {
      const answersPayload = Object.entries(answers).map(([qid, cid]) => ({ question_id: parseInt(qid), choice_id: cid }))
      const res = await quizzesAPI.submitAttempt(quizModal.id, answersPayload)
      setResult(res.data.attempt)
      setTimeLeft(null)
    } catch (err: any) { toast.error(err.response?.data?.error || 'Submit failed') }
    finally { setSubmitting(false) }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  if (loading) return <PageLoader />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>My Quizzes</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{quizzes.length} quizzes available</p>
      </div>

      {quizzes.length === 0 ? (
        <div className="empty-state"><p>No quizzes available yet. Enroll in courses to access quizzes.</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {quizzes.map((q) => (
            <div key={q.id} className="glass" style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '0.5rem', fontWeight: 600 }}>{q.course_title}</p>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>{q.title}</h3>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <span className="badge badge-primary">{q.question_count} questions</span>
                <span className="badge badge-info">{q.total_points} pts</span>
                {q.time_limit_minutes && <span className="badge badge-warning"><Clock size={11} /> {q.time_limit_minutes}m</span>}
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Pass score: <strong style={{ color: 'var(--text)' }}>{q.pass_score}%</strong></p>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => startQuiz(q)}>
                <Play size={15} /> Start Quiz
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Quiz modal */}
      <Modal isOpen={!!quizModal} onClose={() => { setQuizModal(null); setTimeLeft(null); setResult(null) }} title={result ? '🎯 Quiz Results' : quizModal?.title || ''} maxWidth={640}>
        {result ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              {result.passed ? <CheckCircle size={64} color="#10b981" style={{ margin: '0 auto' }} /> : <XCircle size={64} color="#ef4444" style={{ margin: '0 auto' }} />}
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '1rem', color: result.passed ? '#10b981' : '#ef4444' }}>
                {result.passed ? 'Passed! 🎉' : 'Not Passed'}
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Score', value: `${result.score}/${result.max_score}` },
                { label: 'Percentage', value: `${result.percentage}%` },
                { label: 'Status', value: result.passed ? 'Passed' : 'Failed' },
              ].map((item) => (
                <div key={item.label} style={{ background: 'var(--bg-input)', borderRadius: 10, padding: '1rem' }}>
                  <p style={{ fontSize: '1.25rem', fontWeight: 800, color: result.passed ? '#10b981' : '#ef4444' }}>{item.value}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.label}</p>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'left', maxHeight: 300, overflowY: 'auto' }}>
              {result.answers?.map((a: any, i: number) => (
                <div key={a.id} style={{ padding: '0.875rem', borderRadius: 10, marginBottom: '0.5rem', background: a.is_correct ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${a.is_correct ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>{i + 1}. {a.question_text}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Your answer: <span style={{ color: a.is_correct ? '#10b981' : '#ef4444', fontWeight: 600 }}>{a.selected_choice_text || 'Not answered'}</span>
                    {!a.is_correct && <span style={{ color: '#10b981', marginLeft: '0.5rem' }}>(+{a.points_earned === 0 ? '0' : a.points_earned}pts)</span>}
                  </p>
                </div>
              ))}
            </div>
            <button className="btn-primary" style={{ marginTop: '1.5rem', justifyContent: 'center' }} onClick={() => { setQuizModal(null); setResult(null) }}>Done</button>
          </div>
        ) : (
          <div>
            {timeLeft !== null && (
              <div style={{ background: timeLeft < 60 ? 'rgba(239,68,68,0.1)' : 'rgba(6,182,212,0.1)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <Clock size={18} color={timeLeft < 60 ? '#ef4444' : '#06b6d4'} />
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: timeLeft < 60 ? '#ef4444' : '#06b6d4' }}>{formatTime(timeLeft)}</span>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '60vh', overflowY: 'auto' }}>
              {questions.map((q, qi) => (
                <div key={q.id} style={{ background: 'var(--bg-input)', borderRadius: 12, padding: '1.25rem' }}>
                  <p style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.95rem' }}>{qi + 1}. {q.text} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.82rem' }}>({q.points}pts)</span></p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {q.choices.map((c) => (
                      <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.625rem 0.875rem', borderRadius: 8, background: answers[q.id] === c.id ? 'rgba(99,102,241,0.2)' : 'var(--bg)', border: `1px solid ${answers[q.id] === c.id ? 'var(--primary)' : 'transparent'}`, transition: 'all 0.15s' }}>
                        <input type="radio" name={`q-${q.id}`} value={c.id} checked={answers[q.id] === c.id} onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: c.id }))} style={{ accentColor: 'var(--primary)' }} />
                        <span style={{ fontSize: '0.9rem' }}>{c.text}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn-secondary" onClick={() => setQuizModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={submitting || Object.keys(answers).length === 0}>
                {submitting ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <Award size={15} />}
                {submitting ? 'Submitting…' : 'Submit Quiz'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
