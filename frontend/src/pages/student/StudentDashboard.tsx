import React, { useEffect, useState } from 'react'
import { useAtom } from 'jotai'
import { currentUserAtom } from '../../atoms'
import { enrollmentsAPI, reportsAPI } from '../../api'
import { useToast } from '../../components/Toast'
import { PageLoader } from '../../components/Spinner'
import { Link } from 'react-router-dom'
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts'

export const StudentDashboard: React.FC = () => {
  const [user] = useAtom(currentUserAtom)
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    if (!user) return
    Promise.all([
      enrollmentsAPI.myEnrollments({ per_page: 4 }),
      reportsAPI.studentReport(user.id),
    ])
      .then(([e, r]) => {
        setEnrollments(e.data.enrollments)
        setReport(r.data)
      })
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <PageLoader />

  const stats = [
    { label: 'Enrolled Courses', value: report?.total_enrolled || 0, icon: '📚', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
    { label: 'Completed', value: report?.completed_courses || 0, icon: '✅', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    { label: 'Avg Progress', value: `${report?.avg_progress || 0}%`, icon: '📈', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
    { label: 'Quiz Pass Count', value: report?.quiz_pass_count || 0, icon: '🎯', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Hello, {user?.full_name} 👋</h2>
        <p style={{ color: 'var(--text-muted)' }}>Continue your learning journey.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}><span style={{ fontSize: '1.5rem' }}>{s.icon}</span></div>
            <div>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color }}>{s.value}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* My courses progress */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 600, fontSize: '1.1rem' }}>My Learning Progress</h3>
          <Link to="/student/my-courses" style={{ color: 'var(--primary)', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
        </div>
        {enrollments.length === 0 ? (
          <div className="glass" style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>You haven't enrolled in any courses yet.</p>
            <Link to="/student/courses" className="btn-primary">Browse Courses</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {enrollments.slice(0, 4).map((e) => (
              <Link key={e.id} to={`/student/my-courses/${e.course_id}`} style={{ textDecoration: 'none' }}>
                <div className="glass" style={{ padding: '1.25rem', transition: 'transform 0.2s, box-shadow 0.2s' }}
                  onMouseEnter={(el) => (el.currentTarget.style.transform = 'translateY(-3px)')}
                  onMouseLeave={(el) => (el.currentTarget.style.transform = 'translateY(0)')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
                    <h4 style={{ fontWeight: 600, fontSize: '0.95rem', flex: 1, marginRight: '0.5rem' }}>{e.course_title}</h4>
                    {e.is_completed && <span className="badge badge-success">✓ Done</span>}
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                      <span>Progress</span>
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{e.progress_percent}%</span>
                    </div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${e.progress_percent}%` }} /></div>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Enrolled {new Date(e.enrolled_at).toLocaleDateString()}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Performance summary */}
      {report && (
        <div className="glass" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Performance Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {[
              { label: 'Avg Quiz Score', value: report.avg_quiz_score, color: '#6366f1' },
              { label: 'Avg Assignment Score', value: report.avg_assignment_score, color: '#10b981' },
            ].map((item) => (
              <div key={item.label} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{item.label}</p>
                {item.value != null && item.value > 0 ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <p style={{ fontSize: '2rem', fontWeight: 800, color: item.color }}>{item.value.toFixed(1)}%</p>
                    <div className="progress-bar" style={{ maxWidth: 200, margin: '0.5rem auto 0' }}>
                      <div className="progress-fill" style={{ width: `${item.value}%`, background: `linear-gradient(90deg, ${item.color}, ${item.color}88)` }} />
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '1rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Not available</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
