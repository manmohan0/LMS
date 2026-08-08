import React, { useEffect, useState } from 'react'
import { useAtom } from 'jotai'
import { currentUserAtom } from '../../atoms'
import { reportsAPI } from '../../api'
import { useToast } from '../../components/Toast'
import { PageLoader } from '../../components/Spinner'
import { Users, BookOpen, GraduationCap, BarChart2, CheckCircle, FileText, HelpCircle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

interface Summary {
  students: number
  instructors: number
  total_courses: number
  published_courses: number
  total_enrollments: number
  completed_enrollments: number
  completion_rate: number
  total_submissions: number
  graded_submissions: number
  total_quiz_attempts: number
  passed_attempts: number
  quiz_pass_rate: number
}

const BAR_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#ec4899', '#f59e0b']
const COLORS = BAR_COLORS

export const AdminDashboard: React.FC = () => {
  const [user] = useAtom(currentUserAtom)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    reportsAPI.adminSummary()
      .then((res) => setSummary(res.data))
      .catch(() => toast.error('Failed to load dashboard data'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  const stats = [
    { label: 'Total Students', value: summary?.students, icon: '👨‍🎓', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
    { label: 'Total Instructors', value: summary?.instructors, icon: '👩‍🏫', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
    { label: 'Published Courses', value: summary?.published_courses, icon: '📚', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
    { label: 'Total Enrollments', value: summary?.total_enrollments, icon: '📋', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    { label: 'Completion Rate', value: `${summary?.completion_rate}%`, icon: '✅', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    { label: 'Quiz Pass Rate', value: `${summary?.quiz_pass_rate}%`, icon: '🎯', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  ]

  const enrollmentData = [
    { name: 'Enrolled', value: (summary?.total_enrollments || 0) - (summary?.completed_enrollments || 0) },
    { name: 'Completed', value: summary?.completed_enrollments || 0 },
  ]

  const submissionData = [
    { name: 'Pending', value: (summary?.total_submissions || 0) - (summary?.graded_submissions || 0) },
    { name: 'Graded', value: summary?.graded_submissions || 0 },
  ]

  const barData = [
    { name: 'Students', count: summary?.students || 0 },
    { name: 'Instructors', count: summary?.instructors || 0 },
    { name: 'Courses', count: summary?.total_courses || 0 },
    { name: 'Enrollments', count: summary?.total_enrollments || 0 },
    { name: 'Submissions', count: summary?.total_submissions || 0 },
    { name: 'Quiz Attempts', count: summary?.total_quiz_attempts || 0 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingTop: '0.25rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          Welcome back, {user?.full_name} 👋
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>Here's your platform overview for today.</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}>
              <span style={{ fontSize: '1.5rem' }}>{s.icon}</span>
            </div>
            <div>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color }}>{s.value}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Bar chart */}
        <div className="glass" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1.25rem' }}>Platform Overview</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData} margin={{ top: 10, right: 15, left: -5, bottom: 15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} interval={0} dy={4} axisLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10 }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="glass" style={{ padding: '1.25rem', flex: 1 }}>
            <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem' }}>Course Completion</h4>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={enrollmentData} cx="50%" cy="40%" innerRadius={28} outerRadius={46} dataKey="value">
                  {enrollmentData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 10 }} formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="glass" style={{ padding: '1.25rem', flex: 1 }}>
            <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem' }}>Assignment Grading</h4>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={submissionData} cx="50%" cy="40%" innerRadius={28} outerRadius={46} dataKey="value">
                  {submissionData.map((_, i) => <Cell key={i} fill={[COLORS[2], COLORS[3]][i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 10 }} formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
