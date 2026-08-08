"""Course and Category models."""
from datetime import datetime, timezone
from ..extensions import db


class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    icon = db.Column(db.String(50), nullable=True, default="📚")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    courses = db.relationship("Course", back_populates="category", lazy="dynamic")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "icon": self.icon,
            "course_count": self.courses.count(),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Course(db.Model):
    __tablename__ = "courses"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    thumbnail = db.Column(db.String(255), nullable=True)
    level = db.Column(db.Enum("beginner", "intermediate", "advanced", name="course_level"), default="beginner")
    duration = db.Column(db.String(50), nullable=True)   # e.g. "10 hours"
    price = db.Column(db.Float, default=0.0)
    is_published = db.Column(db.Boolean, default=False)
    instructor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    instructor = db.relationship("User", back_populates="courses_taught")
    category = db.relationship("Category", back_populates="courses")
    lessons = db.relationship("Lesson", back_populates="course", cascade="all, delete-orphan", order_by="Lesson.order")
    enrollments = db.relationship("Enrollment", back_populates="course", lazy="dynamic")
    assignments = db.relationship("Assignment", back_populates="course", lazy="dynamic")
    quizzes = db.relationship("Quiz", back_populates="course", lazy="dynamic")

    def to_dict(self, include_lessons: bool = False) -> dict:
        data = {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "thumbnail": self.thumbnail,
            "level": self.level,
            "duration": self.duration,
            "price": self.price,
            "is_published": self.is_published,
            "instructor_id": self.instructor_id,
            "instructor_name": self.instructor.full_name if self.instructor else None,
            "category_id": self.category_id,
            "category_name": self.category.name if self.category else None,
            "lesson_count": len(self.lessons),
            "enrollment_count": self.enrollments.count(),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_lessons:
            data["lessons"] = [l.to_dict() for l in self.lessons]
        return data


class Lesson(db.Model):
    __tablename__ = "lessons"

    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=True)
    video_url = db.Column(db.String(255), nullable=True)
    order = db.Column(db.Integer, default=0)
    duration_minutes = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    course = db.relationship("Course", back_populates="lessons")
    progress_records = db.relationship("LessonProgress", back_populates="lesson", lazy="dynamic")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "course_id": self.course_id,
            "title": self.title,
            "content": self.content,
            "video_url": self.video_url,
            "order": self.order,
            "duration_minutes": self.duration_minutes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
