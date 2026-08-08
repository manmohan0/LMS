"""Authentication routes — register, login, refresh, forgot-password, me."""
import secrets
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity
)
from ..extensions import db
from ..models.user import User

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new user.
    ---
    tags: [Auth]
    parameters:
      - in: body
        schema:
          required: [full_name, email, password, role]
          properties:
            full_name: {type: string}
            email: {type: string}
            password: {type: string}
            role: {type: string, enum: [admin, instructor, student]}
    responses:
      201: {description: User registered}
      400: {description: Validation error}
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No input data"}), 400

    required = ["full_name", "email", "password"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    if User.query.filter_by(email=data["email"].lower()).first():
        return jsonify({"error": "Email already registered"}), 409

    role = data.get("role", "student")
    if role not in ("admin", "instructor", "student"):
        role = "student"

    user = User(
        full_name=data["full_name"].strip(),
        email=data["email"].lower().strip(),
        role=role,
        bio=data.get("bio"),
        phone=data.get("phone"),
    )
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))
    return jsonify({
        "message": "Registration successful",
        "user": user.to_dict(),
        "access_token": access_token,
        "refresh_token": refresh_token,
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    """Login and receive JWT tokens.
    ---
    tags: [Auth]
    parameters:
      - in: body
        schema:
          required: [email, password]
          properties:
            email: {type: string}
            password: {type: string}
    responses:
      200: {description: Login successful}
      401: {description: Invalid credentials}
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No input data"}), 400

    user = User.query.filter_by(email=data.get("email", "").lower()).first()
    if not user or not user.check_password(data.get("password", "")):
        return jsonify({"error": "Invalid email or password"}), 401

    if not user.is_active:
        return jsonify({"error": "Account is deactivated"}), 403

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))
    return jsonify({
        "message": "Login successful",
        "user": user.to_dict(),
        "access_token": access_token,
        "refresh_token": refresh_token,
    })


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token.
    ---
    tags: [Auth]
    security: [{Bearer: []}]
    responses:
      200: {description: New access token}
    """
    user_id = get_jwt_identity()
    access_token = create_access_token(identity=str(user_id))
    return jsonify({"access_token": access_token})


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    """Get current authenticated user.
    ---
    tags: [Auth]
    security: [{Bearer: []}]
    responses:
      200: {description: Current user info}
    """
    user_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    return jsonify({"user": user.to_dict()})


@auth_bp.route("/me", methods=["PATCH"])
@jwt_required()
def update_me():
    """Update current user profile.
    ---
    tags: [Auth]
    security: [{Bearer: []}]
    responses:
      200: {description: Updated user}
    """
    user_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    data = request.get_json() or {}

    for field in ("full_name", "bio", "phone", "avatar"):
        if field in data:
            setattr(user, field, data[field])

    if "password" in data and data["password"]:
        user.set_password(data["password"])

    db.session.commit()
    return jsonify({"message": "Profile updated", "user": user.to_dict()})


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    """Request password reset token.
    ---
    tags: [Auth]
    parameters:
      - in: body
        schema:
          required: [email]
          properties:
            email: {type: string}
    responses:
      200: {description: Reset token sent (returned in response for demo)}
    """
    data = request.get_json() or {}
    user = User.query.filter_by(email=data.get("email", "").lower()).first()
    if not user:
        # Return generic response to avoid email enumeration
        return jsonify({"message": "If that email exists, a reset link has been sent."})

    token = secrets.token_urlsafe(32)
    user.reset_token = token
    db.session.commit()

    # In production, send via email. For demo, return token directly.
    return jsonify({
        "message": "Password reset token generated (check email in production).",
        "reset_token": token,  # Remove in production
    })


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    """Reset password using reset token.
    ---
    tags: [Auth]
    parameters:
      - in: body
        schema:
          required: [token, password]
          properties:
            token: {type: string}
            password: {type: string}
    responses:
      200: {description: Password reset successful}
      400: {description: Invalid or expired token}
    """
    data = request.get_json() or {}
    token = data.get("token")
    password = data.get("password")

    if not token or not password:
        return jsonify({"error": "Token and new password are required"}), 400

    user = User.query.filter_by(reset_token=token).first()
    if not user:
        return jsonify({"error": "Invalid or expired token"}), 400

    user.set_password(password)
    user.reset_token = None
    db.session.commit()
    return jsonify({"message": "Password reset successfully"})
