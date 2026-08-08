"""User model."""
from datetime import datetime, timezone
from ..extensions import db, bcrypt


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.Enum("admin", "instructor", "student", name="user_role"), default="student", nullable=False)
    bio = db.Column(db.Text, nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    avatar = db.Column(db.String(255), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    reset_token = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    courses_taught = db.relationship("Course", back_populates="instructor", lazy="dynamic", foreign_keys="Course.instructor_id")
    enrollments = db.relationship("Enrollment", back_populates="student", lazy="dynamic", foreign_keys="Enrollment.student_id")
    submissions = db.relationship("Submission", back_populates="student", lazy="dynamic", foreign_keys="Submission.student_id")
    quiz_attempts = db.relationship("QuizAttempt", back_populates="student", lazy="dynamic", foreign_keys="QuizAttempt.student_id")

    def set_password(self, password: str) -> None:
        self.password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

    def check_password(self, password: str) -> bool:
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self, include_sensitive: bool = False) -> dict:
        data = {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "role": self.role,
            "bio": self.bio,
            "phone": self.phone,
            "avatar": self.avatar,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        return data

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role})>"
