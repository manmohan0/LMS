import React, { useEffect, useState, useCallback } from 'react'
import { useAtom } from 'jotai'
import { currentUserAtom } from '../../atoms'
import { quizzesAPI, coursesAPI } from '../../api'
import { Modal, ConfirmModal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { PageLoader } from '../../components/Spinner'
import { Plus, Trash2, Eye, EyeOff, HelpCircle, CheckCircle2, Clock, Award } from 'lucide-react'

interface Quiz {
  id: number
  course_id: number
  course_title?: string
  title: string
  description?: string
  time_limit_minutes?: number
  pass_score: number
  is_published: boolean
  question_count: number
  total_points: number
  created_at: string
}

interface ChoiceInput {
  text: string
  is_correct: boolean
}

export const QuizBuilder: React.FC = () => {
  const [user] = useAtom(currentUserAtom)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  // Quiz Modal State
  const [quizModalOpen, setQuizModalOpen] = useState(false)
  const [quizForm, setQuizForm] = useState({
    course_id: '',
    title: '',
    description: '',
    time_limit_minutes: '15',
    pass_score: '60',
    is_published: true,
  })
  const [savingQuiz, setSavingQuiz] = useState(false)
  const [deleteQuizId, setDeleteQuizId] = useState<number | null>(null)

  // Question Management State
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
  const [quizQuestions, setQuizQuestions] = useState<any[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [questionModalOpen, setQuestionModalOpen] = useState(false)

  const [qText, setQText] = useState('')
  const [qType, setQType] = useState<'mcq' | 'true_false'>('mcq')
  const [qPoints, setQPoints] = useState('1')
  const [choices, setChoices] = useState<ChoiceInput[]>([
    { text: 'Option A', is_correct: true },
    { text: 'Option B', is_correct: false },
    { text: 'Option C', is_correct: false },
    { text: 'Option D', is_correct: false },
  ])
  const [savingQuestion, setSavingQuestion] = useState(false)
  const [deleteQuestionId, setDeleteQuestionId] = useState<number | null>(null)

  const formatMinutes = (mins?: number) => {
    if (!mins || mins <= 0) return ''
    const h = Math.floor(mins / 60)
    const m = mins % 60
    if (h > 0 && m > 0) return `${h}h ${m}m`
    if (h > 0) return `${h}h`
    return `${m}m`
  }

  const loadQuizzes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await quizzesAPI.list({ per_page: 100 })
      setQuizzes(res.data.quizzes || [])
    } catch {
      toast.error('Failed to load quizzes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadQuizzes()
    const fetcher = user?.role === 'instructor' ? coursesAPI.myCourses : coursesAPI.listAll
    fetcher({ per_page: 100 }).then((r) => setCourses(r.data.courses || []))
  }, [loadQuizzes, user])

  const fetchQuestions = async (quizId: number) => {
    setLoadingQuestions(true)
    try {
      const res = await quizzesAPI.get(quizId)
      setQuizQuestions(res.data.quiz?.questions || [])
    } catch {
      toast.error('Failed to load quiz details')
    } finally {
      setLoadingQuestions(false)
    }
  }

  const openManageQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz)
    fetchQuestions(quiz.id)
  }

  const handleSaveQuiz = async () => {
    if (!quizForm.course_id) { toast.error('Please select a course'); return }
    if (!quizForm.title.trim()) { toast.error('Quiz title required'); return }
    setSavingQuiz(true)
    try {
      const payload = {
        course_id: parseInt(quizForm.course_id),
        title: quizForm.title.trim(),
        description: quizForm.description.trim() || undefined,
        time_limit_minutes: quizForm.time_limit_minutes ? parseInt(quizForm.time_limit_minutes) : undefined,
        pass_score: parseFloat(quizForm.pass_score) || 60,
        is_published: quizForm.is_published,
      }
      await quizzesAPI.create(payload)
      toast.success('Quiz created successfully! 🎯')
      setQuizModalOpen(false)
      setQuizForm({ course_id: '', title: '', description: '', time_limit_minutes: '15', pass_score: '60', is_published: true })
      loadQuizzes()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create quiz')
    } finally {
      setSavingQuiz(false)
    }
  }

  const handleTogglePublish = async (quiz: Quiz) => {
    try {
      await quizzesAPI.update(quiz.id, { is_published: !quiz.is_published })
      toast.success(`Quiz ${quiz.is_published ? 'unpublished' : 'published'}`)
      loadQuizzes()
    } catch {
      toast.error('Failed to update quiz status')
    }
  }

  const handleDeleteQuiz = async () => {
    if (!deleteQuizId) return
    try {
      await quizzesAPI.delete(deleteQuizId)
      toast.success('Quiz deleted')
      setDeleteQuizId(null)
      if (selectedQuiz?.id === deleteQuizId) setSelectedQuiz(null)
      loadQuizzes()
    } catch {
      toast.error('Failed to delete quiz')
    }
  }

  // Question Management
  const handleQuestionTypeChange = (type: 'mcq' | 'true_false') => {
    setQType(type)
    if (type === 'true_false') {
      setChoices([
        { text: 'True', is_correct: true },
        { text: 'False', is_correct: false },
      ])
    } else {
      setChoices([
        { text: '', is_correct: true },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
      ])
    }
  }

  const openAddQuestion = () => {
    setQText('')
    setQType('mcq')
    setQPoints('1')
    setChoices([
      { text: '', is_correct: true },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
    ])
    setQuestionModalOpen(true)
  }

  const handleChoiceTextChange = (index: number, text: string) => {
    setChoices((prev) => {
      const next = [...prev]
      next[index].text = text
      return next
    })
  }

  const setCorrectChoice = (index: number) => {
    setChoices((prev) =>
      prev.map((c, i) => ({ ...c, is_correct: i === index }))
    )
  }

  const handleAddQuestion = async () => {
    if (!selectedQuiz) return
    if (!qText.trim()) { toast.error('Question text required'); return }
    const validChoices = choices.filter((c) => c.text.trim())
    if (validChoices.length < 2) { toast.error('Please provide at least 2 choices'); return }
    if (!validChoices.some((c) => c.is_correct)) { toast.error('Mark one choice as correct'); return }

    setSavingQuestion(true)
    try {
      await quizzesAPI.addQuestion(selectedQuiz.id, {
        text: qText.trim(),
        question_type: qType,
        points: parseFloat(qPoints) || 1,
        choices: validChoices,
      })
      toast.success('Question added!')
      setQuestionModalOpen(false)
      fetchQuestions(selectedQuiz.id)
      loadQuizzes()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add question')
    } finally {
      setSavingQuestion(false)
    }
  }

  const handleDeleteQuestion = async () => {
    if (!deleteQuestionId || !selectedQuiz) return
    try {
      await quizzesAPI.deleteQuestion(deleteQuestionId)
      toast.success('Question removed')
      setDeleteQuestionId(null)
      fetchQuestions(selectedQuiz.id)
      loadQuizzes()
    } catch {
      toast.error('Failed to remove question')
    }
  }

  if (loading) return <PageLoader />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Quiz Builder & Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Create quizzes, add multiple choice questions, and configure pass criteria.</p>
        </div>
        <button className="btn-primary" onClick={() => setQuizModalOpen(true)}>
          <Plus size={16} /> Create Quiz
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedQuiz ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
        {/* Quiz List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>All Quizzes ({quizzes.length})</h3>
          {quizzes.length === 0 ? (
            <div className="glass" style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <HelpCircle size={44} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p style={{ fontWeight: 600 }}>No quizzes created yet</p>
              <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Click "+ Create Quiz" above to build your first quiz.</p>
              <button className="btn-primary" style={{ margin: '0 auto' }} onClick={() => setQuizModalOpen(true)}>
                <Plus size={15} /> Create Quiz
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {quizzes.map((q) => (
                <div
                  key={q.id}
                  className="glass"
                  style={{
                    padding: '1.1rem 1.25rem',
                    borderRadius: 12,
                    border: selectedQuiz?.id === q.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onClick={() => openManageQuiz(q)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <span className="badge badge-primary" style={{ marginBottom: '0.3rem', display: 'inline-block' }}>
                        {q.course_title || 'Course'}
                      </span>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{q.title}</h4>
                    </div>
                    <span className={`badge ${q.is_published ? 'badge-success' : 'badge-warning'}`}>
                      {q.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    {q.description || 'No description provided.'}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <span><HelpCircle size={13} /> {q.question_count} questions</span>
                      <span><Award size={13} /> Pass: {q.pass_score}%</span>
                      {q.time_limit_minutes && <span><Clock size={13} /> {formatMinutes(q.time_limit_minutes)}</span>}
                    </div>

                    <div style={{ display: 'flex', gap: '0.35rem' }} onClick={(e) => e.stopPropagation()}>
                      <button className="btn-secondary" style={{ padding: '0.3rem 0.5rem' }} onClick={() => handleTogglePublish(q)} title={q.is_published ? 'Unpublish' : 'Publish'}>
                        {q.is_published ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <button className="btn-danger" style={{ padding: '0.3rem 0.5rem' }} onClick={() => setDeleteQuizId(q.id)} title="Delete Quiz">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quiz Question Manager Pane */}
        {selectedQuiz && (
          <div className="glass" style={{ padding: '1.5rem', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Managing Questions</span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{selectedQuiz.title}</h3>
              </div>
              <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={openAddQuestion}>
                <Plus size={15} /> Add Question
              </button>
            </div>

            {loadingQuestions ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading questions…</div>
            ) : quizQuestions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'var(--bg-input)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                <HelpCircle size={36} color="var(--primary)" style={{ marginBottom: '0.5rem', opacity: 0.8 }} />
                <p style={{ fontWeight: 600 }}>No questions added to this quiz</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Click "+ Add Question" to write questions and choices.</p>
                <button className="btn-primary" style={{ margin: '0 auto' }} onClick={openAddQuestion}>
                  <Plus size={15} /> Add First Question
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '520px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {quizQuestions.map((q, qIdx) => (
                  <div key={q.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, flex: 1, paddingRight: '0.5rem' }}>
                        Q{qIdx + 1}. {q.text}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>{q.points} pt{q.points === 1 ? '' : 's'}</span>
                        <button className="btn-danger" style={{ padding: '0.25rem 0.45rem' }} onClick={() => setDeleteQuestionId(q.id)} title="Delete Question">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
                      {q.choices?.map((c: any, cIdx: number) => (
                        <div
                          key={c.id || cIdx}
                          style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: 8,
                            fontSize: '0.825rem',
                            background: c.is_correct ? 'rgba(16,185,129,0.15)' : 'var(--bg-input)',
                            border: c.is_correct ? '1px solid #10b981' : '1px solid transparent',
                            color: c.is_correct ? '#10b981' : 'var(--text)',
                            fontWeight: c.is_correct ? 600 : 400,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                          }}
                        >
                          {c.is_correct && <CheckCircle2 size={13} color="#10b981" />}
                          <span>{c.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Quiz Modal */}
      <Modal isOpen={quizModalOpen} onClose={() => setQuizModalOpen(false)} title="Create New Quiz" maxWidth={540}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Course *</label>
            <select className="input" value={quizForm.course_id} onChange={(e) => setQuizForm({ ...quizForm, course_id: e.target.value })}>
              <option value="">— Select Course —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Quiz Title *</label>
            <input className="input" placeholder="e.g. Midterm Quiz: Python Syntax" value={quizForm.title} onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Time Limit (minutes)</label>
              <input className="input" type="number" min="1" placeholder="15" value={quizForm.time_limit_minutes} onChange={(e) => setQuizForm({ ...quizForm, time_limit_minutes: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Passing Score (%)</label>
              <input className="input" type="number" min="1" max="100" placeholder="60" value={quizForm.pass_score} onChange={(e) => setQuizForm({ ...quizForm, pass_score: e.target.value })} />
            </div>
          </div>

          <div className="form-group">
            <label>Description / Instructions</label>
            <textarea className="input" rows={3} placeholder="Brief instructions for students..." value={quizForm.description} onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })} style={{ resize: 'vertical' }} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', padding: '0.75rem', background: 'var(--bg-input)', borderRadius: 10 }}>
            <input type="checkbox" checked={quizForm.is_published} onChange={(e) => setQuizForm({ ...quizForm, is_published: e.target.checked })} style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
            Publish immediately for students
          </label>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setQuizModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSaveQuiz} disabled={savingQuiz}>
              {savingQuiz ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <Plus size={15} />}
              {savingQuiz ? 'Creating…' : 'Create Quiz'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Question Modal */}
      <Modal isOpen={questionModalOpen} onClose={() => setQuestionModalOpen(false)} title={`Add Question to: ${selectedQuiz?.title}`} maxWidth={580}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Question Text *</label>
            <textarea className="input" rows={3} placeholder="e.g. Which keyword is used to define a function in Python?" value={qText} onChange={(e) => setQText(e.target.value)} style={{ resize: 'vertical' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Question Type</label>
              <select className="input" value={qType} onChange={(e) => handleQuestionTypeChange(e.target.value as any)}>
                <option value="mcq">Multiple Choice (MCQ)</option>
                <option value="true_false">True / False</option>
              </select>
            </div>
            <div className="form-group">
              <label>Points</label>
              <input className="input" type="number" min="0.5" step="0.5" value={qPoints} onChange={(e) => setQPoints(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label style={{ marginBottom: '0.5rem', display: 'block' }}>
              Choices & Correct Answer * {qType === 'true_false' && '(True or False)'}
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {choices.map((choice, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <input
                    type="radio"
                    name="correctChoice"
                    checked={choice.is_correct}
                    onChange={() => setCorrectChoice(idx)}
                    title="Mark as correct answer"
                    style={{ width: 18, height: 18, accentColor: '#10b981', cursor: 'pointer' }}
                  />
                  <input
                    className="input"
                    placeholder={`Choice ${idx + 1}`}
                    value={choice.text}
                    disabled={qType === 'true_false'}
                    onChange={(e) => handleChoiceTextChange(idx, e.target.value)}
                    style={qType === 'true_false' ? { fontWeight: 600, background: 'var(--bg-card)' } : {}}
                  />
                </div>
              ))}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'block' }}>
              Select the radio button next to the option that is the correct answer.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setQuestionModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleAddQuestion} disabled={savingQuestion}>
              {savingQuestion ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <Plus size={15} />}
              {savingQuestion ? 'Saving…' : 'Save Question'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete Quiz */}
      <ConfirmModal isOpen={!!deleteQuizId} onClose={() => setDeleteQuizId(null)} onConfirm={handleDeleteQuiz}
        title="Delete Quiz" message="Are you sure you want to delete this quiz and all its questions?" confirmLabel="Delete" />

      {/* Confirm Delete Question */}
      <ConfirmModal isOpen={!!deleteQuestionId} onClose={() => setDeleteQuestionId(null)} onConfirm={handleDeleteQuestion}
        title="Delete Question" message="Are you sure you want to remove this question?" confirmLabel="Delete" />
    </div>
  )
}
