# 🎓 LearnHub — Learning Management System

A full-stack Learning Management System (LMS) built for the Nexoraa Technosolve technical assessment.

## 📸 Overview

LearnHub is a comprehensive online learning platform supporting **three roles** — **Admin**, **Instructor**, and **Student** — with complete course management, progress tracking, quiz auto-scoring, assignment grading, and analytics dashboards.

---

## 🛠 Technology Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.11+, Flask 3.0, Flask-SQLAlchemy |
| **Authentication** | JWT (flask-jwt-extended) |
| **Database** | SQLite (dev) / PostgreSQL (prod-ready) |
| **API Docs** | Flasgger (Swagger/OpenAPI) |
| **Frontend** | React 18, Vite, TypeScript |
| **State Management** | Jotai (atoms) |
| **Styling** | Tailwind CSS + custom CSS (dark glassmorphism theme) |
| **Charts** | Recharts |
| **HTTP Client** | Axios |
| **Routing** | React Router v6 |

---

## 🏗 System Architecture

```
Client (React + Jotai)
        │
        │  HTTP/REST (JWT Bearer)
        ▼
Flask REST API (Blueprints)
        │
        ├── /api/auth       → JWT auth
        ├── /api/users      → CRUD users
        ├── /api/categories → CRUD categories
        ├── /api/courses    → CRUD courses + lessons
        ├── /api/enrollments→ Enroll + progress
        ├── /api/assignments→ CRUD + submit + grade
        ├── /api/quizzes    → CRUD + attempt (auto-score)
        └── /api/reports    → Analytics
        │
SQLAlchemy ORM
        │
SQLite / PostgreSQL
```

---

## 📁 Folder Structure

```
d:\LMS\
├── backend/
│   ├── app/
│   │   ├── __init__.py         # App factory
│   │   ├── config.py           # Configuration
│   │   ├── extensions.py       # DB, JWT, CORS, bcrypt
│   │   ├── models/             # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   ├── course.py       # Category, Course, Lesson
│   │   │   ├── enrollment.py   # Enrollment, LessonProgress
│   │   │   ├── assignment.py   # Assignment, Submission
│   │   │   └── quiz.py         # Quiz, Question, Choice, Attempt, Answer
│   │   ├── routes/             # Blueprint routes
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── categories.py
│   │   │   ├── courses.py
│   │   │   ├── enrollments.py
│   │   │   ├── assignments.py
│   │   │   ├── quizzes.py
│   │   │   └── reports.py
│   │   └── utils/
│   │       ├── decorators.py   # role_required, admin_required, etc.
│   │       └── helpers.py      # paginate, apply_search, apply_sort
│   ├── requirements.txt
│   ├── run.py
│   ├── seed.py
│   └── .env
└── frontend/
    └── src/
        ├── atoms/              # Jotai atoms (auth, UI, filters)
        ├── api/                # Axios + typed API helpers
        ├── components/         # Reusable: DataTable, Modal, Toast, Sidebar
        ├── pages/
        │   ├── auth/           # Login, Register, ForgotPassword
        │   ├── admin/          # AdminDashboard, UserMgmt, CourseMgmt, CategoryMgmt
        │   ├── instructor/     # InstructorDashboard, GradingInterface
        │   └── student/        # StudentDashboard, BrowseCourses, StudentQuizzes
        └── routes/             # ProtectedRoute, PublicRoute guards
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### Backend Setup

```bash
cd d:\LMS\backend

# Create virtual environment (recommended)
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Copy environment file
copy .env.example .env

# Seed the database with sample data
python seed.py

# Start the Flask server
python run.py
```

Backend runs at: **http://localhost:5000**  
Swagger docs at: **http://localhost:5000/apidocs**

### Frontend Setup

```bash
cd d:\LMS\frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at: **http://localhost:3000**

---

## 🗄️ Database Configuration

The default database is **SQLite** (`backend/lms.db`), zero-configuration.

To switch to **PostgreSQL**, update `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/lms_db
```
Then run:
```bash
flask db init
flask db migrate -m "initial"
flask db upgrade
python seed.py
```

---

## 🔑 Sample Login Credentials

| Role | Email | Password |
|---|---|---|
| **Admin** | admin@lms.com | Admin@123 |
| **Instructor** | instructor@lms.com | Instructor@123 |
| **Instructor 2** | instructor2@lms.com | Instructor@123 |
| **Student** | student@lms.com | Student@123 |
| **Student 2** | student2@lms.com | Student@123 |

---

## 📖 API Documentation

Interactive Swagger UI: **http://localhost:5000/apidocs**

### Key Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login → JWT tokens |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/forgot-password` | Generate reset token |
| GET | `/api/auth/me` | Current user profile |
| GET | `/api/users/` | Admin: List all users |
| GET | `/api/categories/` | List categories |
| GET | `/api/courses/` | List published courses |
| POST | `/api/courses/` | Create course (instructor) |
| POST | `/api/enrollments/` | Enroll in course (student) |
| GET | `/api/enrollments/my` | My enrollments |
| POST | `/api/enrollments/progress/{lesson_id}/complete` | Mark lesson complete |
| POST | `/api/assignments/{id}/submit` | Submit assignment |
| PATCH | `/api/assignments/submissions/{id}/grade` | Grade submission |
| POST | `/api/quizzes/{id}/attempt` | Submit quiz (auto-scored) |
| GET | `/api/reports/admin/summary` | Admin analytics |
| GET | `/api/reports/student/{id}` | Student report |

---

## ✨ Features

### Backend
- ✅ JWT authentication (access + refresh tokens)
- ✅ Role-based access: Admin, Instructor, Student
- ✅ Full CRUD: Users, Categories, Courses, Lessons, Assignments, Quizzes
- ✅ Student enrollment + lesson progress tracking
- ✅ Assignment file upload + text submission
- ✅ Assignment grading with feedback
- ✅ Quiz auto-scoring (MCQ + True/False)
- ✅ Search, filter, sort, pagination on all list endpoints
- ✅ Course completion detection
- ✅ Analytics: admin summary, student report, course report
- ✅ Swagger/OpenAPI documentation
- ✅ Input validation + exception handling

### Frontend
- ✅ Dark glassmorphism design with animations
- ✅ Role-based dashboards (Admin, Instructor, Student)
- ✅ Protected routes with role guards
- ✅ Jotai atoms for state management (auth, UI, filters)
- ✅ Recharts: bar, pie, line charts for analytics
- ✅ DataTable with search, sort, pagination
- ✅ Timed quiz taking with real-time countdown
- ✅ Instant quiz results with answer review
- ✅ Course progress bars
- ✅ Toast notifications + loading states
- ✅ Client-side form validation
- ✅ Responsive layout (mobile-friendly sidebar)

---

## 👨‍💻 Author

Built as a technical assessment for Nexoraa Technosolve IT Services Pvt. Ltd.

**Tech Stack**: Flask · React · TypeScript · Jotai · Tailwind CSS · SQLite · JWT
