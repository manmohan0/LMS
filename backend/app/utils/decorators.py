"""Utility decorators for role-based access control."""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from ..models.user import User


def role_required(*roles):
    """Decorator to restrict access based on user roles."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = int(get_jwt_identity())
            user = User.query.get(user_id)
            if not user or user.role not in roles:
                return jsonify({"error": "Access forbidden: insufficient permissions"}), 403
            if not user.is_active:
                return jsonify({"error": "Account is deactivated"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def admin_required(fn):
    return role_required("admin")(fn)


def instructor_required(fn):
    return role_required("admin", "instructor")(fn)


def student_required(fn):
    return role_required("admin", "instructor", "student")(fn)
