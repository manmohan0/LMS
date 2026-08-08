"""Reports and analytics routes."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from ..extensions import db
from ..models.user import User
from ..models.course import Course
from ..models.enrollment import Enrollment
from ..models.assignment import Submission
from ..models.quiz import QuizAttempt
from ..utils.decorators import admin_required, instructor_required

reports_bp = Blueprint("reports", __name__)


@reports_bp.route("/admin/summary", methods=["GET"])
@jwt_required()
@admin_required
def admin_summary():
    """Admin dashboard summary statistics.
    ---
    tags: [Reports]
    security: [{Bearer: []}]
    responses:
      200: {description: Summary stats}
    """
    total_students = User.query.filter_by(role="student").count()
    total_instructors = User.query.filter_by(role="instructor").count()
    total_courses = Course.query.count()
    published_courses = Course.query.filter_by(is_published=True).count()
    total_enrollments = Enrollment.query.count()
    completed_enrollments = Enrollment.query.filter_by(is_completed=True).count()
    total_submissions = Submission.query.count()
    graded_submissions = Submission.query.filter_by(status="graded").count()
    total_attempts = QuizAttempt.query.count()
    passed_attempts = QuizAttempt.query.filter_by(passed=True).count()

    return jsonify({
        "students": total_students,
        "instructors": total_instructors,
        "total_courses": total_courses,
        "published_courses": published_courses,
        "total_enrollments": total_enrollments,
        "completed_enrollments": completed_enrollments,
        "completion_rate": round((completed_enrollments / total_enrollments * 100), 2) if total_enrollments else 0,
        "total_submissions": total_submissions,
        "graded_submissions": graded_submissions,
        "total_quiz_attempts": total_attempts,
        "passed_attempts": passed_attempts,
        "quiz_pass_rate": round((passed_attempts / total_attempts * 100), 2) if total_attempts else 0,
    })


@reports_bp.route("/student/<int:student_id>", methods=["GET"])
@jwt_required()
def student_report(student_id: int):
    """Get a student's performance summary.
    ---
    tags: [Reports]
    security: [{Bearer: []}]
    responses:
      200: {description: Student performance report}
    """
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)

    # Students can only view their own report
    if user.role == "student" and user_id != student_id:
        return jsonify({"error": "Access denied"}), 403

    student = User.query.get_or_404(student_id)
    enrollments = Enrollment.query.filter_by(student_id=student_id).all()
    submissions = Submission.query.filter_by(student_id=student_id).all()
    attempts = QuizAttempt.query.filter_by(student_id=student_id).all()

    graded_submissions = [s for s in submissions if s.score is not None]
    avg_assignment_score = (
        sum(s.score for s in graded_submissions) / len(graded_submissions)
        if graded_submissions else 0
    )

    completed_attempts = [a for a in attempts if a.is_complete]
    avg_quiz_score = (
        sum(a.percentage for a in completed_attempts) / len(completed_attempts)
        if completed_attempts else 0
    )

    course_progress = [
        {
            "course_id": e.course_id,
            "course_title": e.course.title,
            "progress_percent": e.progress_percent,
            "is_completed": e.is_completed,
            "enrolled_at": e.enrolled_at.isoformat() if e.enrolled_at else None,
        }
        for e in enrollments
    ]

    return jsonify({
        "student": student.to_dict(),
        "total_enrolled": len(enrollments),
        "completed_courses": sum(1 for e in enrollments if e.is_completed),
        "avg_progress": round(sum(e.progress_percent for e in enrollments) / len(enrollments), 2) if enrollments else 0,
        "total_submissions": len(submissions),
        "avg_assignment_score": round(avg_assignment_score, 2),
        "total_quiz_attempts": len(attempts),
        "quiz_pass_count": sum(1 for a in attempts if a.passed),
        "avg_quiz_score": round(avg_quiz_score, 2),
        "course_progress": course_progress,
    })


@reports_bp.route("/course/<int:course_id>", methods=["GET"])
@jwt_required()
@instructor_required
def course_report(course_id: int):
    """Instructor: Course performance report.
    ---
    tags: [Reports]
    security: [{Bearer: []}]
    responses:
      200: {description: Course report}
    """
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    course = Course.query.get_or_404(course_id)

    if user.role == "instructor" and course.instructor_id != user_id:
        return jsonify({"error": "Not your course"}), 403

    enrollments = Enrollment.query.filter_by(course_id=course_id).all()
    avg_progress = (
        sum(e.progress_percent for e in enrollments) / len(enrollments)
        if enrollments else 0
    )

    quiz_attempts = QuizAttempt.query.join(QuizAttempt.quiz).filter_by(course_id=course_id).all()
    avg_quiz = (
        sum(a.percentage for a in quiz_attempts if a.is_complete) / len([a for a in quiz_attempts if a.is_complete])
        if any(a.is_complete for a in quiz_attempts) else 0
    )

    submissions = Submission.query.join(Submission.assignment).filter_by(course_id=course_id).all()
    graded = [s for s in submissions if s.score is not None]
    avg_assign = sum(s.score for s in graded) / len(graded) if graded else 0

    # Progress distribution
    distribution = {"0-25": 0, "26-50": 0, "51-75": 0, "76-100": 0}
    for e in enrollments:
        p = e.progress_percent
        if p <= 25:
            distribution["0-25"] += 1
        elif p <= 50:
            distribution["26-50"] += 1
        elif p <= 75:
            distribution["51-75"] += 1
        else:
            distribution["76-100"] += 1

    return jsonify({
        "course": course.to_dict(),
        "total_enrolled": len(enrollments),
        "completed_count": sum(1 for e in enrollments if e.is_completed),
        "avg_progress": round(avg_progress, 2),
        "completion_rate": round(sum(1 for e in enrollments if e.is_completed) / len(enrollments) * 100, 2) if enrollments else 0,
        "total_quiz_attempts": len(quiz_attempts),
        "avg_quiz_score": round(avg_quiz, 2),
        "total_submissions": len(submissions),
        "avg_assignment_score": round(avg_assign, 2),
        "progress_distribution": distribution,
        "students": [
            {
                "student_id": e.student_id,
                "student_name": e.student.full_name,
                "progress_percent": e.progress_percent,
                "is_completed": e.is_completed,
            }
            for e in enrollments
        ],
    })


@reports_bp.route("/instructor/<int:instructor_id>", methods=["GET"])
@jwt_required()
@instructor_required
def instructor_summary(instructor_id: int):
    """Instructor dashboard summary.
    ---
    tags: [Reports]
    security: [{Bearer: []}]
    responses:
      200: {description: Instructor summary}
    """
    user_id = int(get_jwt_identity())
    if user_id != instructor_id:
        user = User.query.get_or_404(user_id)
        if user.role != "admin":
            return jsonify({"error": "Access denied"}), 403

    instructor = User.query.get_or_404(instructor_id)
    courses = Course.query.filter_by(instructor_id=instructor_id).all()
    course_ids = [c.id for c in courses]

    total_students = db.session.query(func.count(func.distinct(Enrollment.student_id)))\
        .filter(Enrollment.course_id.in_(course_ids)).scalar() or 0

    return jsonify({
        "instructor": instructor.to_dict(),
        "total_courses": len(courses),
        "published_courses": sum(1 for c in courses if c.is_published),
        "total_students": total_students,
        "courses": [c.to_dict() for c in courses],
    })
