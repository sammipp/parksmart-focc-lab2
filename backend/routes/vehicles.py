import logging

from flask import Blueprint, jsonify, request
from services import vehicle_service

logger = logging.getLogger(__name__)

vehicles_bp = Blueprint("vehicles", __name__)


@vehicles_bp.route("/active", methods=["GET"])
def active_vehicles():
    try:
        sessions = vehicle_service.get_active_vehicles()
        return jsonify({"data": sessions, "message": "Active vehicles retrieved successfully"}), 200
    except Exception as e:
        logger.exception("Error fetching active vehicles")
        return jsonify({"error": "Failed to retrieve active vehicles", "details": str(e)}), 500


@vehicles_bp.route("/history", methods=["GET"])
def vehicle_history():
    try:
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 50))
        result = vehicle_service.get_vehicle_history(page=page, per_page=per_page)
        return jsonify({"data": result, "message": "Vehicle history retrieved successfully"}), 200
    except Exception as e:
        logger.exception("Error fetching vehicle history")
        return jsonify({"error": "Failed to retrieve vehicle history", "details": str(e)}), 500


@vehicles_bp.route("/entry", methods=["POST"])
def record_entry():
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"error": "Invalid request", "details": "JSON body required"}), 400
        session, error = vehicle_service.record_entry(data)
        if error:
            if "not found" in error.lower():
                return jsonify({"error": "Not found", "details": error}), 404
            return jsonify({"error": "Validation error", "details": error}), 422
        return jsonify({"data": session.to_dict(), "message": "Vehicle entry recorded successfully"}), 201
    except Exception as e:
        logger.exception("Error recording vehicle entry")
        return jsonify({"error": "Failed to record entry", "details": str(e)}), 500


@vehicles_bp.route("/exit", methods=["POST"])
def record_exit():
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"error": "Invalid request", "details": "JSON body required"}), 400
        session, error = vehicle_service.record_exit(data)
        if error:
            if "no active session" in error.lower():
                return jsonify({"error": "Not found", "details": error}), 404
            return jsonify({"error": "Validation error", "details": error}), 422
        return jsonify({"data": session.to_dict(), "message": "Vehicle exit recorded successfully"}), 200
    except Exception as e:
        logger.exception("Error recording vehicle exit")
        return jsonify({"error": "Failed to record exit", "details": str(e)}), 500
