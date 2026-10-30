import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Ban,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/ui/ErrorState';
import { Modal } from '../../components/ui/Modal';
import {
  getSpaces,
  createSpace,
  updateSpace,
  updateSpaceStatus,
} from '../../api/spaces';
import { ParkingSpace, SpaceStatus, VehicleType } from '../../types';

export const AdminSpaces: React.FC = () => {
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState('all');

  // Edit / Add modal
  const [modalSpace, setModalSpace] = useState<Partial<ParkingSpace> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchSpaces = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getSpaces({ per_page: 100 });
      setSpaces(res.spaces);
    } catch (err: any) {
      setError(err.message || 'Failed to load spaces');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalSpace) return;
    try {
      setSubmitting(true);
      setFormError(null);
      if (isEditing && modalSpace.id) {
        await updateSpace(modalSpace.id, {
          floor: modalSpace.floor,
          vehicle_type: modalSpace.vehicle_type,
          hourly_rate: modalSpace.hourly_rate,
          status: modalSpace.status,
        });
      } else {
        await createSpace({
          slot_number: modalSpace.slot_number || '',
          zone_id: modalSpace.zone_id || 'zone-a',
          floor: modalSpace.floor || 'Ground',
          vehicle_type: modalSpace.vehicle_type || 'car',
          hourly_rate: modalSpace.hourly_rate || 50,
        });
      }
      setModalSpace(null);
      fetchSpaces();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save space');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (space: ParkingSpace) => {
    const nextStatus: SpaceStatus =
      space.status === 'out_of_service' ? 'available' : 'out_of_service';
    try {
      await updateSpaceStatus(space.id, nextStatus);
      fetchSpaces();
    } catch (err: any) {
      alert(`Could not toggle status: ${err.message}`);
    }
  };

  const filteredSpaces = spaces.filter((s) => {
    const matchesSearch =
      s.slot_number.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase());
    const matchesZone = zoneFilter === 'all' || s.zone_id === zoneFilter;
    return matchesSearch && matchesZone;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Parking Space Inventory Management</h2>
          <p className="text-xs text-slate-500">
            Configure slots, assign pricing rates, and toggle out-of-service maintenance modes
          </p>
        </div>
        <button
          onClick={() => {
            setIsEditing(false);
            setModalSpace({
              slot_number: '',
              zone_id: 'zone-a',
              floor: 'Ground',
              vehicle_type: 'car',
              hourly_rate: 50,
              status: 'available',
            });
            setFormError(null);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Slot</span>
        </button>
      </div>

      {/* Filter / Search */}
      <div className="card-container p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Slot ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-text pl-9"
          />
        </div>
        <select
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
          className="select-input sm:w-48 text-xs py-2"
        >
          <option value="all">All Zones</option>
          <option value="zone-a">Zone A (Ground)</option>
          <option value="zone-b">Zone B (Floor 1)</option>
          <option value="zone-c">Zone C (Floor 2)</option>
          <option value="zone-d">Zone D (Rooftop)</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner message="Loading slot inventory..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchSpaces} />
      ) : (
        <div className="card-container overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Slot #</th>
                  <th className="px-4 py-3 font-semibold">Zone</th>
                  <th className="px-4 py-3 font-semibold">Floor</th>
                  <th className="px-4 py-3 font-semibold">Vehicle Type</th>
                  <th className="px-4 py-3 font-semibold">Hourly Rate</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSpaces.map((space) => (
                  <tr key={space.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {space.slot_number}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {space.zone?.name || space.zone_id.toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{space.floor}</td>
                    <td className="px-4 py-3 capitalize text-slate-700">{space.vehicle_type}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      ${space.hourly_rate}/hr
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={space.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setModalSpace({ ...space });
                          setFormError(null);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleStatus(space)}
                        className={`text-xs font-medium ${
                          space.status === 'out_of_service'
                            ? 'text-emerald-600 hover:text-emerald-800'
                            : 'text-amber-600 hover:text-amber-800'
                        }`}
                      >
                        {space.status === 'out_of_service' ? 'Restore' : 'Disable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={!!modalSpace}
        onClose={() => setModalSpace(null)}
        title={isEditing ? `Edit Space ${modalSpace?.slot_number}` : 'Add New Space'}
      >
        {modalSpace && (
          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                {formError}
              </div>
            )}

            {!isEditing && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Slot Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A17"
                  value={modalSpace.slot_number || ''}
                  onChange={(e) =>
                    setModalSpace({ ...modalSpace, slot_number: e.target.value.toUpperCase() })
                  }
                  className="input-text uppercase font-mono"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Zone
                </label>
                <select
                  value={modalSpace.zone_id || 'zone-a'}
                  onChange={(e) => setModalSpace({ ...modalSpace, zone_id: e.target.value })}
                  className="select-input"
                  disabled={isEditing}
                >
                  <option value="zone-a">Zone A (Ground)</option>
                  <option value="zone-b">Zone B (Floor 1)</option>
                  <option value="zone-c">Zone C (Floor 2)</option>
                  <option value="zone-d">Zone D (Rooftop)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Floor
                </label>
                <input
                  type="text"
                  required
                  value={modalSpace.floor || ''}
                  onChange={(e) => setModalSpace({ ...modalSpace, floor: e.target.value })}
                  className="input-text"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vehicle Type
                </label>
                <select
                  value={modalSpace.vehicle_type || 'car'}
                  onChange={(e) =>
                    setModalSpace({
                      ...modalSpace,
                      vehicle_type: e.target.value as VehicleType,
                    })
                  }
                  className="select-input"
                >
                  <option value="car">Car</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="truck">Truck</option>
                  <option value="disabled">Accessible</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hourly Rate ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={modalSpace.hourly_rate ?? 50}
                  onChange={(e) =>
                    setModalSpace({
                      ...modalSpace,
                      hourly_rate: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="input-text"
                />
              </div>
            </div>

            {isEditing && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Operational Status
                </label>
                <select
                  value={modalSpace.status || 'available'}
                  onChange={(e) =>
                    setModalSpace({
                      ...modalSpace,
                      status: e.target.value as SpaceStatus,
                    })
                  }
                  className="select-input"
                >
                  <option value="available">Available</option>
                  <option value="reserved">Reserved</option>
                  <option value="occupied">Occupied</option>
                  <option value="out_of_service">Out of Service</option>
                </select>
              </div>
            )}

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalSpace(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Saving...' : 'Save Space'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

