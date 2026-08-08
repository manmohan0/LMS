import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from './components/Toast'
import { PageLoader } from './components/Spinner'
import { ProtectedRoute, PublicRoute } from './routes/ProtectedRoute'

// Auth pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })))

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const UserManagement = lazy(() => import('./pages/admin/UserManagement').then(m => ({ default: m.UserManagement })))
const CategoryManagement = lazy(() => import('./pages/admin/CategoryManagement').then(m => ({ default: m.CategoryManagement })))
const CourseManagement = lazy(() => import('./pages/admin/CourseManagement').then(m => ({ default: m.CourseManagement })))

// Instructor pages
const InstructorDashboard = lazy(() => import('./pages/instructor/InstructorDashboard').then(m => ({ default: m.InstructorDashboard })))
const GradingInterface = lazy(() => import('./pages/instructor/GradingInterface').then(m => ({ default: m.GradingInterface })))

// Student pages
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard').then(m => ({ default: m.StudentDashboard })))
const BrowseCourses = lazy(() => import('./pages/student/BrowseCourses').then(m => ({ default: m.BrowseCourses })))
const StudentQuizzes = lazy(() => import('./pages/student/StudentQuizzes').then(m => ({ default: m.StudentQuizzes })))

// Shared pages (admin + instructor share many)
const SharedCourseManagement = lazy(() => import('./pages/admin/CourseManagement').then(m => ({ default: m.CourseManagement })))

function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          {/* Admin routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/categories" element={<CategoryManagement />} />
            <Route path="/admin/courses" element={<CourseManagement />} />
            <Route path="/admin/assignments" element={<div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Assignment management — available via Instructor view</div>} />
            <Route path="/admin/quizzes" element={<div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Quiz management — available via Instructor view</div>} />
            <Route path="/admin/enrollments" element={<div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Enrollment management</div>} />
            <Route path="/admin/reports" element={<AdminDashboard />} />
          </Route>

          {/* Instructor routes */}
          <Route element={<ProtectedRoute allowedRoles={['instructor', 'admin']} />}>
            <Route path="/instructor" element={<InstructorDashboard />} />
            <Route path="/instructor/courses" element={<SharedCourseManagement />} />
            <Route path="/instructor/grading" element={<GradingInterface />} />
            <Route path="/instructor/assignments" element={<GradingInterface />} />
            <Route path="/instructor/quizzes" element={<div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Quiz builder</div>} />
          </Route>

          {/* Student routes */}
          <Route element={<ProtectedRoute allowedRoles={['student', 'admin']} />}>
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/courses" element={<BrowseCourses />} />
            <Route path="/student/my-courses" element={<StudentDashboard />} />
            <Route path="/student/assignments" element={<div style={{ padding: '2rem', color: 'var(--text-muted)' }}>My Assignments</div>} />
            <Route path="/student/quizzes" element={<StudentQuizzes />} />
          </Route>

          {/* Redirect root */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
