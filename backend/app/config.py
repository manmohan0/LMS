"""Application configuration."""
import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    SQLALCHEMY_DATABASE_URI = (os.getenv("DATABASE_URL") or "sqlite:///lms.db").strip("'\" ")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SWAGGER = {
        "title": "LMS API",
        "uiversion": 3,
        "version": "1.0.0",
        "description": "Learning Management System REST API",
        "securityDefinitions": {
            "Bearer": {
                "type": "apiKey",
                "name": "Authorization",
                "in": "header",
                "description": 'JWT Authorization. Format: "Bearer {token}"',
            }
        },
    }
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "..", "uploads")
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config_map = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
