"""Enrollment and lesson progress routes."""
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models.enrollment import Enrollment, LessonProgress
from ..models.course import Course, Lesson
from ..models.user import User
from ..utils.decorators import admin_required
from ..utils.helpers import paginate

enrollments_bp = Blueprint("enrollments", __name__)


@enrollments_bp.route("/", methods=["POST"])
@jwt_required()
def enroll():
    """Enroll current student in a course.
    ---
    tags: [Enrollments]
    security: [{Bearer: []}]
    parameters:
      - in: body
        schema:
          required: [course_id]
          properties:
            course_id: {type: integer}
    responses:
      201: {description: Enrolled}
      409: {description: Already enrolled}
    """
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    if user.role not in ("student", "admin"):
        return jsonify({"error": "Only students can enroll"}), 403

    data = request.get_json() or {}
    course_id = data.get("course_id")
    if not course_id:
        return jsonify({"error": "course_id is required"}), 400

    course = Course.query.get_or_404(course_id)
    if not course.is_published:
        return jsonify({"error": "Course is not available for enrollment"}), 400

    existing = Enrollment.query.filter_by(student_id=user_id, course_id=course_id).first()
    if existing:
        return jsonify({"error": "Already enrolled in this course"}), 409

    enrollment = Enrollment(student_id=user_id, course_id=course_id)
    db.session.add(enrollment)
    db.session.flush()

    # Pre-create progress records for each lesson
    for lesson in course.lessons:
        lp = LessonProgress(enrollment_id=enrollment.id, lesson_id=lesson.id)
        db.session.add(lp)

    db.session.commit()
    return jsonify({"message": "Enrolled successfully", "enrollment": enrollment.to_dict()}), 201


@enrollments_bp.route("/my", methods=["GET"])
@jwt_required()
def my_enrollments():
    """Get current student's enrollments.
    ---
    tags: [Enrollments]
    security: [{Bearer: []}]
    responses:
      200: {description: My enrollments}
    """
    user_id = int(get_jwt_identity())
    query = Enrollment.query.filter_by(student_id=user_id)
    result = paginate(query)
    return jsonify({
        "enrollments": [e.to_dict() for e in result["items"]],
        "meta": result["meta"],
    })


@enrollments_bp.route("/", methods=["GET"])
@jwt_required()
@admin_required
def list_enrollments():
    """Admin: List all enrollments.
    ---
    tags: [Enrollments]
    security: [{Bearer: []}]
    responses:
      200: {description: All enrollments}
    """
    query = Enrollment.query

    course_id = request.args.get("course_id", type=int)
    if course_id:
        query = query.filter_by(course_id=course_id)

    student_id = request.args.get("student_id", type=int)
    if student_id:
        query = query.filter_by(student_id=student_id)

    result = paginate(query)
    return jsonify({
        "enrollments": [e.to_dict() for e in result["items"]],
        "meta": result["meta"],
    })


@enrollments_bp.route("/<int:enrollment_id>", methods=["DELETE"])
@jwt_required()
@admin_required
def unenroll(enrollment_id: int):
    """Admin: Remove an enrollment.
    ---
    tags: [Enrollments]
    security: [{Bearer: []}]
    responses:
      200: {description: Removed}
    """
    enrollment = Enrollment.query.get_or_404(enrollment_id)
    db.session.delete(enrollment)
    db.session.commit()
    return jsonify({"message": "Enrollment removed"})


# ── Lesson Progress ───────────────────────────────────────────────────────────

@enrollments_bp.route("/progress/<int:lesson_id>/complete", methods=["POST"])
@jwt_required()
def complete_lesson(lesson_id: int):
    """Mark a lesson as complete for the current student.
    ---
    tags: [Progress]
    security: [{Bearer: []}]
    responses:
      200: {description: Lesson marked complete}
      404: {description: Not enrolled}
    """
    user_id = int(get_jwt_identity())
    lesson = Lesson.query.get_or_404(lesson_id)

    enrollment = Enrollment.query.filter_by(
        student_id=user_id, course_id=lesson.course_id
    ).first()
    if not enrollment:
        return jsonify({"error": "Not enrolled in this course"}), 404

    lp = LessonProgress.query.filter_by(
        enrollment_id=enrollment.id, lesson_id=lesson_id
    ).first()

    if not lp:
        lp = LessonProgress(enrollment_id=enrollment.id, lesson_id=lesson_id)
        db.session.add(lp)

    if not lp.is_completed:
        lp.is_completed = True
        lp.completed_at = datetime.now(timezone.utc)

    progress = enrollment.calculate_progress()
    db.session.commit()

    return jsonify({
        "message": "Lesson completed",
        "progress_percent": progress,
        "is_course_completed": enrollment.is_completed,
    })


@enrollments_bp.route("/progress/<int:course_id>", methods=["GET"])
@jwt_required()
def get_course_progress(course_id: int):
    """Get detailed lesson progress for a course.
    ---
    tags: [Progress]
    security: [{Bearer: []}]
    responses:
      200: {description: Course progress detail}
    """
    user_id = int(get_jwt_identity())
    enrollment = Enrollment.query.filter_by(student_id=user_id, course_id=course_id).first()
    if not enrollment:
        return jsonify({"error": "Not enrolled"}), 404

    lesson_progress = [lp.to_dict() for lp in enrollment.lesson_progress]
    return jsonify({
        "enrollment": enrollment.to_dict(),
        "lesson_progress": lesson_progress,
    })
