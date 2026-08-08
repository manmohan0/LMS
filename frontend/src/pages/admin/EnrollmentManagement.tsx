import React, { useEffect, useState, useCallback } from 'react'
import { enrollmentsAPI, coursesAPI, usersAPI } from '../../api'
import { DataTable } from '../../components/DataTable'
import { Modal, ConfirmModal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Plus, Trash2, GraduationCap, CheckCircle2, PlayCircle, BookOpen, Search, UserCheck } from 'lucide-react'

interface Enrollment {
  id: number
  student_id: number
  student_name: string
  student_email: string
  course_id: number
  course_title: string
  enrolled_at: string
  is_completed: boolean
  completion_date?: string
  progress_percent: number
}

export const EnrollmentManagement: React.FC = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Options for modal dropdowns
  const [courses, setCourses] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])

  // Modal states
  const [enrollModalOpen, setEnrollModalOpen] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [enrolling, setEnrolling] = useState(false)

  // Delete state
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const toast = useToast()

  const loadEnrollments = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { page, per_page: 10 }
      if (courseFilter) params.course_id = courseFilter
      const res = await enrollmentsAPI.list(params)
      setEnrollments(res.data.enrollments || [])
      setTotal(res.data.meta?.total || 0)
    } catch {
      toast.error('Failed to load enrollments')
    } finally {
      setLoading(false)
    }
  }, [page, courseFilter])

  useEffect(() => {
    loadEnrollments()
  }, [loadEnrollments])

  // Load dropdown lists for modal & filter
  useEffect(() => {
    coursesAPI.listAll({ per_page: 100 })
      .then((r) => setCourses(r.data.courses || []))
      .catch(() => { })

    usersAPI.list({ role: 'student', per_page: 200 })
      .then((r) => setStudents(r.data.users || []))
      .catch(() => { })
  }, [])

  // Client-side search & status filtering
  const filteredEnrollments = enrollments.filter((e) => {
    if (statusFilter === 'completed' && !e.is_completed) return false
    if (statusFilter === 'in_progress' && e.is_completed) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const studentMatch = e.student_name?.toLowerCase().includes(q) || e.student_email?.toLowerCase().includes(q)
      const courseMatch = e.course_title?.toLowerCase().includes(q)
      return studentMatch || courseMatch
    }
    return true
  })

  // Summary stats
  const completedCount = enrollments.filter((e) => e.is_completed).length
  const inProgressCount = enrollments.length - completedCount
  const avgProgress = enrollments.length > 0
    ? Math.round(enrollments.reduce((acc, e) => acc + (e.progress_percent || 0), 0) / enrollments.length)
    : 0

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCourseId) {
      toast.error('Please select a course')
      return
    }
    setEnrolling(true)
    try {
      await enrollmentsAPI.enroll(
        Number(selectedCourseId),
        selectedStudentId ? Number(selectedStudentId) : undefined
      )
      toast.success('Student enrolled successfully! 🎉')
      setEnrollModalOpen(false)
      setSelectedStudentId('')
      setSelectedCourseId('')
      loadEnrollments()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Enrollment failed')
    } finally {
      setEnrolling(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await enrollmentsAPI.delete(deleteId)
      toast.success('Enrollment removed successfully')
      setDeleteId(null)
      loadEnrollments()
    } catch {
      toast.error('Failed to remove enrollment')
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    {
      key: 'student',
      label: 'Student',
      render: (e: Enrollment) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.85rem'
            }}
          >
            {e.student_name?.[0]?.toUpperCase() || 'S'}
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.1rem' }}>{e.student_name || 'Student'}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{e.student_email}</p>
          </div>
        </div>
      )
    },
    {
      key: 'course',
      label: 'Course',
      render: (e: Enrollment) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BookOpen size={16} color="#6366f1" />
          <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{e.course_title}</span>
        </div>
      )
    },
    {
      key: 'enrolled_at',
      label: 'Enrolled Date',
      render: (e: Enrollment) => (
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {new Date(e.enrolled_at).toLocaleDateString()}
        </span>
      )
    },
    {
      key: 'progress',
      label: 'Progress',
      render: (e: Enrollment) => (
        <div style={{ minWidth: 140 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Progress</span>
            <span style={{ fontWeight: 700, color: e.is_completed ? '#10b981' : '#6366f1' }}>
              {Math.round(e.progress_percent || 0)}%
            </span>
          </div>
          <div className="progress-bar" style={{ height: 6 }}>
            <div
              className="progress-fill"
              style={{
                width: `${e.progress_percent || 0}%`,
                background: e.is_completed ? '#10b981' : 'linear-gradient(90deg, #6366f1, #06b6d4)'
              }}
            />
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (e: Enrollment) => (
        e.is_completed ? (
          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <CheckCircle2 size={12} /> Completed
          </span>
        ) : (
          <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <PlayCircle size={12} /> In Progress
          </span>
        )
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (e: Enrollment) => (
        <button
          className="btn-danger-outline"
          onClick={() => setDeleteId(e.id)}
          title="Unenroll Student"
          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <Trash2 size={14} /> Unenroll
        </button>
      )
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Enrollment Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            View and manage student course enrollments across the platform.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setEnrollModalOpen(true)}>
          <Plus size={16} /> Enroll Student
        </button>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>
            <GraduationCap size={22} color="#6366f1" />
          </div>
          <div>
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#6366f1' }}>{total}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Total Enrollments</p>
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
          <div className="stat-icon" style={{ background: 'rgba(6,182,212,0.15)' }}>
            <PlayCircle size={22} color="#06b6d4" />
          </div>
          <div>
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#06b6d4' }}>{inProgressCount}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>In Progress</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <UserCheck size={22} color="#f59e0b" />
          </div>
          <div>
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>{avgProgress}%</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Avg Progress</p>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="glass" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search by student or course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.4rem' }}
          />
        </div>

        <select
          className="input-field"
          value={courseFilter}
          onChange={(e) => { setCourseFilter(e.target.value); setPage(1) }}
          style={{ width: 'auto', minWidth: 180 }}
        >
          <option value="">All Courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>

        <select
          className="input-field"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: 'auto', minWidth: 160 }}
        >
          <option value="">All Statuses</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={filteredEnrollments}
        loading={loading}
        page={page}
        perPage={10}
        total={total}
        onPageChange={setPage}
        emptyMessage="No enrollments found."
      />

      {/* Manual Enrollment Modal */}
      <Modal
        isOpen={enrollModalOpen}
        onClose={() => setEnrollModalOpen(false)}
        title="Enroll Student in Course"
      >
        <form onSubmit={handleEnroll} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label className="input-label">Select Course *</label>
            <select
              className="input-field"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              required
            >
              <option value="">-- Select a Course --</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title} ({c.level || 'all levels'})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label">Select Student (Optional for Admin Self-enroll)</label>
            <select
              className="input-field"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
            >
              <option value="">Current User (or select student below)</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn-secondary" onClick={() => setEnrollModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={enrolling}>
              {enrolling ? 'Enrolling...' : 'Enroll Now'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete / Unenroll Confirm Modal */}
      <ConfirmModal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Unenroll Student"
        message="Are you sure you want to remove this enrollment? The student will lose access to the course progress."
        loading={deleting}
      />
    </div>
  )
}
