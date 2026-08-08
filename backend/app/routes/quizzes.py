"""Quizzes, Questions, Choices, and Attempts routes."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models.quiz import Quiz, Question, Choice, QuizAttempt, Answer
from ..models.course import Course
from ..models.user import User
from ..utils.decorators import instructor_required
from ..utils.helpers import paginate, apply_sort

quizzes_bp = Blueprint("quizzes", __name__)


# ── Quizzes ────────────────────────────────────────────────────────────────

@quizzes_bp.route("/", methods=["GET"])
@jwt_required()
def list_quizzes():
    """List quizzes filtered by role.
    ---
    tags: [Quizzes]
    security: [{Bearer: []}]
    responses:
      200: {description: Quiz list}
    """
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    query = Quiz.query

    if user.role == "student":
        enrolled_ids = [e.course_id for e in user.enrollments]
        query = query.filter(Quiz.course_id.in_(enrolled_ids), Quiz.is_published == True)
    elif user.role == "instructor":
        my_courses = [c.id for c in user.courses_taught]
        query = query.filter(Quiz.course_id.in_(my_courses))

    course_id = request.args.get("course_id", type=int)
    if course_id:
        query = query.filter_by(course_id=course_id)

    query = apply_sort(query, Quiz, ["title", "created_at"])
    result = paginate(query)
    return jsonify({
        "quizzes": [q.to_dict() for q in result["items"]],
        "meta": result["meta"],
    })


@quizzes_bp.route("/<int:quiz_id>", methods=["GET"])
@jwt_required()
def get_quiz(quiz_id: int):
    """Get quiz with questions (correct answers hidden for students).
    ---
    tags: [Quizzes]
    security: [{Bearer: []}]
    responses:
      200: {description: Quiz detail}
    """
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    quiz = Quiz.query.get_or_404(quiz_id)

    hide_correct = user.role == "student"
    data = quiz.to_dict(include_questions=True)
    if hide_correct:
        for q in data.get("questions", []):
            for c in q.get("choices", []):
                c.pop("is_correct", None)
    return jsonify({"quiz": data})


@quizzes_bp.route("/", methods=["POST"])
@jwt_required()
@instructor_required
def create_quiz():
    """Create a quiz.
    ---
    tags: [Quizzes]
    security: [{Bearer: []}]
    responses:
      201: {description: Created}
    """
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    data = request.get_json() or {}

    if not data.get("course_id") or not data.get("title"):
        return jsonify({"error": "course_id and title are required"}), 400

    course = Course.query.get_or_404(data["course_id"])
    if user.role == "instructor" and course.instructor_id != user_id:
        return jsonify({"error": "Not your course"}), 403

    quiz = Quiz(
        course_id=data["course_id"],
        title=data["title"].strip(),
        description=data.get("description"),
        time_limit_minutes=data.get("time_limit_minutes"),
        pass_score=data.get("pass_score", 60.0),
        is_published=data.get("is_published", False),
    )
    db.session.add(quiz)
    db.session.commit()
    return jsonify({"message": "Quiz created", "quiz": quiz.to_dict()}), 201


@quizzes_bp.route("/<int:quiz_id>", methods=["PUT", "PATCH"])
@jwt_required()
@instructor_required
def update_quiz(quiz_id: int):
    """Update a quiz.
    ---
    tags: [Quizzes]
    security: [{Bearer: []}]
    responses:
      200: {description: Updated}
    """
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    quiz = Quiz.query.get_or_404(quiz_id)

    if user.role == "instructor" and quiz.course.instructor_id != user_id:
        return jsonify({"error": "Not your course"}), 403

    data = request.get_json() or {}
    for field in ("title", "description", "time_limit_minutes", "pass_score", "is_published"):
        if field in data:
            setattr(quiz, field, data[field])

    db.session.commit()
    return jsonify({"message": "Quiz updated", "quiz": quiz.to_dict()})


@quizzes_bp.route("/<int:quiz_id>", methods=["DELETE"])
@jwt_required()
@instructor_required
def delete_quiz(quiz_id: int):
    """Delete a quiz.
    ---
    tags: [Quizzes]
    security: [{Bearer: []}]
    responses:
      200: {description: Deleted}
    """
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    quiz = Quiz.query.get_or_404(quiz_id)

    if user.role == "instructor" and quiz.course.instructor_id != user_id:
        return jsonify({"error": "Not your course"}), 403

    db.session.delete(quiz)
    db.session.commit()
    return jsonify({"message": "Quiz deleted"})


# ── Questions & Choices ──────────────────────────────────────────────────────

@quizzes_bp.route("/<int:quiz_id>/questions", methods=["POST"])
@jwt_required()
@instructor_required
def add_question(quiz_id: int):
    """Add a question with choices to a quiz.
    ---
    tags: [Quizzes]
    security: [{Bearer: []}]
    parameters:
      - in: body
        schema:
          required: [text, choices]
          properties:
            text: {type: string}
            question_type: {type: string, enum: [mcq, true_false]}
            points: {type: number}
            choices:
              type: array
              items:
                properties:
                  text: {type: string}
                  is_correct: {type: boolean}
    responses:
      201: {description: Question added}
    """
    quiz = Quiz.query.get_or_404(quiz_id)
    data = request.get_json() or {}

    if not data.get("text") or not data.get("choices"):
        return jsonify({"error": "text and choices are required"}), 400

    question = Question(
        quiz_id=quiz_id,
        text=data["text"].strip(),
        question_type=data.get("question_type", "mcq"),
        points=data.get("points", 1.0),
        order=data.get("order", quiz.questions.count()),
    )
    db.session.add(question)
    db.session.flush()

    for choice_data in data["choices"]:
        choice = Choice(
            question_id=question.id,
            text=choice_data["text"].strip(),
            is_correct=choice_data.get("is_correct", False),
        )
        db.session.add(choice)

    db.session.commit()
    return jsonify({"message": "Question added", "question": question.to_dict()}), 201


@quizzes_bp.route("/questions/<int:question_id>", methods=["DELETE"])
@jwt_required()
@instructor_required
def delete_question(question_id: int):
    """Delete a question.
    ---
    tags: [Quizzes]
    security: [{Bearer: []}]
    responses:
      200: {description: Deleted}
    """
    question = Question.query.get_or_404(question_id)
    db.session.delete(question)
    db.session.commit()
    return jsonify({"message": "Question deleted"})


# ── Quiz Attempts ────────────────────────────────────────────────────────────

@quizzes_bp.route("/<int:quiz_id>/attempt", methods=["POST"])
@jwt_required()
def start_or_submit_attempt(quiz_id: int):
    """Start or submit a quiz attempt.
    ---
    tags: [Quizzes]
    security: [{Bearer: []}]
    parameters:
      - in: body
        schema:
          properties:
            answers:
              type: array
              items:
                properties:
                  question_id: {type: integer}
                  choice_id: {type: integer}
    responses:
      201: {description: Attempt started or scored}
    """
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    if user.role not in ("student", "admin"):
        return jsonify({"error": "Only students can take quizzes"}), 403

    quiz = Quiz.query.get_or_404(quiz_id)
    if not quiz.is_published:
        return jsonify({"error": "Quiz is not published"}), 400

    data = request.get_json() or {}
    answers_data = data.get("answers", [])

    # Create attempt
    attempt = QuizAttempt(quiz_id=quiz_id, student_id=user_id)
    db.session.add(attempt)
    db.session.flush()

    # Record answers
    for ans in answers_data:
        question_id = ans.get("question_id")
        choice_id = ans.get("choice_id")
        question = Question.query.get(question_id)
        if not question or question.quiz_id != quiz_id:
            continue
        answer = Answer(
            attempt_id=attempt.id,
            question_id=question_id,
            selected_choice_id=choice_id,
        )
        db.session.add(answer)

    db.session.flush()

    # Auto-calculate score
    attempt.calculate_score()
    db.session.commit()

    return jsonify({
        "message": "Quiz submitted and graded",
        "attempt": attempt.to_dict(include_answers=True),
    }), 201


@quizzes_bp.route("/<int:quiz_id>/attempts", methods=["GET"])
@jwt_required()
def list_attempts(quiz_id: int):
    """List attempts for a quiz.
    ---
    tags: [Quizzes]
    security: [{Bearer: []}]
    responses:
      200: {description: Attempt list}
    """
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    quiz = Quiz.query.get_or_404(quiz_id)

    query = QuizAttempt.query.filter_by(quiz_id=quiz_id)
    if user.role == "student":
        query = query.filter_by(student_id=user_id)

    result = paginate(query)
    return jsonify({
        "attempts": [a.to_dict() for a in result["items"]],
        "meta": result["meta"],
    })


@quizzes_bp.route("/attempts/<int:attempt_id>", methods=["GET"])
@jwt_required()
def get_attempt(attempt_id: int):
    """Get attempt detail with answers.
    ---
    tags: [Quizzes]
    security: [{Bearer: []}]
    responses:
      200: {description: Attempt detail}
    """
    attempt = QuizAttempt.query.get_or_404(attempt_id)
    return jsonify({"attempt": attempt.to_dict(include_answers=True)})
