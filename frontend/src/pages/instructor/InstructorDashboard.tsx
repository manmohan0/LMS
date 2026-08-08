import React, { useEffect, useState } from 'react'
import { useAtom } from 'jotai'
import { currentUserAtom } from '../../atoms'
import { reportsAPI } from '../../api'
import { useToast } from '../../components/Toast'
import { PageLoader } from '../../components/Spinner'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

export const InstructorDashboard: React.FC = () => {
  const [user] = useAtom(currentUserAtom)
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    if (!user) return
    reportsAPI.instructorSummary(user.id)
      .then((res) => setSummary(res.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <PageLoader />

  const stats = [
    { label: 'My Courses', value: summary?.total_courses, icon: '📚', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
    { label: 'Published', value: summary?.published_courses, icon: '🌐', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    { label: 'Total Students', value: summary?.total_students, icon: '👨‍🎓', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
  ]

  const chartData = (summary?.courses || []).map((c: any) => ({
    name: c.title.length > 15 ? c.title.slice(0, 15) + '…' : c.title,
    students: c.enrollment_count,
    lessons: c.lesson_count,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Welcome, {user?.full_name} 🎓</h2>
        <p style={{ color: 'var(--text-muted)' }}>Manage your courses and track student progress.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}>
              <span style={{ fontSize: '1.5rem' }}>{s.icon}</span>
            </div>
            <div>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color }}>{s.value ?? 0}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="glass" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1.25rem' }}>Course Enrollment Overview</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10 }} />
              <Bar dataKey="students" name="Students" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lessons" name="Lessons" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* My courses table */}
      <div className="glass" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>My Courses</h3>
        {(summary?.courses || []).length === 0 ? (
          <div className="empty-state"><p>No courses yet. <a href="/instructor/courses" style={{ color: 'var(--primary)' }}>Create your first course</a></p></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: 'rgba(99,102,241,0.08)' }}>
                {['Title', 'Level', 'Students', 'Lessons', 'Status'].map((h) => <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {(summary?.courses || []).map((c: any) => (
                  <tr key={c.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>{c.title}</td>
                    <td style={{ padding: '0.875rem 1rem' }}><span className={`badge badge-${c.level === 'beginner' ? 'success' : c.level === 'intermediate' ? 'warning' : 'danger'}`}>{c.level}</span></td>
                    <td style={{ padding: '0.875rem 1rem' }}><span className="badge badge-info">{c.enrollment_count}</span></td>
                    <td style={{ padding: '0.875rem 1rem' }}>{c.lesson_count}</td>
                    <td style={{ padding: '0.875rem 1rem' }}><span className={`badge ${c.is_published ? 'badge-success' : 'badge-warning'}`}>{c.is_published ? 'Published' : 'Draft'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
