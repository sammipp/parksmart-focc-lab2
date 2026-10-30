import logging

from flask import Blueprint, jsonify, request
from services import reservation_service

logger = logging.getLogger(__name__)

reservations_bp = Blueprint("reservations", __name__)


@reservations_bp.route("/", methods=["GET"])
def list_reservations():
    try:
        status = request.args.get("status")
        date_filter = request.args.get("date")
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 50))
        result = reservation_service.get_all_reservations(
            status=status, date_filter=date_filter, page=page, per_page=per_page
        )
        return jsonify({"data": result, "message": "Reservations retrieved successfully"}), 200
    except Exception as e:
        logger.exception("Error listing reservations")
        return jsonify({"error": "Failed to retrieve reservations", "details": str(e)}), 500


@reservations_bp.route("/<reservation_id>", methods=["GET"])
def get_reservation(reservation_id):
    try:
        reservation = reservation_service.get_reservation_by_id(reservation_id)
        if not reservation:
            return jsonify({"error": "Reservation not found", "details": f"No reservation with id '{reservation_id}'"}), 404
        return jsonify({"data": reservation.to_dict(), "message": "Reservation retrieved successfully"}), 200
    except Exception as e:
        logger.exception("Error getting reservation %s", reservation_id)
        return jsonify({"error": "Failed to retrieve reservation", "details": str(e)}), 500


@reservations_bp.route("/", methods=["POST"])
def create_reservation():
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"error": "Invalid request", "details": "JSON body required"}), 400
        reservation, error = reservation_service.create_reservation(data)
        if error:
            if "not found" in error.lower():
                return jsonify({"error": "Not found", "details": error}), 404
            if "overlapping" in error.lower() or "conflict" in error.lower():
                return jsonify({"error": "Conflict", "details": error}), 409
            return jsonify({"error": "Validation error", "details": error}), 422
        return jsonify({"data": reservation.to_dict(), "message": "Reservation created successfully"}), 201
    except Exception as e:
        logger.exception("Error creating reservation")
        return jsonify({"error": "Failed to create reservation", "details": str(e)}), 500


@reservations_bp.route("/<reservation_id>/cancel", methods=["PATCH"])
def cancel_reservation(reservation_id):
    try:
        reservation, error = reservation_service.cancel_reservation(reservation_id)
        if error:
            if "not found" in error.lower():
                return jsonify({"error": "Reservation not found", "details": error}), 404
            return jsonify({"error": "Cannot cancel reservation", "details": error}), 422
        return jsonify({"data": reservation.to_dict(), "message": "Reservation cancelled successfully"}), 200
    except Exception as e:
        logger.exception("Error cancelling reservation %s", reservation_id)
        return jsonify({"error": "Failed to cancel reservation", "details": str(e)}), 500
