"""Flask application factory."""
import os
from flask import Flask, jsonify
from flasgger import Swagger
from .config import config_map
from .extensions import db, migrate, jwt, cors, bcrypt


def create_app(config_name: str | None = None) -> Flask:
    app = Flask(__name__)

    # Load config
    env = config_name or os.getenv("FLASK_ENV", "development")
    app.config.from_object(config_map.get(env, config_map["default"]))

    # Ensure upload folder exists
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})
    Swagger(app, template_file=None)

    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Token has expired"}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({"error": "Invalid token"}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({"error": "Authorization token required"}), 401

    # Register blueprints
    from .routes.auth import auth_bp
    from .routes.users import users_bp
    from .routes.categories import categories_bp
    from .routes.courses import courses_bp
    from .routes.enrollments import enrollments_bp
    from .routes.assignments import assignments_bp
    from .routes.quizzes import quizzes_bp
    from .routes.reports import reports_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(categories_bp, url_prefix="/api/categories")
    app.register_blueprint(courses_bp, url_prefix="/api/courses")
    app.register_blueprint(enrollments_bp, url_prefix="/api/enrollments")
    app.register_blueprint(assignments_bp, url_prefix="/api/assignments")
    app.register_blueprint(quizzes_bp, url_prefix="/api/quizzes")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")

    # Health check
    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok", "message": "LMS API is running"})

    # Import all models so Flask-Migrate detects them
    from .models import user, course, enrollment, assignment, quiz  # noqa: F401

    return app
