import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { coursesAPI, enrollmentsAPI, categoriesAPI } from '../../api'
import { useToast } from '../../components/Toast'
import { PageLoader } from '../../components/Spinner'
import { Search, Filter, BookOpen, Clock, Users, GraduationCap } from 'lucide-react'

interface Course {
  id: number; title: string; description: string; thumbnail: string; level: string
  duration: string; price: number; instructor_name: string; category_name: string
  enrollment_count: number; lesson_count: number
}

export const BrowseCourses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState<number | null>(null)
  const toast = useToast()

  useEffect(() => {
    categoriesAPI.list({ per_page: 100 }).then((r) => setCategories(r.data.categories))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await coursesAPI.list({ page, per_page: 9, search, level: level || undefined, category_id: categoryId || undefined })
      setCourses(res.data.courses)
      setTotal(res.data.meta.total)
    } catch { toast.error('Failed to load courses') }
    finally { setLoading(false) }
  }, [page, search, level, categoryId])

  useEffect(() => { load() }, [load])

  const handleEnroll = async (courseId: number) => {
    setEnrolling(courseId)
    try {
      await enrollmentsAPI.enroll(courseId)
      toast.success('Enrolled successfully! 🎉')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Enrollment failed')
    } finally {
      setEnrolling(null)
    }
  }

  const levelColor: Record<string, string> = { beginner: '#10b981', intermediate: '#f59e0b', advanced: '#ef4444' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Browse Courses</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{total} courses available</p>
      </div>

      {/* Filters */}
      <div className="glass" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={16} color="var(--text-muted)" />
          <input placeholder="Search courses…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="input" style={{ width: 160 }} value={level} onChange={(e) => { setLevel(e.target.value); setPage(1) }}>
          <option value="">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <select className="input" style={{ width: 180 }} value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1) }}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>

      {loading ? <PageLoader /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {courses.map((c) => (
              <div key={c.id} className="course-card">
                {c.thumbnail ? (
                  <img src={c.thumbnail} alt={c.title} className="course-thumb" style={{ objectFit: 'cover' }} />
                ) : (
                  <div className="course-thumb" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BookOpen size={48} color="rgba(255,255,255,0.5)" />
                  </div>
                )}
                <div className="course-body">
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    <span className="badge" style={{ background: `${levelColor[c.level]}20`, color: levelColor[c.level] }}>{c.level}</span>
                    {c.category_name && <span className="badge badge-primary">{c.category_name}</span>}
                    {c.price === 0 ? <span className="badge badge-success">Free</span> : <span className="badge badge-warning">${c.price}</span>}
                  </div>
                  <Link to={`/student/courses/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem', lineHeight: 1.4, cursor: 'pointer' }}>{c.title}</h3>
                  </Link>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.5, marginBottom: '0.875rem' }}>
                    {c.description?.slice(0, 100)}{c.description?.length > 100 ? '…' : ''}
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    {c.duration && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={13} />{c.duration}</span>}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><BookOpen size={13} />{c.lesson_count} lessons</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Users size={13} />{c.enrollment_count}</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    <GraduationCap size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {c.instructor_name}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link to={`/student/courses/${c.id}`} className="btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.82rem', textDecoration: 'none' }}>
                      View Details
                    </Link>
                    <button
                      className="btn-primary"
                      style={{ flex: 1, justifyContent: 'center', fontSize: '0.82rem' }}
                      disabled={enrolling === c.id}
                      onClick={() => handleEnroll(c.id)}
                    >
                      {enrolling === c.id ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <GraduationCap size={14} />}
                      {enrolling === c.id ? 'Enrolling…' : 'Enroll Now'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {Math.ceil(total / 9) > 1 && (
            <div className="pagination">
              <button className="page-btn" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>←</button>
              {Array.from({ length: Math.min(Math.ceil(total / 9), 5) }, (_, i) => (
                <button key={i + 1} className={`page-btn ${i + 1 === page ? 'active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
              ))}
              <button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 9)}>→</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
