"""Assignment and Submission models."""
from datetime import datetime, timezone
from ..extensions import db


class Assignment(db.Model):
    __tablename__ = "assignments"

    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    due_date = db.Column(db.DateTime, nullable=True)
    max_score = db.Column(db.Float, default=100.0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    course = db.relationship("Course", back_populates="assignments")
    submissions = db.relationship("Submission", back_populates="assignment", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "course_id": self.course_id,
            "course_title": self.course.title if self.course else None,
            "title": self.title,
            "description": self.description,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "max_score": self.max_score,
            "submission_count": self.submissions.count(),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Submission(db.Model):
    __tablename__ = "submissions"

    id = db.Column(db.Integer, primary_key=True)
    assignment_id = db.Column(db.Integer, db.ForeignKey("assignments.id"), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    file_url = db.Column(db.String(255), nullable=True)
    content = db.Column(db.Text, nullable=True)   # text-based submission
    submitted_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    score = db.Column(db.Float, nullable=True)
    feedback = db.Column(db.Text, nullable=True)
    graded_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    graded_at = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.Enum("submitted", "graded", "returned", name="submission_status"), default="submitted")

    __table_args__ = (db.UniqueConstraint("assignment_id", "student_id", name="uq_submission"),)

    assignment = db.relationship("Assignment", back_populates="submissions")
    student = db.relationship("User", foreign_keys=[student_id], back_populates="submissions")
    graded_by = db.relationship("User", foreign_keys=[graded_by_id])

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "assignment_id": self.assignment_id,
            "assignment_title": self.assignment.title if self.assignment else None,
            "student_id": self.student_id,
            "student_name": self.student.full_name if self.student else None,
            "file_url": self.file_url,
            "content": self.content,
            "submitted_at": self.submitted_at.isoformat() if self.submitted_at else None,
            "score": self.score,
            "max_score": self.assignment.max_score if self.assignment else None,
            "feedback": self.feedback,
            "graded_by": self.graded_by.full_name if self.graded_by else None,
            "graded_at": self.graded_at.isoformat() if self.graded_at else None,
            "status": self.status,
        }
