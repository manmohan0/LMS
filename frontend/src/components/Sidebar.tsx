import React from 'react'
import { NavLink, useNavigate, Link, useLocation } from 'react-router-dom'
import { useAtom } from 'jotai'
import { currentUserAtom, accessTokenAtom, refreshTokenAtom } from '../atoms'
import {
  LayoutDashboard, Users, BookOpen, Tag, HelpCircle, FileText,
  BarChart2, GraduationCap, LogOut, Menu, X
} from 'lucide-react'

const adminNav = [
  { to: '/admin', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/admin/users', icon: <Users size={18} />, label: 'Users' },
  { to: '/admin/categories', icon: <Tag size={18} />, label: 'Categories' },
  { to: '/admin/courses', icon: <BookOpen size={18} />, label: 'Courses' },
  { to: '/admin/assignments', icon: <FileText size={18} />, label: 'Assignments' },
  { to: '/admin/quizzes', icon: <HelpCircle size={18} />, label: 'Quizzes' },
  { to: '/admin/enrollments', icon: <GraduationCap size={18} />, label: 'Enrollments' },
  { to: '/admin/reports', icon: <BarChart2 size={18} />, label: 'Reports' },
]

const instructorNav = [
  { to: '/instructor', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/instructor/courses', icon: <BookOpen size={18} />, label: 'My Courses' },
  { to: '/instructor/quizzes', icon: <HelpCircle size={18} />, label: 'Quizzes' },
  { to: '/instructor/grading', icon: <BarChart2 size={18} />, label: 'Grading' },
]

const studentNav = [
  { to: '/student', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/student/my-courses', icon: <GraduationCap size={18} />, label: 'My Learning' },
  { to: '/student/courses', icon: <BookOpen size={18} />, label: 'Browse Courses' },
  { to: '/student/assignments', icon: <FileText size={18} />, label: 'Assignments' },
  { to: '/student/quizzes', icon: <HelpCircle size={18} />, label: 'Quizzes' },
]

const navMap = { admin: adminNav, instructor: instructorNav, student: studentNav }

interface SidebarProps {
  open: boolean
  onToggle: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ open, onToggle }) => {
  const [user] = useAtom(currentUserAtom)
  const [, setToken] = useAtom(accessTokenAtom)
  const [, setRefreshToken] = useAtom(refreshTokenAtom)
  const [, setUser] = useAtom(currentUserAtom)
  const navigate = useNavigate()

  const logout = () => {
    setToken(null)
    setRefreshToken(null)
    setUser(null)
    navigate('/login')
  }

  const navItems = navMap[user?.role || 'student']

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          onClick={onToggle}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40, display: 'none' }}
          className="mobile-overlay"
        />
      )}

      <nav className="sidebar" style={{ position: 'fixed', top: 0, left: 0, zIndex: 50, transform: open ? 'translateX(0)' : 'translateX(-260px)', transition: 'transform 0.25s ease' }}>
        {/* Logo */}
        <div style={{ padding: '0.5rem 0.5rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to={user?.role === 'admin' ? '/admin' : user?.role === 'instructor' ? '/instructor' : '/student'} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GraduationCap size={20} color="white" />
            </div>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', background: 'linear-gradient(135deg, #6366f1, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              LearnHub
            </span>
          </Link>
          <button onClick={onToggle} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Role badge */}
        <div style={{ marginBottom: '1rem', padding: '0 0.5rem' }}>
          <div style={{ background: 'rgba(99,102,241,0.1)', borderRadius: 10, padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: '0.9rem' }}>
              {user?.full_name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{user?.full_name}</p>
              <span className={`badge badge-${user?.role === 'admin' ? 'danger' : user?.role === 'instructor' ? 'warning' : 'success'}`} style={{ fontSize: '0.7rem', padding: '0.1rem 0.5rem' }}>
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to.split('/').length === 2}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Logout */}
        <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          <button className="nav-item" onClick={logout} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </nav>
    </>
  )
}

export const TopBar: React.FC<{ onToggle: () => void; title: string }> = ({ onToggle, title }) => {
  const [user] = useAtom(currentUserAtom)
  const location = useLocation()
  const dashboardPath = user?.role === 'admin' ? '/admin' : user?.role === 'instructor' ? '/instructor' : '/student'
  const isDashboardPage = location.pathname === dashboardPath

  return (
    <header style={{ height: 64, background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', position: 'sticky', top: 0, zIndex: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={onToggle} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
          <Menu size={20} />
        </button>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{title}</h1>
      </div>
      {!isDashboardPage && (
        <Link
          to={dashboardPath}
          className="btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', fontSize: '0.82rem', textDecoration: 'none' }}
        >
          <LayoutDashboard size={15} /> Dashboard
        </Link>
      )}
    </header>
  )
}
