import React, { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { enrollmentsAPI } from '../../api'
import { useToast } from '../../components/Toast'
import { PageLoader } from '../../components/Spinner'
import { Search, GraduationCap, BookOpen, CheckCircle2, PlayCircle, Filter, ArrowUpDown, ArrowLeft } from 'lucide-react'

interface Enrollment {
  id: number
  course_id: number
  course_title: string
  course_description?: string
  course_thumbnail?: string
  course_level?: string
  category_name?: string
  instructor_name?: string
  lesson_count?: number
  enrolled_at: string
  is_completed: boolean
  completion_date?: string
  progress_percent: number
}

export const MyCourses: React.FC = () => {
  const navigate = useNavigate()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'progress_desc' | 'progress_asc' | 'title'>('recent')
  const toast = useToast()

  useEffect(() => {
    enrollmentsAPI.myEnrollments({ per_page: 100 })
      .then((res) => {
        setEnrollments(res.data.enrollments || [])
      })
      .catch(() => toast.error('Failed to load your enrolled courses'))
      .finally(() => setLoading(false))
  }, [])

  const levelColor: Record<string, string> = {
    beginner: '#10b981',
    intermediate: '#f59e0b',
    advanced: '#ef4444',
  }

  // Summary stats
  const totalCount = enrollments.length
  const completedCount = enrollments.filter((e) => e.is_completed).length
  const inProgressCount = totalCount - completedCount
  const avgProgress = totalCount > 0
    ? Math.round(enrollments.reduce((acc, e) => acc + (e.progress_percent || 0), 0) / totalCount)
    : 0

  // Filtering & Sorting
  const filteredCourses = useMemo(() => {
    return enrollments
      .filter((e) => {
        // Status filter
        if (statusFilter === 'completed' && !e.is_completed) return false
        if (statusFilter === 'in_progress' && e.is_completed) return false
        // Search query
        if (search.trim()) {
          const query = search.toLowerCase()
          const titleMatch = e.course_title?.toLowerCase().includes(query)
          const categoryMatch = e.category_name?.toLowerCase().includes(query)
          const instructorMatch = e.instructor_name?.toLowerCase().includes(query)
          return titleMatch || categoryMatch || instructorMatch
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'progress_desc') return b.progress_percent - a.progress_percent
        if (sortBy === 'progress_asc') return a.progress_percent - b.progress_percent
        if (sortBy === 'title') return a.course_title.localeCompare(b.course_title)
        // Default: 'recent'
        return new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime()
      })
  }, [enrollments, search, statusFilter, sortBy])

  if (loading) return <PageLoader />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <button
          className="btn-secondary"
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.85rem',
            fontSize: '0.85rem',
            marginBottom: '0.75rem',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>My Learning</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Track your progress and continue learning your enrolled courses.
        </p>
      </div>

      {/* Overview Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>
            <BookOpen size={22} color="#6366f1" />
          </div>
          <div>
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#6366f1' }}>{totalCount}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Enrolled Courses</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(6,182,212,0.15)' }}>
            <PlayCircle size={22} color="#06b6d4" />
          </div>
          <div>
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#06b6d4' }}>{inProgressCount}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>In Progress</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <CheckCircle2 size={22} color="#10b981" />
          </div>
          <div>
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>{completedCount}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Completed</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <GraduationCap size={22} color="#f59e0b" />
          </div>
          <div>
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>{avgProgress}%</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Avg Progress</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      {totalCount > 0 && (
        <div className="glass" style={{ padding: '1rem 1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: 220 }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              placeholder="Search your courses…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={15} color="var(--text-muted)" />
            <select
              className="input"
              style={{ width: 150 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">All Status</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowUpDown size={15} color="var(--text-muted)" />
            <select
              className="input"
              style={{ width: 170 }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="recent">Recently Enrolled</option>
              <option value="progress_desc">Progress (High to Low)</option>
              <option value="progress_asc">Progress (Low to High)</option>
              <option value="title">Course Title (A-Z)</option>
            </select>
          </div>
        </div>
      )}

      {/* Content Section */}
      {totalCount === 0 ? (
        <div className="glass" style={{ padding: '3.5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={32} color="var(--primary)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.4rem' }}>No Courses Enrolled Yet</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 420 }}>
              You haven't enrolled in any courses so far. Browse our catalog to discover and enroll in new courses!
            </p>
          </div>
          <Link to="/student/courses" className="btn-primary" style={{ padding: '0.65rem 1.4rem', textDecoration: 'none' }}>
            <BookOpen size={16} /> Browse Courses
          </Link>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔍</p>
          <p style={{ fontWeight: 600, marginBottom: '0.4rem' }}>No matching courses found</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Try adjusting your search query or filter selection.
          </p>
          <button
            className="btn-secondary"
            onClick={() => { setSearch(''); setStatusFilter('all') }}
            style={{ margin: '0 auto' }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {filteredCourses.map((c) => {
            const levelStr = c.course_level || 'beginner'
            const badgeColor = levelColor[levelStr] || '#6366f1'

            return (
              <div key={c.id} className="course-card" style={{ display: 'flex', flexDirection: 'column' }}>
                {c.course_thumbnail ? (
                  <img src={c.course_thumbnail} alt={c.course_title} className="course-thumb" style={{ objectFit: 'cover' }} />
                ) : (
                  <div
                    className="course-thumb"
                    style={{
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <BookOpen size={44} color="rgba(255,255,255,0.5)" />
                  </div>
                )}

                <div className="course-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {c.is_completed ? (
                      <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle2 size={12} /> Completed
                      </span>
                    ) : (
                      <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <PlayCircle size={12} /> In Progress
                      </span>
                    )}
                    {c.category_name && <span className="badge badge-primary">{c.category_name}</span>}
                    {c.course_level && (
                      <span className="badge" style={{ background: `${badgeColor}20`, color: badgeColor }}>
                        {c.course_level}
                      </span>
                    )}
                  </div>

                  <Link to={`/student/courses/${c.course_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem', lineHeight: 1.4, cursor: 'pointer' }}>
                      {c.course_title}
                    </h3>
                  </Link>

                  {c.course_description && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.5, marginBottom: '0.875rem' }}>
                      {c.course_description.slice(0, 90)}{c.course_description.length > 90 ? '…' : ''}
                    </p>
                  )}

                  {/* Progress section */}
                  <div style={{ marginTop: 'auto', paddingTop: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      <span>Progress</span>
                      <span style={{ fontWeight: 700, color: c.is_completed ? 'var(--success)' : 'var(--primary)' }}>
                        {Math.round(c.progress_percent)}%
                      </span>
                    </div>
                    <div className="progress-bar" style={{ height: 8 }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${c.progress_percent}%`,
                          background: c.is_completed
                            ? 'linear-gradient(90deg, #10b981, #34d399)'
                            : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    {c.lesson_count != null && c.lesson_count > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <BookOpen size={12} /> {c.lesson_count} lessons
                      </span>
                    )}
                    {c.instructor_name && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <GraduationCap size={13} /> {c.instructor_name}
                      </span>
                    )}
                  </div>

                  {/* Action button */}
                  <Link
                    to={`/student/courses/${c.course_id}`}
                    className="btn-primary"
                    style={{ justifyContent: 'center', fontSize: '0.85rem', textDecoration: 'none', gap: '0.4rem' }}
                  >
                    {c.is_completed ? (
                      <>Review Course</>
                    ) : (
                      <>
                        <PlayCircle size={15} /> Continue Learning
                      </>
                    )}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
