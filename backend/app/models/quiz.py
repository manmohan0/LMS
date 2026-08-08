"""Quiz, Question, Choice, QuizAttempt, Answer models."""
from datetime import datetime, timezone
from ..extensions import db


class Quiz(db.Model):
    __tablename__ = "quizzes"

    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    time_limit_minutes = db.Column(db.Integer, nullable=True)
    pass_score = db.Column(db.Float, default=60.0)
    is_published = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    course = db.relationship("Course", back_populates="quizzes")
    questions = db.relationship("Question", back_populates="quiz", cascade="all, delete-orphan", lazy="dynamic")
    attempts = db.relationship("QuizAttempt", back_populates="quiz", lazy="dynamic", cascade="all, delete-orphan")

    @property
    def total_points(self) -> float:
        return sum(q.points for q in self.questions)

    def to_dict(self, include_questions: bool = False) -> dict:
        data = {
            "id": self.id,
            "course_id": self.course_id,
            "course_title": self.course.title if self.course else None,
            "title": self.title,
            "description": self.description,
            "time_limit_minutes": self.time_limit_minutes,
            "pass_score": self.pass_score,
            "is_published": self.is_published,
            "question_count": self.questions.count(),
            "total_points": self.total_points,
            "attempt_count": self.attempts.count(),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_questions:
            data["questions"] = [q.to_dict(include_choices=True) for q in self.questions]
        return data


class Question(db.Model):
    __tablename__ = "questions"

    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey("quizzes.id"), nullable=False)
    text = db.Column(db.Text, nullable=False)
    question_type = db.Column(db.Enum("mcq", "true_false", name="question_type"), default="mcq")
    points = db.Column(db.Float, default=1.0)
    order = db.Column(db.Integer, default=0)

    quiz = db.relationship("Quiz", back_populates="questions")
    choices = db.relationship("Choice", back_populates="question", cascade="all, delete-orphan")
    answers = db.relationship("Answer", back_populates="question", lazy="dynamic")

    def to_dict(self, include_choices: bool = True, hide_correct: bool = False) -> dict:
        data = {
            "id": self.id,
            "quiz_id": self.quiz_id,
            "text": self.text,
            "question_type": self.question_type,
            "points": self.points,
            "order": self.order,
        }
        if include_choices:
            data["choices"] = [c.to_dict(hide_correct=hide_correct) for c in self.choices]
        return data


class Choice(db.Model):
    __tablename__ = "choices"

    id = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(db.Integer, db.ForeignKey("questions.id"), nullable=False)
    text = db.Column(db.String(500), nullable=False)
    is_correct = db.Column(db.Boolean, default=False)

    question = db.relationship("Question", back_populates="choices")
    answers = db.relationship("Answer", back_populates="selected_choice", lazy="dynamic")

    def to_dict(self, hide_correct: bool = False) -> dict:
        data = {"id": self.id, "question_id": self.question_id, "text": self.text}
        if not hide_correct:
            data["is_correct"] = self.is_correct
        return data


class QuizAttempt(db.Model):
    __tablename__ = "quiz_attempts"

    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey("quizzes.id"), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    score = db.Column(db.Float, nullable=True)
    max_score = db.Column(db.Float, nullable=True)
    percentage = db.Column(db.Float, nullable=True)
    passed = db.Column(db.Boolean, nullable=True)
    started_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = db.Column(db.DateTime, nullable=True)
    is_complete = db.Column(db.Boolean, default=False)

    quiz = db.relationship("Quiz", back_populates="attempts")
    student = db.relationship("User", back_populates="quiz_attempts")
    answers = db.relationship("Answer", back_populates="attempt", cascade="all, delete-orphan")

    def calculate_score(self) -> float:
        """Auto-grade the attempt based on answers."""
        total = 0.0
        earned = 0.0
        for answer in self.answers:
            total += answer.question.points
            if answer.selected_choice and answer.selected_choice.is_correct:
                earned += answer.question.points
        self.score = earned
        self.max_score = total
        self.percentage = round((earned / total) * 100, 2) if total > 0 else 0.0
        self.passed = self.percentage >= self.quiz.pass_score
        self.is_complete = True
        self.completed_at = datetime.now(timezone.utc)
        return self.score

    def to_dict(self, include_answers: bool = False) -> dict:
        data = {
            "id": self.id,
            "quiz_id": self.quiz_id,
            "quiz_title": self.quiz.title if self.quiz else None,
            "student_id": self.student_id,
            "student_name": self.student.full_name if self.student else None,
            "score": self.score,
            "max_score": self.max_score,
            "percentage": self.percentage,
            "passed": self.passed,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "is_complete": self.is_complete,
        }
        if include_answers:
            data["answers"] = [a.to_dict() for a in self.answers]
        return data


class Answer(db.Model):
    __tablename__ = "answers"

    id = db.Column(db.Integer, primary_key=True)
    attempt_id = db.Column(db.Integer, db.ForeignKey("quiz_attempts.id"), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey("questions.id"), nullable=False)
    selected_choice_id = db.Column(db.Integer, db.ForeignKey("choices.id"), nullable=True)

    attempt = db.relationship("QuizAttempt", back_populates="answers")
    question = db.relationship("Question", back_populates="answers")
    selected_choice = db.relationship("Choice", back_populates="answers")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "question_id": self.question_id,
            "question_text": self.question.text if self.question else None,
            "selected_choice_id": self.selected_choice_id,
            "selected_choice_text": self.selected_choice.text if self.selected_choice else None,
            "is_correct": self.selected_choice.is_correct if self.selected_choice else False,
            "points_earned": self.question.points if (self.selected_choice and self.selected_choice.is_correct) else 0,
        }
