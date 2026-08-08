import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor — attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lms_access_token')
  if (token) {
    const parsed = JSON.parse(token)
    if (parsed) config.headers.Authorization = `Bearer ${parsed}`
  }
  return config
})

// Response interceptor — handle 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = localStorage.getItem('lms_refresh_token')
      if (refreshToken) {
        try {
          const rt = JSON.parse(refreshToken)
          const { data } = await axios.post('/api/auth/refresh', {}, {
            headers: { Authorization: `Bearer ${rt}` },
          })
          localStorage.setItem('lms_access_token', JSON.stringify(data.access_token))
          original.headers.Authorization = `Bearer ${data.access_token}`
          return api(original)
        } catch {
          localStorage.removeItem('lms_access_token')
          localStorage.removeItem('lms_refresh_token')
          localStorage.removeItem('lms_user')
          window.location.href = '/login'
        }
      } else {
        localStorage.removeItem('lms_access_token')
        localStorage.removeItem('lms_refresh_token')
        localStorage.removeItem('lms_user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

// ── Typed API helpers ─────────────────────────────────────────────────────────

export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: object) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  updateMe: (data: object) => api.patch('/auth/me', data),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
}

export const usersAPI = {
  list: (params?: object) => api.get('/users/', { params }),
  get: (id: number) => api.get(`/users/${id}`),
  create: (data: object) => api.post('/users/', data),
  update: (id: number, data: object) => api.patch(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
  listInstructors: () => api.get('/users/instructors'),
}

export const categoriesAPI = {
  list: (params?: object) => api.get('/categories/', { params }),
  get: (id: number) => api.get(`/categories/${id}`),
  create: (data: object) => api.post('/categories/', data),
  update: (id: number, data: object) => api.patch(`/categories/${id}`, data),
  delete: (id: number) => api.delete(`/categories/${id}`),
}

export const coursesAPI = {
  list: (params?: object) => api.get('/courses/', { params }),
  listAll: (params?: object) => api.get('/courses/all', { params }),
  myCourses: (params?: object) => api.get('/courses/my', { params }),
  get: (id: number) => api.get(`/courses/${id}`),
  create: (data: object) => api.post('/courses/', data),
  update: (id: number, data: object) => api.patch(`/courses/${id}`, data),
  delete: (id: number) => api.delete(`/courses/${id}`),
  listLessons: (courseId: number) => api.get(`/courses/${courseId}/lessons`),
  createLesson: (courseId: number, data: object) => api.post(`/courses/${courseId}/lessons`, data),
  updateLesson: (courseId: number, lessonId: number, data: object) => api.patch(`/courses/${courseId}/lessons/${lessonId}`, data),
  deleteLesson: (courseId: number, lessonId: number) => api.delete(`/courses/${courseId}/lessons/${lessonId}`),
}

export const enrollmentsAPI = {
  enroll: (courseId: number, studentId?: number) => api.post('/enrollments/', { course_id: courseId, student_id: studentId }),
  myEnrollments: (params?: object) => api.get('/enrollments/my', { params }),
  list: (params?: object) => api.get('/enrollments/', { params }),
  delete: (id: number) => api.delete(`/enrollments/${id}`),
  completeLesson: (lessonId: number) => api.post(`/enrollments/progress/${lessonId}/complete`),
  getCourseProgress: (courseId: number) => api.get(`/enrollments/progress/${courseId}`),
}

export const assignmentsAPI = {
  list: (params?: object) => api.get('/assignments/', { params }),
  get: (id: number) => api.get(`/assignments/${id}`),
  create: (data: object) => api.post('/assignments/', data),
  update: (id: number, data: object) => api.patch(`/assignments/${id}`, data),
  delete: (id: number) => api.delete(`/assignments/${id}`),
  submit: (id: number, data: object) => api.post(`/assignments/${id}/submit`, data),
  listSubmissions: (id: number, params?: object) => api.get(`/assignments/${id}/submissions`, { params }),
  grade: (submissionId: number, data: object) => api.patch(`/assignments/submissions/${submissionId}/grade`, data),
  mySubmissions: (params?: object) => api.get('/assignments/submissions/my', { params }),
}

export const quizzesAPI = {
  list: (params?: object) => api.get('/quizzes/', { params }),
  get: (id: number) => api.get(`/quizzes/${id}`),
  create: (data: object) => api.post('/quizzes/', data),
  update: (id: number, data: object) => api.patch(`/quizzes/${id}`, data),
  delete: (id: number) => api.delete(`/quizzes/${id}`),
  addQuestion: (quizId: number, data: object) => api.post(`/quizzes/${quizId}/questions`, data),
  deleteQuestion: (questionId: number) => api.delete(`/quizzes/questions/${questionId}`),
  submitAttempt: (quizId: number, answers: object[]) => api.post(`/quizzes/${quizId}/attempt`, { answers }),
  listAttempts: (quizId: number, params?: object) => api.get(`/quizzes/${quizId}/attempts`, { params }),
  getAttempt: (attemptId: number) => api.get(`/quizzes/attempts/${attemptId}`),
}

export const reportsAPI = {
  adminSummary: () => api.get('/reports/admin/summary'),
  studentReport: (studentId: number) => api.get(`/reports/student/${studentId}`),
  courseReport: (courseId: number) => api.get(`/reports/course/${courseId}`),
  instructorSummary: (instructorId: number) => api.get(`/reports/instructor/${instructorId}`),
}
