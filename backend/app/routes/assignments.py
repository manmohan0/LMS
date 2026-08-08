"""Assignments and submissions routes."""
import os
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from ..extensions import db
from ..models.assignment import Assignment, Submission
from ..models.course import Course
from ..models.user import User
from ..utils.decorators import instructor_required
from ..utils.helpers import paginate, apply_search, apply_sort

assignments_bp = Blueprint("assignments", __name__)

ALLOWED_EXTENSIONS = {"pdf", "doc", "docx", "txt", "zip", "py", "js"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# ── Assignments ───────────────────────────────────────────────────────────────

@assignments_bp.route("/", methods=["GET"])
@jwt_required()
def list_assignments():
    """List assignments (filtered by role).
    ---
    tags: [Assignments]
    security: [{Bearer: []}]
    responses:
      200: {description: Assignment list}
    """
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    query = Assignment.query

    if user.role == "instructor":
        # Only assignments in instructor's courses
        my_course_ids = [c.id for c in user.courses_taught]
        query = query.filter(Assignment.course_id.in_(my_course_ids))
    elif user.role == "student":
        # Assignments for enrolled courses
        enrolled_ids = [e.course_id for e in user.enrollments]
        query = query.filter(Assignment.course_id.in_(enrolled_ids))

    course_id = request.args.get("course_id", type=int)
    if course_id:
        query = query.filter_by(course_id=course_id)

    query = apply_search(query, Assignment, ["title", "description"])
    query = apply_sort(query, Assignment, ["title", "due_date", "created_at"])
    result = paginate(query)
    return jsonify({
        "assignments": [a.to_dict() for a in result["items"]],
        "meta": result["meta"],
    })


@assignments_bp.route("/<int:assignment_id>", methods=["GET"])
@jwt_required()
def get_assignment(assignment_id: int):
    """Get assignment detail.
    ---
    tags: [Assignments]
    security: [{Bearer: []}]
    responses:
      200: {description: Assignment}
    """
    assignment = Assignment.query.get_or_404(assignment_id)
    return jsonify({"assignment": assignment.to_dict()})


@assignments_bp.route("/", methods=["POST"])
@jwt_required()
@instructor_required
def create_assignment():
    """Create an assignment.
    ---
    tags: [Assignments]
    security: [{Bearer: []}]
    responses:
      201: {description: Created}
    """
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    data = request.get_json() or {}

    required = ["course_id", "title"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing: {', '.join(missing)}"}), 400

    course = Course.query.get_or_404(data["course_id"])
    if user.role == "instructor" and course.instructor_id != user_id:
        return jsonify({"error": "Not your course"}), 403

    due_date = None
    if data.get("due_date"):
        try:
            due_date = datetime.fromisoformat(data["due_date"])
        except ValueError:
            return jsonify({"error": "Invalid due_date format. Use ISO 8601."}), 400

    assignment = Assignment(
        course_id=data["course_id"],
        title=data["title"].strip(),
        description=data.get("description"),
        due_date=due_date,
        max_score=data.get("max_score", 100.0),
    )
    db.session.add(assignment)
    db.session.commit()
    return jsonify({"message": "Assignment created", "assignment": assignment.to_dict()}), 201


@assignments_bp.route("/<int:assignment_id>", methods=["PUT", "PATCH"])
@jwt_required()
@instructor_required
def update_assignment(assignment_id: int):
    """Update an assignment.
    ---
    tags: [Assignments]
    security: [{Bearer: []}]
    responses:
      200: {description: Updated}
    """
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    assignment = Assignment.query.get_or_404(assignment_id)

    if user.role == "instructor" and assignment.course.instructor_id != user_id:
        return jsonify({"error": "Not your course"}), 403

    data = request.get_json() or {}
    for field in ("title", "description", "max_score"):
        if field in data:
            setattr(assignment, field, data[field])

    if "due_date" in data:
        try:
            assignment.due_date = datetime.fromisoformat(data["due_date"]) if data["due_date"] else None
        except ValueError:
            return jsonify({"error": "Invalid due_date format"}), 400

    db.session.commit()
    return jsonify({"message": "Assignment updated", "assignment": assignment.to_dict()})


@assignments_bp.route("/<int:assignment_id>", methods=["DELETE"])
@jwt_required()
@instructor_required
def delete_assignment(assignment_id: int):
    """Delete an assignment.
    ---
    tags: [Assignments]
    security: [{Bearer: []}]
    responses:
      200: {description: Deleted}
    """
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    assignment = Assignment.query.get_or_404(assignment_id)

    if user.role == "instructor" and assignment.course.instructor_id != user_id:
        return jsonify({"error": "Not your course"}), 403

    db.session.delete(assignment)
    db.session.commit()
    return jsonify({"message": "Assignment deleted"})


# ── Submissions ───────────────────────────────────────────────────────────────

@assignments_bp.route("/<int:assignment_id>/submit", methods=["POST"])
@jwt_required()
def submit_assignment(assignment_id: int):
    """Student submits an assignment.
    ---
    tags: [Assignments]
    security: [{Bearer: []}]
    responses:
      201: {description: Submission created}
      409: {description: Already submitted}
    """
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    if user.role not in ("student", "admin"):
        return jsonify({"error": "Only students can submit assignments"}), 403

    assignment = Assignment.query.get_or_404(assignment_id)

    existing = Submission.query.filter_by(assignment_id=assignment_id, student_id=user_id).first()
    if existing:
        return jsonify({"error": "Already submitted. Contact instructor for resubmission."}), 409

    file_url = None
    content = None

    # Handle file upload
    if "file" in request.files:
        file = request.files["file"]
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            upload_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], "submissions")
            os.makedirs(upload_dir, exist_ok=True)
            filepath = os.path.join(upload_dir, f"{user_id}_{assignment_id}_{filename}")
            file.save(filepath)
            file_url = f"/uploads/submissions/{user_id}_{assignment_id}_{filename}"
    else:
        data = request.get_json() or {}
        content = data.get("content")

    submission = Submission(
        assignment_id=assignment_id,
        student_id=user_id,
        file_url=file_url,
        content=content,
        status="submitted",
    )
    db.session.add(submission)
    db.session.commit()
    return jsonify({"message": "Assignment submitted", "submission": submission.to_dict()}), 201


