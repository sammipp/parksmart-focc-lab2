import logging

from flask import Blueprint, jsonify, request
from services import analytics_service

logger = logging.getLogger(__name__)

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/overview", methods=["GET"])
def overview():
    try:
        data = analytics_service.get_overview()
        return jsonify({"data": data, "message": "Overview retrieved successfully"}), 200
    except Exception as e:
        logger.exception("Error fetching analytics overview")
        return jsonify({"error": "Failed to retrieve overview", "details": str(e)}), 500


@analytics_bp.route("/occupancy", methods=["GET"])
def occupancy():
    try:
        days = int(request.args.get("days", 7))
        data = analytics_service.get_occupancy_trend(days=days)
        return jsonify({"data": data, "message": "Occupancy trend retrieved successfully"}), 200
    except Exception as e:
        logger.exception("Error fetching occupancy trend")
        return jsonify({"error": "Failed to retrieve occupancy trend", "details": str(e)}), 500


@analytics_bp.route("/revenue", methods=["GET"])
def revenue():
    try:
        days = int(request.args.get("days", 7))
        data = analytics_service.get_revenue_trend(days=days)
        return jsonify({"data": data, "message": "Revenue trend retrieved successfully"}), 200
    except Exception as e:
        logger.exception("Error fetching revenue trend")
        return jsonify({"error": "Failed to retrieve revenue trend", "details": str(e)}), 500
