"""Enrollment and LessonProgress models."""
from datetime import datetime, timezone
from ..extensions import db


class Enrollment(db.Model):
    __tablename__ = "enrollments"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    enrolled_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    is_completed = db.Column(db.Boolean, default=False)
    completion_date = db.Column(db.DateTime, nullable=True)
    progress_percent = db.Column(db.Float, default=0.0)

    __table_args__ = (db.UniqueConstraint("student_id", "course_id", name="uq_enrollment"),)

    student = db.relationship("User", back_populates="enrollments")
    course = db.relationship("Course", back_populates="enrollments")
    lesson_progress = db.relationship("LessonProgress", back_populates="enrollment", cascade="all, delete-orphan")

    def calculate_progress(self) -> float:
        """Recalculate and persist progress percentage."""
        total = len(self.course.lessons) if (self.course and self.course.lessons) else 0
        if total == 0:
            self.progress_percent = 0.0
            self.is_completed = False
            return 0.0
        completed = sum(1 for lp in self.lesson_progress if lp.is_completed)
        self.progress_percent = round((completed / total) * 100, 2)
        if self.progress_percent >= 100.0:
            self.progress_percent = 100.0
            self.is_completed = True
            if not self.completion_date:
                self.completion_date = datetime.now(timezone.utc)
        else:
            self.is_completed = False
            self.completion_date = None
        return self.progress_percent

    def to_dict(self) -> dict:
        self.calculate_progress()
        return {
            "id": self.id,
            "student_id": self.student_id,
            "student_name": self.student.full_name if self.student else None,
            "course_id": self.course_id,
            "course_title": self.course.title if self.course else None,
            "course_description": self.course.description if self.course else None,
            "course_thumbnail": self.course.thumbnail if self.course else None,
            "course_level": self.course.level if self.course else None,
            "category_name": self.course.category.name if (self.course and self.course.category) else None,
            "instructor_name": self.course.instructor.full_name if (self.course and self.course.instructor) else None,
            "lesson_count": len(self.course.lessons) if (self.course and self.course.lessons) else 0,
            "enrolled_at": self.enrolled_at.isoformat() if self.enrolled_at else None,
            "is_completed": self.is_completed,
            "completion_date": self.completion_date.isoformat() if self.completion_date else None,
            "progress_percent": self.progress_percent,
        }



class LessonProgress(db.Model):
    __tablename__ = "lesson_progress"

    id = db.Column(db.Integer, primary_key=True)
    enrollment_id = db.Column(db.Integer, db.ForeignKey("enrollments.id"), nullable=False)
    lesson_id = db.Column(db.Integer, db.ForeignKey("lessons.id"), nullable=False)
    is_completed = db.Column(db.Boolean, default=False)
    completed_at = db.Column(db.DateTime, nullable=True)

    __table_args__ = (db.UniqueConstraint("enrollment_id", "lesson_id", name="uq_lesson_progress"),)

    enrollment = db.relationship("Enrollment", back_populates="lesson_progress")
    lesson = db.relationship("Lesson", back_populates="progress_records")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "enrollment_id": self.enrollment_id,
            "lesson_id": self.lesson_id,
            "lesson_title": self.lesson.title if self.lesson else None,
            "is_completed": self.is_completed,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }
