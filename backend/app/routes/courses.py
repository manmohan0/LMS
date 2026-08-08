"""Courses and Lessons CRUD routes."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models.course import Course, Lesson
from ..models.user import User
from ..utils.decorators import admin_required, instructor_required
from ..utils.helpers import paginate, apply_search, apply_sort

courses_bp = Blueprint("courses", __name__)


# ── Courses ─────────────────────────────────────────────────────────────────

@courses_bp.route("/", methods=["GET"])
def list_courses():
    """List all published courses with search/filter/sort/pagination.
    ---
    tags: [Courses]
    parameters:
      - {name: search, in: query, type: string}
      - {name: category_id, in: query, type: integer}
      - {name: level, in: query, type: string}
      - {name: instructor_id, in: query, type: integer}
      - {name: sort_by, in: query, type: string}
      - {name: order, in: query, type: string}
      - {name: page, in: query, type: integer}
      - {name: per_page, in: query, type: integer}
    responses:
      200: {description: Paginated course list}
    """
    query = Course.query.filter_by(is_published=True)

    cat_id = request.args.get("category_id", type=int)
    if cat_id:
        query = query.filter_by(category_id=cat_id)

    level = request.args.get("level")
    if level in ("beginner", "intermediate", "advanced"):
        query = query.filter_by(level=level)

    inst_id = request.args.get("instructor_id", type=int)
    if inst_id:
        query = query.filter_by(instructor_id=inst_id)

    query = apply_search(query, Course, ["title", "description"])
    query = apply_sort(query, Course, ["title", "price", "created_at", "level"])

    result = paginate(query)
    return jsonify({
        "courses": [c.to_dict() for c in result["items"]],
        "meta": result["meta"],
    })


@courses_bp.route("/all", methods=["GET"])
@jwt_required()
@admin_required
def list_all_courses():
    """Admin: List all courses including unpublished.
    ---
    tags: [Courses]
    security: [{Bearer: []}]
    responses:
      200: {description: All courses}
    """
    query = Course.query
    query = apply_search(query, Course, ["title", "description"])
    query = apply_sort(query, Course, ["title", "price", "created_at"])
    result = paginate(query)
    return jsonify({
        "courses": [c.to_dict() for c in result["items"]],
        "meta": result["meta"],
    })


@courses_bp.route("/my", methods=["GET"])
@jwt_required()
def my_courses():
    """Instructor: Get courses I teach.
    ---
    tags: [Courses]
    security: [{Bearer: []}]
    responses:
      200: {description: My courses}
    """
    user_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    if user.role not in ("instructor", "admin"):
        return jsonify({"error": "Only instructors can access this"}), 403

    query = Course.query.filter_by(instructor_id=user_id)
    query = apply_sort(query, Course, ["title", "created_at"])
    result = paginate(query)
    return jsonify({
        "courses": [c.to_dict() for c in result["items"]],
        "meta": result["meta"],
    })


@courses_bp.route("/<int:course_id>", methods=["GET"])
def get_course(course_id: int):
    """Get course detail with lessons.
    ---
    tags: [Courses]
    responses:
      200: {description: Course detail}
    """
    course = Course.query.get_or_404(course_id)
    return jsonify({"course": course.to_dict(include_lessons=True)})


@courses_bp.route("/", methods=["POST"])
@jwt_required()
@instructor_required
def create_course():
    """Create a new course.
    ---
    tags: [Courses]
    security: [{Bearer: []}]
    responses:
      201: {description: Created}
    """
    user_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    data = request.get_json() or {}

    if not data.get("title"):
        return jsonify({"error": "Title is required"}), 400

    # Instructors can only create courses for themselves; admin can assign
    instructor_id = user_id
    if user.role == "admin" and data.get("instructor_id"):
        instructor_id = data["instructor_id"]

    course = Course(
        title=data["title"].strip(),
        description=data.get("description"),
        thumbnail=data.get("thumbnail"),
        level=data.get("level", "beginner"),
        duration=data.get("duration"),
        price=data.get("price", 0.0),
        is_published=data.get("is_published", False),
        instructor_id=instructor_id,
        category_id=data.get("category_id"),
    )
    db.session.add(course)
    db.session.commit()
    return jsonify({"message": "Course created", "course": course.to_dict()}), 201


@courses_bp.route("/<int:course_id>", methods=["PUT", "PATCH"])
@jwt_required()
@instructor_required
def update_course(course_id: int):
    """Update a course.
    ---
    tags: [Courses]
    security: [{Bearer: []}]
    responses:
      200: {description: Updated}
    """
    user_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    course = Course.query.get_or_404(course_id)

    if user.role == "instructor" and course.instructor_id != user_id:
        return jsonify({"error": "You can only edit your own courses"}), 403

    data = request.get_json() or {}
    for field in ("title", "description", "thumbnail", "level", "duration", "price", "is_published", "category_id"):
        if field in data:
            setattr(course, field, data[field])

    db.session.commit()
    return jsonify({"message": "Course updated", "course": course.to_dict()})


@courses_bp.route("/<int:course_id>", methods=["DELETE"])
@jwt_required()
@instructor_required
def delete_course(course_id: int):
    """Delete a course.
    ---
    tags: [Courses]
    security: [{Bearer: []}]
    responses:
      200: {description: Deleted}
    """
    user_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    course = Course.query.get_or_404(course_id)

    if user.role == "instructor" and course.instructor_id != user_id:
        return jsonify({"error": "You can only delete your own courses"}), 403

    db.session.delete(course)
    db.session.commit()
    return jsonify({"message": "Course deleted"})


# ── Lessons ──────────────────────────────────────────────────────────────────

@courses_bp.route("/<int:course_id>/lessons", methods=["GET"])
def list_lessons(course_id: int):
    """List lessons for a course.
    ---
    tags: [Lessons]
    responses:
      200: {description: Lesson list}
    """
    course = Course.query.get_or_404(course_id)
    return jsonify({"lessons": [l.to_dict() for l in course.lessons]})


@courses_bp.route("/<int:course_id>/lessons", methods=["POST"])
@jwt_required()
@instructor_required
def create_lesson(course_id: int):
    """Add a lesson to a course.
    ---
    tags: [Lessons]
    security: [{Bearer: []}]
    responses:
      201: {description: Created}
    """
    user_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    course = Course.query.get_or_404(course_id)

    if user.role == "instructor" and course.instructor_id != user_id:
        return jsonify({"error": "Not your course"}), 403

    data = request.get_json() or {}
    if not data.get("title"):
        return jsonify({"error": "Title is required"}), 400

    lesson = Lesson(
        course_id=course_id,
        title=data["title"].strip(),
        content=data.get("content"),
        video_url=data.get("video_url"),
        order=data.get("order", len(course.lessons)),
        duration_minutes=data.get("duration_minutes", 0),
    )
    db.session.add(lesson)
    db.session.commit()
    return jsonify({"message": "Lesson created", "lesson": lesson.to_dict()}), 201


@courses_bp.route("/<int:course_id>/lessons/<int:lesson_id>", methods=["PUT", "PATCH"])
@jwt_required()
@instructor_required
def update_lesson(course_id: int, lesson_id: int):
    """Update a lesson.
    ---
    tags: [Lessons]
    security: [{Bearer: []}]
    responses:
      200: {description: Updated}
    """
    user_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    course = Course.query.get_or_404(course_id)
    lesson = Lesson.query.get_or_404(lesson_id)

    if user.role == "instructor" and course.instructor_id != user_id:
        return jsonify({"error": "Not your course"}), 403

    data = request.get_json() or {}
    for field in ("title", "content", "video_url", "order", "duration_minutes"):
        if field in data:
            setattr(lesson, field, data[field])

    db.session.commit()
    return jsonify({"message": "Lesson updated", "lesson": lesson.to_dict()})


@courses_bp.route("/<int:course_id>/lessons/<int:lesson_id>", methods=["DELETE"])
@jwt_required()
@instructor_required
def delete_lesson(course_id: int, lesson_id: int):
    """Delete a lesson.
    ---
    tags: [Lessons]
    security: [{Bearer: []}]
    responses:
      200: {description: Deleted}
    """
    user_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    course = Course.query.get_or_404(course_id)
    lesson = Lesson.query.get_or_404(lesson_id)

    if user.role == "instructor" and course.instructor_id != user_id:
        return jsonify({"error": "Not your course"}), 403

    db.session.delete(lesson)
    db.session.commit()
    return jsonify({"message": "Lesson deleted"})
