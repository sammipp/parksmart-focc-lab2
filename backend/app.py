import logging
import os
import time

from flask import Flask, jsonify, g, request
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

# Module-level metrics store
metrics_store = {
    "request_count": 0,
    "error_count": 0,
    "latencies": [],  # last 1000 latency values in ms
}


def create_app(config=None):
    app = Flask(__name__)

    # ── Configuration ──────────────────────────────────────────────────────
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "parksmart-dev-secret-key-change-in-prod")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///./parksmart.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["FLASK_ENV"] = os.getenv("FLASK_ENV", "production")
    cors_origins = os.getenv("CORS_ORIGINS", "*")

    if config:
        app.config.update(config)

    # ── Extensions ─────────────────────────────────────────────────────────
    from models.db import db
    db.init_app(app)

    CORS(app, origins=cors_origins)

    # ── Redis (optional, graceful fallback) ────────────────────────────────
    redis_url = os.getenv("REDIS_URL", "")
    if redis_url:
        try:
            import redis as redis_lib
            redis_client = redis_lib.from_url(redis_url, decode_responses=True, socket_connect_timeout=2)
            redis_client.ping()
            app.extensions["redis_client"] = redis_client
            logger.info("Redis connected at %s", redis_url)
        except Exception as e:
            logger.warning("Redis unavailable (%s); continuing without Redis.", e)
            app.extensions["redis_client"] = None
    else:
        app.extensions["redis_client"] = None

    # ── Blueprints ─────────────────────────────────────────────────────────
    from routes.health import health_bp
    from routes.spaces import spaces_bp
    from routes.reservations import reservations_bp
    from routes.vehicles import vehicles_bp
    from routes.analytics import analytics_bp
    from routes.system import system_bp

    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(spaces_bp, url_prefix="/api/spaces")
    app.register_blueprint(reservations_bp, url_prefix="/api/reservations")
    app.register_blueprint(vehicles_bp, url_prefix="/api/vehicles")
    app.register_blueprint(analytics_bp, url_prefix="/api/analytics")
    app.register_blueprint(system_bp, url_prefix="/api/system")

    # ── Request Timing Middleware ──────────────────────────────────────────
    @app.before_request
    def before_request():
        g.start_time = time.time()
        metrics_store["request_count"] += 1

    @app.after_request
    def after_request(response):
        if hasattr(g, "start_time"):
            elapsed_ms = round((time.time() - g.start_time) * 1000, 2)
            response.headers["X-Response-Time"] = f"{elapsed_ms}ms"
            latencies = metrics_store["latencies"]
            latencies.append(elapsed_ms)
            if len(latencies) > 1000:
                metrics_store["latencies"] = latencies[-1000:]
        if response.status_code >= 400:
            metrics_store["error_count"] += 1
        return response

    # ── Global Error Handlers ──────────────────────────────────────────────
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": "Bad Request", "details": str(e)}), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not Found", "details": str(e)}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method Not Allowed", "details": str(e)}), 405

    @app.errorhandler(422)
    def unprocessable(e):
        return jsonify({"error": "Unprocessable Entity", "details": str(e)}), 422

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500

    # ── DB Init & Seed ─────────────────────────────────────────────────────
    with app.app_context():
        db.create_all()
        try:
            from seed import seed_database
            seed_database(app, db)
        except Exception as e:
            logger.warning("Seeding skipped or failed: %s", e)

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=(os.getenv("FLASK_ENV") == "development"))