@assignments_bp.route("/<int:assignment_id>/submissions", methods=["GET"])
@jwt_required()
@instructor_required
def list_submissions(assignment_id: int):
    """Instructor: List submissions for an assignment.
    ---
    tags: [Assignments]
    security: [{Bearer: []}]
    responses:
      200: {description: Submission list}
    """
    assignment = Assignment.query.get_or_404(assignment_id)
    query = Submission.query.filter_by(assignment_id=assignment_id)
    result = paginate(query)
    return jsonify({
        "assignment": assignment.to_dict(),
        "submissions": [s.to_dict() for s in result["items"]],
        "meta": result["meta"],
    })


@assignments_bp.route("/submissions/<int:submission_id>/grade", methods=["PATCH"])
@jwt_required()
@instructor_required
def grade_submission(submission_id: int):
    """Instructor grades a submission.
    ---
    tags: [Assignments]
    security: [{Bearer: []}]
    parameters:
      - in: body
        schema:
          properties:
            score: {type: number}
            feedback: {type: string}
    responses:
      200: {description: Graded}
    """
    user_id = int(get_jwt_identity())
    submission = Submission.query.get_or_404(submission_id)
    data = request.get_json() or {}

    if "score" in data:
        score = float(data["score"])
        if score < 0 or score > submission.assignment.max_score:
            return jsonify({"error": f"Score must be between 0 and {submission.assignment.max_score}"}), 400
        submission.score = score

    submission.feedback = data.get("feedback", submission.feedback)
    submission.graded_by_id = user_id
    submission.graded_at = datetime.now(timezone.utc)
    submission.status = "graded"

    db.session.commit()
    return jsonify({"message": "Submission graded", "submission": submission.to_dict()})


@assignments_bp.route("/submissions/my", methods=["GET"])
@jwt_required()
def my_submissions():
    """Student: Get my submissions.
    ---
    tags: [Assignments]
    security: [{Bearer: []}]
    responses:
      200: {description: My submissions}
    """
    user_id = int(get_jwt_identity())
    query = Submission.query.filter_by(student_id=user_id)
    result = paginate(query)
    return jsonify({
        "submissions": [s.to_dict() for s in result["items"]],
        "meta": result["meta"],
    })
