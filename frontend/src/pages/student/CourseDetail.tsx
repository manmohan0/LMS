import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { coursesAPI, enrollmentsAPI } from '../../api'
import { useToast } from '../../components/Toast'
import { PageLoader } from '../../components/Spinner'
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  PlayCircle,
  BookOpen,
  Clock,
  GraduationCap,
  Award,
  FileText
} from 'lucide-react'

interface Lesson {
  id: number
  course_id: number
  title: string
  content?: string
  video_url?: string
  order: number
  duration_minutes: number
  is_completed?: boolean
}

interface Course {
  id: number
  title: string
  description: string
  thumbnail: string
  level: string
  duration: string
  price: number
  instructor_name: string
  category_name: string
  enrollment_count: number
  lesson_count: number
  lessons: Lesson[]
}

export const CourseDetail: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [course, setCourse] = useState<Course | null>(null)
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [progressPercent, setProgressPercent] = useState<number>(0)
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [enrolling, setEnrolling] = useState(false)

  const loadData = useCallback(async () => {
    if (!courseId) return
    const id = Number(courseId)
    setLoading(true)

    try {
      // 1. Fetch Course Detail
      const courseRes = await coursesAPI.get(id)
      const c: Course = courseRes.data.course
      setCourse(c)

      if (c.lessons && c.lessons.length > 0) {
        setActiveLesson(c.lessons[0])
      }

      // 2. Fetch Progress if Enrolled
      try {
        const progRes = await enrollmentsAPI.getCourseProgress(id)
        if (progRes.data) {
          setIsEnrolled(true)
          setProgressPercent(progRes.data.enrollment?.progress_percent || 0)
          const completedSet = new Set<number>()
          if (progRes.data.lesson_progress) {
            progRes.data.lesson_progress.forEach((lp: any) => {
              if (lp.is_completed) completedSet.add(lp.lesson_id)
            })
          }
          setCompletedLessonIds(completedSet)
        }
      } catch {
        // Not enrolled yet
        setIsEnrolled(false)
      }
    } catch (err: any) {
      toast.error('Failed to load course details')
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleEnroll = async () => {
    if (!course) return
    setEnrolling(true)
    try {
      await enrollmentsAPI.enroll(course.id)
      toast.success('Successfully enrolled in course! 🎉')
      setIsEnrolled(true)
      loadData()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Enrollment failed')
    } finally {
      setEnrolling(false)
    }
  }

  const handleCompleteLesson = async (lessonId: number) => {
    if (completedLessonIds.has(lessonId)) return
    setCompleting(true)
    try {
      const res = await enrollmentsAPI.completeLesson(lessonId)
      toast.success('Lesson marked as complete! 🌟')
      setCompletedLessonIds((prev) => new Set([...prev, lessonId]))
      if (res.data.progress_percent !== undefined) {
        setProgressPercent(res.data.progress_percent)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update lesson progress')
    } finally {
      setCompleting(false)
    }
  }

  if (loading) return <PageLoader />

  if (!course) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Course not found</h2>
        <button className="btn-secondary" onClick={() => navigate(-1)} style={{ marginTop: '1rem' }}>
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    )
  }

  const levelColor: Record<string, string> = {
    beginner: '#10b981',
    intermediate: '#f59e0b',
    advanced: '#ef4444'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <button
          className="btn-secondary"
          onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        {isEnrolled ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-glass)', padding: '0.5rem 1rem', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Overall Progress:</span>
            <div style={{ width: '120px' }}>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
            <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>{progressPercent}%</span>
            {progressPercent === 100 && (
              <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Award size={14} /> Completed
              </span>
            )}
          </div>
        ) : (
          <button className="btn-primary" onClick={handleEnroll} disabled={enrolling}>
            <GraduationCap size={18} /> {enrolling ? 'Enrolling…' : 'Enroll in Course'}
          </button>
        )}
      </div>

      {/* Course Banner */}
      <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '280px' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: `${levelColor[course.level]}20`, color: levelColor[course.level] }}>
              {course.level}
            </span>
            {course.category_name && <span className="badge badge-primary">{course.category_name}</span>}
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.75rem' }}>{course.title}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
            {course.description || 'No description provided for this course.'}
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <GraduationCap size={16} color="var(--primary)" /> Instructor: {course.instructor_name || 'Staff'}
            </span>
            {course.duration && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={16} color="var(--primary)" /> {course.duration}
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <BookOpen size={16} color="var(--primary)" /> {course.lessons?.length || 0} Lessons
            </span>
          </div>
        </div>
      </div>

      {/* Course Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: '1.5rem' }}>
        {/* Sidebar: Lessons List */}
        <div className="glass" style={{ padding: '1.25rem', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={18} color="var(--primary)" /> Course Modules
          </h3>
          {(!course.lessons || course.lessons.length === 0) ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No lessons available yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {course.lessons.map((lesson, index) => {
                const isActive = activeLesson?.id === lesson.id
                const isCompleted = completedLessonIds.has(lesson.id)

                return (
                  <div
                    key={lesson.id}
                    onClick={() => setActiveLesson(lesson)}
                    style={{
                      padding: '0.875rem 1rem',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-input)',
                      border: isActive ? '1px solid var(--primary)' : '1px solid transparent',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={18} color="#10b981" />
                    ) : isActive ? (
                      <PlayCircle size={18} color="var(--primary)" />
                    ) : (
                      <Circle size={18} color="var(--text-muted)" />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '0.875rem',
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? 'var(--primary)' : 'var(--text)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {index + 1}. {lesson.title}
                      </p>
                      {lesson.duration_minutes > 0 && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {lesson.duration_minutes} mins
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Main Content Area: Active Lesson */}
        <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {activeLesson ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Lesson Content
                  </span>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginTop: '0.2rem' }}>
                    {activeLesson.title}
                  </h2>
                </div>
                {isEnrolled && (
                  <button
                    className={completedLessonIds.has(activeLesson.id) ? 'btn-secondary' : 'btn-primary'}
                    onClick={() => handleCompleteLesson(activeLesson.id)}
                    disabled={completing || completedLessonIds.has(activeLesson.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                  >
                    <CheckCircle2 size={16} />
                    {completedLessonIds.has(activeLesson.id) ? 'Completed' : completing ? 'Marking…' : 'Mark as Complete'}
                  </button>
                )}
              </div>

              {/* Video Player / Embedding if available */}
              {activeLesson.video_url && (
                <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', background: '#000', margin: '0.5rem 0' }}>
                  <iframe
                    src={activeLesson.video_url}
                    title={activeLesson.title}
                    style={{ width: '100%', height: '360px', border: 0 }}
                    allowFullScreen
                  />
                </div>
              )}

              {/* Text Content */}
              <div style={{
                background: 'var(--bg-input)',
                borderRadius: '12px',
                padding: '1.25rem',
                fontSize: '0.92rem',
                lineHeight: 1.7,
                color: 'var(--text)',
                minHeight: '200px',
                whiteSpace: 'pre-wrap'
              }}>
                {activeLesson.content || (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                    <FileText size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                    <p>Select a lesson from the module menu or read the lesson notes here.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
              <BookOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <h3>Select a lesson to begin</h3>
              <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Choose any module from the list on the left to start studying.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
