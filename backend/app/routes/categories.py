"""Categories CRUD routes."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models.course import Category
from ..utils.decorators import admin_required
from ..utils.helpers import paginate, apply_search, apply_sort

categories_bp = Blueprint("categories", __name__)


@categories_bp.route("/", methods=["GET"])
def list_categories():
    """List all categories.
    ---
    tags: [Categories]
    responses:
      200: {description: Category list}
    """
    query = Category.query
    query = apply_search(query, Category, ["name", "description"])
    query = apply_sort(query, Category, ["name", "created_at"])
    result = paginate(query)
    return jsonify({
        "categories": [c.to_dict() for c in result["items"]],
        "meta": result["meta"],
    })


@categories_bp.route("/<int:cat_id>", methods=["GET"])
def get_category(cat_id: int):
    """Get a category.
    ---
    tags: [Categories]
    responses:
      200: {description: Category}
    """
    cat = Category.query.get_or_404(cat_id)
    return jsonify({"category": cat.to_dict()})


@categories_bp.route("/", methods=["POST"])
@jwt_required()
@admin_required
def create_category():
    """Create a new category.
    ---
    tags: [Categories]
    security: [{Bearer: []}]
    responses:
      201: {description: Created}
    """
    data = request.get_json() or {}
    if not data.get("name"):
        return jsonify({"error": "Name is required"}), 400

    if Category.query.filter_by(name=data["name"].strip()).first():
        return jsonify({"error": "Category already exists"}), 409

    cat = Category(
        name=data["name"].strip(),
        description=data.get("description"),
        icon=data.get("icon", "📚"),
    )
    db.session.add(cat)
    db.session.commit()
    return jsonify({"message": "Category created", "category": cat.to_dict()}), 201


@categories_bp.route("/<int:cat_id>", methods=["PUT", "PATCH"])
@jwt_required()
@admin_required
def update_category(cat_id: int):
    """Update a category.
    ---
    tags: [Categories]
    security: [{Bearer: []}]
    responses:
      200: {description: Updated}
    """
    cat = Category.query.get_or_404(cat_id)
    data = request.get_json() or {}
    for field in ("name", "description", "icon"):
        if field in data:
            setattr(cat, field, data[field])
    db.session.commit()
    return jsonify({"message": "Category updated", "category": cat.to_dict()})


@categories_bp.route("/<int:cat_id>", methods=["DELETE"])
@jwt_required()
@admin_required
def delete_category(cat_id: int):
    """Delete a category.
    ---
    tags: [Categories]
    security: [{Bearer: []}]
    responses:
      200: {description: Deleted}
    """
    cat = Category.query.get_or_404(cat_id)
    db.session.delete(cat)
    db.session.commit()
    return jsonify({"message": "Category deleted"})
