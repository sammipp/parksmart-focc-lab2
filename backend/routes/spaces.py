import logging

from flask import Blueprint, jsonify, request
from services import parking_service

logger = logging.getLogger(__name__)

spaces_bp = Blueprint("spaces", __name__)


@spaces_bp.route("/", methods=["GET"])
def list_spaces():
    try:
        status = request.args.get("status")
        zone = request.args.get("zone")
        vehicle_type = request.args.get("vehicle_type")
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 50))
        result = parking_service.get_all_spaces(
            status=status, zone=zone, vehicle_type=vehicle_type, page=page, per_page=per_page
        )
        return jsonify({"data": result, "message": "Spaces retrieved successfully"}), 200
    except Exception as e:
        logger.exception("Error listing spaces")
        return jsonify({"error": "Failed to retrieve spaces", "details": str(e)}), 500


@spaces_bp.route("/<space_id>", methods=["GET"])
def get_space(space_id):
    try:
        space = parking_service.get_space_by_id(space_id)
        if not space:
            return jsonify({"error": "Space not found", "details": f"No space with id '{space_id}'"}), 404
        return jsonify({"data": space.to_dict(), "message": "Space retrieved successfully"}), 200
    except Exception as e:
        logger.exception("Error getting space %s", space_id)
        return jsonify({"error": "Failed to retrieve space", "details": str(e)}), 500


@spaces_bp.route("/", methods=["POST"])
def create_space():
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"error": "Invalid request", "details": "JSON body required"}), 400
        space = parking_service.create_space(data)
        return jsonify({"data": space.to_dict(), "message": "Space created successfully"}), 201
    except ValueError as e:
        return jsonify({"error": "Validation error", "details": str(e)}), 422
    except Exception as e:
        logger.exception("Error creating space")
        return jsonify({"error": "Failed to create space", "details": str(e)}), 500


@spaces_bp.route("/<space_id>", methods=["PUT"])
def update_space(space_id):
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"error": "Invalid request", "details": "JSON body required"}), 400
        space = parking_service.update_space(space_id, data)
        if not space:
            return jsonify({"error": "Space not found", "details": f"No space with id '{space_id}'"}), 404
        return jsonify({"data": space.to_dict(), "message": "Space updated successfully"}), 200
    except ValueError as e:
        return jsonify({"error": "Validation error", "details": str(e)}), 422
    except Exception as e:
        logger.exception("Error updating space %s", space_id)
        return jsonify({"error": "Failed to update space", "details": str(e)}), 500


@spaces_bp.route("/<space_id>/status", methods=["PATCH"])
def update_space_status(space_id):
    try:
        data = request.get_json(force=True)
        if not data or "status" not in data:
            return jsonify({"error": "Validation error", "details": "'status' field required"}), 422
        space, error = parking_service.update_space_status(space_id, data["status"])
        if error:
            if "not found" in error.lower():
                return jsonify({"error": "Space not found", "details": error}), 404
            return jsonify({"error": "Status update failed", "details": error}), 422
        return jsonify({"data": space.to_dict(), "message": "Status updated successfully"}), 200
    except Exception as e:
        logger.exception("Error updating status for space %s", space_id)
        return jsonify({"error": "Failed to update status", "details": str(e)}), 500
