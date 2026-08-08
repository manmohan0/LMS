"""Users CRUD routes — admin manages all users."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models.user import User
from ..utils.decorators import admin_required
from ..utils.helpers import paginate, apply_search, apply_sort

users_bp = Blueprint("users", __name__)


@users_bp.route("/", methods=["GET"])
@jwt_required()
@admin_required
def list_users():
    """List all users with search, filter, sort, pagination.
    ---
    tags: [Users]
    security: [{Bearer: []}]
    parameters:
      - {name: role, in: query, type: string}
      - {name: search, in: query, type: string}
      - {name: sort_by, in: query, type: string}
      - {name: order, in: query, type: string, enum: [asc, desc]}
      - {name: page, in: query, type: integer}
      - {name: per_page, in: query, type: integer}
    responses:
      200: {description: Paginated user list}
    """
    query = User.query
    role_filter = request.args.get("role")
    if role_filter and role_filter in ("admin", "instructor", "student"):
        query = query.filter_by(role=role_filter)

    is_active = request.args.get("is_active")
    if is_active is not None:
        query = query.filter_by(is_active=is_active.lower() == "true")

    query = apply_search(query, User, ["full_name", "email"])
    query = apply_sort(query, User, ["full_name", "email", "created_at", "role"])

    result = paginate(query)
    return jsonify({
        "users": [u.to_dict() for u in result["items"]],
        "meta": result["meta"],
    })


@users_bp.route("/<int:user_id>", methods=["GET"])
@jwt_required()
@admin_required
def get_user(user_id: int):
    """Get a single user by ID.
    ---
    tags: [Users]
    security: [{Bearer: []}]
    responses:
      200: {description: User detail}
      404: {description: Not found}
    """
    user = User.query.get_or_404(user_id)
    return jsonify({"user": user.to_dict()})


@users_bp.route("/", methods=["POST"])
@jwt_required()
@admin_required
def create_user():
    """Admin creates a new user.
    ---
    tags: [Users]
    security: [{Bearer: []}]
    responses:
      201: {description: User created}
    """
    data = request.get_json() or {}
    required = ["full_name", "email", "password", "role"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    if User.query.filter_by(email=data["email"].lower()).first():
        return jsonify({"error": "Email already registered"}), 409

    user = User(
        full_name=data["full_name"].strip(),
        email=data["email"].lower().strip(),
        role=data.get("role", "student"),
        bio=data.get("bio"),
        phone=data.get("phone"),
    )
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "User created", "user": user.to_dict()}), 201


@users_bp.route("/<int:user_id>", methods=["PUT", "PATCH"])
@jwt_required()
@admin_required
def update_user(user_id: int):
    """Update a user.
    ---
    tags: [Users]
    security: [{Bearer: []}]
    responses:
      200: {description: Updated user}
    """
    user = User.query.get_or_404(user_id)
    data = request.get_json() or {}

    for field in ("full_name", "bio", "phone", "avatar", "role", "is_active"):
        if field in data:
            setattr(user, field, data[field])

    if data.get("password"):
        user.set_password(data["password"])

    if "email" in data:
        existing = User.query.filter_by(email=data["email"].lower()).first()
        if existing and existing.id != user_id:
            return jsonify({"error": "Email already in use"}), 409
        user.email = data["email"].lower()

    db.session.commit()
    return jsonify({"message": "User updated", "user": user.to_dict()})


@users_bp.route("/<int:user_id>", methods=["DELETE"])
@jwt_required()
@admin_required
def delete_user(user_id: int):
    """Delete a user.
    ---
    tags: [Users]
    security: [{Bearer: []}]
    responses:
      200: {description: Deleted}
    """
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "User deleted"})


@users_bp.route("/instructors", methods=["GET"])
@jwt_required()
def list_instructors():
    """List all instructors (accessible to authenticated users).
    ---
    tags: [Users]
    security: [{Bearer: []}]
    responses:
      200: {description: List of instructors}
    """
    instructors = User.query.filter_by(role="instructor", is_active=True).all()
    return jsonify({"instructors": [u.to_dict() for u in instructors]})
