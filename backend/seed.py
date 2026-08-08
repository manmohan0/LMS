"""
Seed script — populates the database with sample data.
Run: python seed.py
"""
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.course import Category, Course, Lesson
from app.models.enrollment import Enrollment, LessonProgress
from app.models.assignment import Assignment, Submission
from app.models.quiz import Quiz, Question, Choice, QuizAttempt, Answer

app = create_app()

with app.app_context():
    print("Dropping and recreating all tables...")
    db.drop_all()
    db.create_all()

    # ── Users ────────────────────────────────────────────────────────────────
    admin = User(full_name="Admin User", email="admin@lms.com", role="admin")
    admin.set_password("Admin@123")

    instructor1 = User(full_name="Dr. Sarah Johnson", email="instructor@lms.com", role="instructor",
                       bio="Expert in Python and Data Science with 10 years of teaching experience.")
    instructor1.set_password("Instructor@123")

    instructor2 = User(full_name="Prof. Michael Chen", email="instructor2@lms.com", role="instructor",
                       bio="Web Development specialist, React and Node.js educator.")
    instructor2.set_password("Instructor@123")

    student1 = User(full_name="Alice Smith", email="student@lms.com", role="student",
                    bio="Passionate learner interested in AI and Machine Learning.")
    student1.set_password("Student@123")

    student2 = User(full_name="Bob Williams", email="student2@lms.com", role="student")
    student2.set_password("Student@123")

    student3 = User(full_name="Carol Davis", email="student3@lms.com", role="student")
    student3.set_password("Student@123")

    db.session.add_all([admin, instructor1, instructor2, student1, student2, student3])
    db.session.flush()

    # ── Categories ───────────────────────────────────────────────────────────
    cat_python = Category(name="Python", description="Python programming from basics to advanced", icon="🐍")
    cat_web = Category(name="Web Development", description="Frontend and backend web technologies", icon="🌐")
    cat_data = Category(name="Data Science", description="Data analysis, ML, and AI", icon="📊")
    cat_devops = Category(name="DevOps", description="CI/CD, Docker, Kubernetes", icon="⚙️")

    db.session.add_all([cat_python, cat_web, cat_data, cat_devops])
    db.session.flush()

    # ── Courses ──────────────────────────────────────────────────────────────
    course1 = Course(
        title="Python for Beginners", description="Learn Python from scratch. Covers variables, loops, functions, OOP, and more.",
        level="beginner", duration="20 hours", price=0.0, is_published=True,
        instructor_id=instructor1.id, category_id=cat_python.id,
        thumbnail="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800"
    )
    course2 = Course(
        title="Advanced Python & Django", description="Build production-ready web apps with Django REST Framework, authentication, and deployment.",
        level="advanced", duration="30 hours", price=49.99, is_published=True,
        instructor_id=instructor1.id, category_id=cat_python.id,
        thumbnail="https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=800"
    )
    course3 = Course(
        title="React.js Full Course", description="Modern React with hooks, context, routing, and state management.",
        level="intermediate", duration="25 hours", price=39.99, is_published=True,
        instructor_id=instructor2.id, category_id=cat_web.id,
        thumbnail="https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=800"
    )
    course4 = Course(
        title="Data Science with Python", description="Pandas, NumPy, Matplotlib, scikit-learn for real-world ML projects.",
        level="intermediate", duration="35 hours", price=59.99, is_published=True,
        instructor_id=instructor1.id, category_id=cat_data.id,
        thumbnail="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800"
    )

    db.session.add_all([course1, course2, course3, course4])
    db.session.flush()

    # ── Lessons ──────────────────────────────────────────────────────────────
    lessons_c1 = [
        Lesson(course_id=course1.id, title="Introduction to Python", content="History of Python, installation, and Hello World.", order=0, duration_minutes=15),
        Lesson(course_id=course1.id, title="Variables and Data Types", content="Integers, strings, lists, tuples, dicts.", order=1, duration_minutes=20),
        Lesson(course_id=course1.id, title="Control Flow", content="if/elif/else, for loops, while loops.", order=2, duration_minutes=25),
        Lesson(course_id=course1.id, title="Functions and Modules", content="Defining functions, *args, **kwargs, importing modules.", order=3, duration_minutes=30),
        Lesson(course_id=course1.id, title="Object-Oriented Programming", content="Classes, inheritance, encapsulation, polymorphism.", order=4, duration_minutes=40),
    ]

    lessons_c2 = [
        Lesson(course_id=course2.id, title="Django Setup & Project Structure", content="Creating a Django project, apps, settings.", order=0, duration_minutes=20),
        Lesson(course_id=course2.id, title="Models & Database", content="ORM, migrations, relationships.", order=1, duration_minutes=35),
        Lesson(course_id=course2.id, title="REST API with DRF", content="Serializers, ViewSets, Routers.", order=2, duration_minutes=45),
        Lesson(course_id=course2.id, title="JWT Authentication", content="Token-based auth, refresh tokens, permissions.", order=3, duration_minutes=30),
    ]

    lessons_c3 = [
        Lesson(course_id=course3.id, title="React Fundamentals", content="JSX, components, props, state.", order=0, duration_minutes=30),
        Lesson(course_id=course3.id, title="Hooks Deep Dive", content="useState, useEffect, useContext, custom hooks.", order=1, duration_minutes=40),
        Lesson(course_id=course3.id, title="React Router v6", content="Routes, nested routes, protected routes.", order=2, duration_minutes=25),
        Lesson(course_id=course3.id, title="State Management", content="Redux Toolkit, RTK Query, Jotai.", order=3, duration_minutes=35),
    ]

    db.session.add_all(lessons_c1 + lessons_c2 + lessons_c3)
    db.session.flush()

    # ── Enrollments ──────────────────────────────────────────────────────────
    enroll1 = Enrollment(student_id=student1.id, course_id=course1.id, progress_percent=60.0)
    enroll2 = Enrollment(student_id=student1.id, course_id=course3.id, progress_percent=25.0)
    enroll3 = Enrollment(student_id=student2.id, course_id=course1.id, progress_percent=100.0, is_completed=True)
    enroll4 = Enrollment(student_id=student2.id, course_id=course4.id, progress_percent=40.0)
    enroll5 = Enrollment(student_id=student3.id, course_id=course2.id, progress_percent=75.0)

    db.session.add_all([enroll1, enroll2, enroll3, enroll4, enroll5])
    db.session.flush()

    # ── Lesson Progress for student1 on course1 ────────────────────────────
    for i, lesson in enumerate(lessons_c1):
        lp = LessonProgress(
            enrollment_id=enroll1.id,
            lesson_id=lesson.id,
            is_completed=(i < 3),
        )
        db.session.add(lp)

    # ── Assignments ──────────────────────────────────────────────────────────
    from datetime import datetime, timezone, timedelta
    assign1 = Assignment(
        course_id=course1.id, title="Python Basics Exercise",
        description="Write a Python script that reads a list of numbers and outputs the mean, median, and mode.",
        due_date=datetime.now(timezone.utc) + timedelta(days=7), max_score=100.0
    )
    assign2 = Assignment(
        course_id=course3.id, title="Build a To-Do App",
        description="Create a React To-Do application with CRUD operations, local state, and routing.",
        due_date=datetime.now(timezone.utc) + timedelta(days=14), max_score=100.0
    )
    db.session.add_all([assign1, assign2])
    db.session.flush()

    # Submission from student1
    sub1 = Submission(
        assignment_id=assign1.id, student_id=student1.id,
        content="def mean(nums): return sum(nums)/len(nums)\n...",
        status="submitted"
    )
    sub2 = Submission(
        assignment_id=assign1.id, student_id=student2.id,
        content="import statistics\nnums = [1,2,3,4,5]\nprint(statistics.mean(nums))",
        status="graded", score=92.0,
        feedback="Excellent use of the statistics module!", graded_by_id=instructor1.id,
    )
    db.session.add_all([sub1, sub2])
    db.session.flush()

    # ── Quizzes ──────────────────────────────────────────────────────────────
    quiz1 = Quiz(
        course_id=course1.id, title="Python Basics Quiz",
        description="Test your knowledge of Python fundamentals.",
        time_limit_minutes=20, pass_score=60.0, is_published=True
    )
    db.session.add(quiz1)
    db.session.flush()

    # Questions for quiz1
    q1 = Question(quiz_id=quiz1.id, text="Which keyword is used to define a function in Python?", question_type="mcq", points=2.0, order=0)
    db.session.add(q1)
    db.session.flush()
    db.session.add_all([
        Choice(question_id=q1.id, text="def", is_correct=True),
        Choice(question_id=q1.id, text="function", is_correct=False),
        Choice(question_id=q1.id, text="fun", is_correct=False),
        Choice(question_id=q1.id, text="define", is_correct=False),
    ])

    q2 = Question(quiz_id=quiz1.id, text="Python is a compiled language.", question_type="true_false", points=1.0, order=1)
    db.session.add(q2)
    db.session.flush()
    db.session.add_all([
        Choice(question_id=q2.id, text="True", is_correct=False),
        Choice(question_id=q2.id, text="False", is_correct=True),
    ])

    q3 = Question(quiz_id=quiz1.id, text="What is the output of: print(type([]))?", question_type="mcq", points=2.0, order=2)
    db.session.add(q3)
    db.session.flush()
    db.session.add_all([
        Choice(question_id=q3.id, text="<class 'list'>", is_correct=True),
        Choice(question_id=q3.id, text="<class 'array'>", is_correct=False),
        Choice(question_id=q3.id, text="list", is_correct=False),
        Choice(question_id=q3.id, text="<type 'list'>", is_correct=False),
    ])

    db.session.flush()

    # Quiz attempt by student2 (all correct — 5/5 points)
    attempt1 = QuizAttempt(quiz_id=quiz1.id, student_id=student2.id)
    db.session.add(attempt1)
    db.session.flush()

    correct_choices = {
        q1.id: Choice.query.filter_by(question_id=q1.id, is_correct=True).first(),
        q2.id: Choice.query.filter_by(question_id=q2.id, is_correct=True).first(),
        q3.id: Choice.query.filter_by(question_id=q3.id, is_correct=True).first(),
    }
    for qid, choice in correct_choices.items():
        db.session.add(Answer(attempt_id=attempt1.id, question_id=qid, selected_choice_id=choice.id))

    db.session.flush()
    attempt1.calculate_score()

    db.session.commit()
    print("\n✅ Database seeded successfully!")
    print("\n📋 Login Credentials:")
    print("  Admin:      admin@lms.com     / Admin@123")
    print("  Instructor: instructor@lms.com / Instructor@123")
    print("  Student:    student@lms.com   / Student@123")
    print("\n🚀 Run the server: python run.py")
