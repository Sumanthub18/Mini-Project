"""
Flask application factory for TrustLens AI (Scam or Safe) backend.
Provides Day 1-6 APIs: Scam Message Detection, AI Comparison, Fake News Verification,
URL Safety Intelligence, Multimodal AI Analysis (Text, Images, Audio, Video),
and TrustLens AI Cyber Safety Chatbot Assistant.
"""
import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables from backend/.env or .env
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    load_dotenv()


def create_app() -> Flask:
    app = Flask(__name__)

    # Enable Cross-Origin Resource Sharing
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Register Route Blueprints
    from .routes.scam_routes import scam_bp
    from .routes.comparison_routes import comparison_bp
    from .routes.news_routes import news_bp
    from .routes.url_routes import url_bp
    from .routes.multimodal_routes import multimodal_bp
    from .routes.chat_routes import chat_bp

    app.register_blueprint(scam_bp, url_prefix="/api")
    app.register_blueprint(comparison_bp, url_prefix="/api")
    app.register_blueprint(news_bp, url_prefix="/api")
    app.register_blueprint(url_bp, url_prefix="/api")
    app.register_blueprint(multimodal_bp, url_prefix="/api")
    app.register_blueprint(chat_bp, url_prefix="/api")

    # Global Error Handlers
    @app.errorhandler(404)
    def handle_not_found(e):
        return jsonify({
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": "The requested endpoint does not exist."
            }
        }), 404

    @app.errorhandler(500)
    def handle_internal_error(e):
        return jsonify({
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred."
            }
        }), 500

    return app
