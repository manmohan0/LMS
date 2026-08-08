"""Shared helper utilities."""
from flask import request
from typing import Any


def paginate(query, default_per_page: int = 10) -> dict:
    """Apply pagination to a SQLAlchemy query and return a metadata dict."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", default_per_page, type=int)
    per_page = min(per_page, 100)   # cap at 100

    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    return {
        "items": paginated.items,
        "meta": {
            "page": paginated.page,
            "per_page": paginated.per_page,
            "total": paginated.total,
            "pages": paginated.pages,
            "has_next": paginated.has_next,
            "has_prev": paginated.has_prev,
        },
    }


def apply_search(query, model, search_fields: list[str]) -> Any:
    """Apply search filter across multiple text fields."""
    search = request.args.get("search", "").strip()
    if not search:
        return query
    from sqlalchemy import or_
    conditions = [getattr(model, field).ilike(f"%{search}%") for field in search_fields if hasattr(model, field)]
    if conditions:
        query = query.filter(or_(*conditions))
    return query


def apply_sort(query, model, allowed_fields: list[str], default: str = "created_at") -> Any:
    """Apply ordering from query parameters."""
    sort_by = request.args.get("sort_by", default)
    order = request.args.get("order", "desc").lower()

    if sort_by not in allowed_fields:
        sort_by = default

    col = getattr(model, sort_by, None)
    if col is not None:
        query = query.order_by(col.desc() if order == "desc" else col.asc())
    return query


def success_response(data: Any, message: str = "Success", status: int = 200) -> tuple:
    return {"message": message, "data": data}, status


def error_response(message: str, status: int = 400) -> tuple:
    return {"error": message}, status
