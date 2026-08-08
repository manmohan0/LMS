import React, { useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAtom } from 'jotai'
import { isAuthenticatedAtom, currentUserAtom } from '../atoms'
import { Sidebar, TopBar } from '../components/Sidebar'

interface ProtectedRouteProps {
  allowedRoles?: ('admin' | 'instructor' | 'student')[]
}

const pageTitles: Record<string, string> = {
  '/admin': 'Admin Dashboard',
  '/admin/users': 'User Management',
  '/admin/categories': 'Category Management',
  '/admin/courses': 'Course Management',
  '/admin/assignments': 'Assignments',
  '/admin/quizzes': 'Quizzes',
  '/admin/enrollments': 'Enrollments',
  '/admin/reports': 'Reports & Analytics',
  '/instructor': 'Instructor Dashboard',
  '/instructor/courses': 'My Courses',
  '/instructor/assignments': 'Assignments',
  '/instructor/quizzes': 'Quizzes',
  '/instructor/grading': 'Grading Center',
  '/student': 'Student Dashboard',
  '/student/courses': 'Browse Courses',
  '/student/my-courses': 'My Learning',
  '/student/assignments': 'My Assignments',
  '/student/quizzes': 'My Quizzes',
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const [isAuth] = useAtom(isAuthenticatedAtom)
  const [user] = useAtom(currentUserAtom)
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  if (!isAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const redirectMap: Record<string, string> = {
      admin: '/admin',
      instructor: '/instructor',
      student: '/student',
    }
    return <Navigate to={redirectMap[user.role] || '/login'} replace />
  }

  const title = (location.pathname.includes('/courses/') || location.pathname.includes('/my-courses/')) && location.pathname.split('/').length > 3
    ? 'Course Player & Details'
    : pageTitles[location.pathname] || 'LearnHub'

  return (
    <div className="page-wrapper">
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div style={{ flex: 1, marginLeft: sidebarOpen ? 260 : 0, transition: 'margin 0.25s ease', display: 'flex', flexDirection: 'column' }}>
        <TopBar onToggle={() => setSidebarOpen(!sidebarOpen)} title={title} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export const PublicRoute: React.FC = () => {
  const [isAuth] = useAtom(isAuthenticatedAtom)
  const [user] = useAtom(currentUserAtom)

  if (isAuth && user) {
    const redirectMap: Record<string, string> = {
      admin: '/admin',
      instructor: '/instructor',
      student: '/student',
    }
    return <Navigate to={redirectMap[user.role]} replace />
  }

  return <Outlet />
}
