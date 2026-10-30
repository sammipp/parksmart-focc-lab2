import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Car,
  Bike,
  Truck,
  Accessibility,
  Edit2,
  AlertCircle,
  X,
  Layers,
} from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import {
  getSpaces,
  createSpace,
  updateSpace,
  updateSpaceStatus,
} from '../api/spaces';
import { ParkingSpace, SpaceStatus, VehicleType } from '../types';

export const ParkingSpaces: React.FC = () => {
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [vTypeFilter, setVTypeFilter] = useState<string>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<ParkingSpace | null>(null);
  const [statusModalSpace, setStatusModalSpace] = useState<ParkingSpace | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    slot_number: '',
    zone_id: 'zone-a',
    floor: 'Ground',
    vehicle_type: 'car' as VehicleType,
    hourly_rate: 50,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchSpacesList = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getSpaces({ per_page: 100 });
      setSpaces(res.spaces);
    } catch (err: any) {
      setError(err.message || 'Failed to load parking spaces');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpacesList();
  }, []);

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setFormError(null);
      await createSpace(formData);
      setIsAddModalOpen(false);
      setFormData({
        slot_number: '',
        zone_id: 'zone-a',
        floor: 'Ground',
        vehicle_type: 'car',
        hourly_rate: 50,
      });
      fetchSpacesList();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create space');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSpace) return;
    try {
      setSubmitting(true);
      setFormError(null);
      await updateSpace(editingSpace.id, {
        zone_id: editingSpace.zone_id,
        floor: editingSpace.floor,
        vehicle_type: editingSpace.vehicle_type,
        hourly_rate: editingSpace.hourly_rate,
        status: editingSpace.status,
      });
      setEditingSpace(null);
      fetchSpacesList();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update space');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (newStatus: SpaceStatus) => {
    if (!statusModalSpace) return;
    try {
      setSubmitting(true);
      await updateSpaceStatus(statusModalSpace.id, newStatus);
      setStatusModalSpace(null);
      fetchSpacesList();
    } catch (err: any) {
      alert(`Could not update status: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter calculation
  const filteredSpaces = spaces.filter((space) => {
    const matchesSearch = space.slot_number.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || space.status === statusFilter;
    const matchesZone = zoneFilter === 'all' || space.zone_id === zoneFilter;
    const matchesType = vTypeFilter === 'all' || space.vehicle_type === vTypeFilter;
    return matchesSearch && matchesStatus && matchesZone && matchesType;
  });

  const getVehicleIcon = (type: VehicleType) => {
    switch (type) {
      case 'motorcycle':
        return <Bike className="w-4 h-4" />;
      case 'truck':
        return <Truck className="w-4 h-4" />;
      case 'disabled':
        return <Accessibility className="w-4 h-4" />;
      default:
        return <Car className="w-4 h-4" />;
    }
  };

  const getSlotCardBorder = (status: SpaceStatus) => {
    switch (status) {
      case 'available':
        return 'border-emerald-300 bg-emerald-50/20 hover:border-emerald-500';
      case 'reserved':
        return 'border-amber-300 bg-amber-50/20 hover:border-amber-500';
      case 'occupied':
        return 'border-rose-300 bg-rose-50/20 hover:border-rose-500';
      default:
        return 'border-slate-300 bg-slate-50/50 hover:border-slate-400';
    }
  };

  if (loading) return <LoadingSpinner message="Loading parking slots layout..." />;
  if (error) return <ErrorState message={error} onRetry={fetchSpacesList} />;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Interactive Parking Grid</h2>
          <p className="text-xs text-slate-500">
            Real-time visual slot occupancy matrix across all designated levels
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Space</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-container p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Slot ID (e.g. A01, B04)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-text pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium">Filter:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select-input text-xs w-auto py-1.5"
          >
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="occupied">Occupied</option>
            <option value="out_of_service">Out of Service</option>
          </select>

          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="select-input text-xs w-auto py-1.5"
          >
            <option value="all">All Zones</option>
            <option value="zone-a">Zone A (Ground)</option>
            <option value="zone-b">Zone B (Floor 1)</option>
            <option value="zone-c">Zone C (Floor 2)</option>
            <option value="zone-d">Zone D (Rooftop)</option>
          </select>

          <select
            value={vTypeFilter}
            onChange={(e) => setVTypeFilter(e.target.value)}
            className="select-input text-xs w-auto py-1.5"
          >
            <option value="all">All Vehicle Types</option>
            <option value="car">Car</option>
            <option value="motorcycle">Motorcycle</option>
            <option value="truck">Truck</option>
            <option value="disabled">Accessible</option>
          </select>
        </div>
      </div>

      {/* Grid of Slots */}
      {filteredSpaces.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No Parking Spaces Found"
          description="Try adjusting your search criteria or filter selections to view matching parking slots."
          action={{
            label: 'Clear Filters',
            onClick: () => {
              setSearch('');
              setStatusFilter('all');
              setZoneFilter('all');
              setVTypeFilter('all');
            },
          }}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
          {filteredSpaces.map((space) => {
            return (
              <div
                key={space.id}
                className={`card-container p-3.5 flex flex-col justify-between border-2 transition-all ${getSlotCardBorder(
                  space.status
                )}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-extrabold text-slate-900 tracking-tight font-mono">
                      {space.slot_number}
                    </span>
                    <span className="p-1 rounded bg-slate-100 text-slate-700">
                      {getVehicleIcon(space.vehicle_type)}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 space-y-0.5 mb-3">
                    <p className="font-medium text-slate-700">
                      {space.zone?.name || space.zone_id.toUpperCase()}
                    </p>
                    <p>Floor: {space.floor}</p>
                    <p className="font-semibold text-slate-900">${space.hourly_rate}/hr</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-200/60">
                  <StatusBadge status={space.status} size="sm" />

                  {space.current_reservation && (
                    <div className="text-[10px] bg-amber-100/70 text-amber-900 p-1.5 rounded font-mono truncate">
                      Res: {space.current_reservation.vehicle_reg}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      onClick={() => setStatusModalSpace(space)}
                      className="flex-1 text-[11px] font-medium py-1 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                    >
                      Status
                    </button>
                    <button
                      onClick={() => setEditingSpace(space)}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                      title="Edit Space"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Space Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Parking Space"
      >
        <form onSubmit={handleCreateSpace} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Slot Number / Identifier *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. A16, B15, D07"
              value={formData.slot_number}
              onChange={(e) => setFormData({ ...formData, slot_number: e.target.value })}
              className="input-text"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Zone *
              </label>
              <select
                value={formData.zone_id}
                onChange={(e) => setFormData({ ...formData, zone_id: e.target.value })}
                className="select-input"
              >
                <option value="zone-a">Zone A (Ground)</option>
                <option value="zone-b">Zone B (Floor 1)</option>
                <option value="zone-c">Zone C (Floor 2)</option>
                <option value="zone-d">Zone D (Rooftop)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Floor *
              </label>
              <input
                type="text"
                required
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
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
                value={formData.vehicle_type}
                onChange={(e) =>
                  setFormData({ ...formData, vehicle_type: e.target.value as VehicleType })
                }
                className="select-input"
              >
                <option value="car">Car</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="truck">Truck</option>
                <option value="disabled">Accessible / Disabled</option>
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
                value={formData.hourly_rate}
                onChange={(e) =>
                  setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })
                }
                className="input-text"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Creating...' : 'Create Space'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Space Modal */}
      <Modal
        isOpen={!!editingSpace}
        onClose={() => setEditingSpace(null)}
        title={`Edit Parking Space ${editingSpace?.slot_number}`}
      >
        {editingSpace && (
          <form onSubmit={handleUpdateSpace} className="space-y-4">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Floor
                </label>
                <input
                  type="text"
                  value={editingSpace.floor}
                  onChange={(e) =>
                    setEditingSpace({ ...editingSpace, floor: e.target.value })
                  }
                  className="input-text"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hourly Rate ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editingSpace.hourly_rate}
                  onChange={(e) =>
                    setEditingSpace({
                      ...editingSpace,
                      hourly_rate: parseFloat(e.target.value) || 0,
                    })
                  }
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
                  value={editingSpace.vehicle_type}
                  onChange={(e) =>
                    setEditingSpace({
                      ...editingSpace,
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
                  Status
                </label>
                <select
                  value={editingSpace.status}
                  onChange={(e) =>
                    setEditingSpace({
                      ...editingSpace,
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
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingSpace(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Quick Status Change Modal */}
      <Modal
        isOpen={!!statusModalSpace}
        onClose={() => setStatusModalSpace(null)}
        title={`Change Status: Slot ${statusModalSpace?.slot_number}`}
      >
        {statusModalSpace && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Select a new operational state for slot{' '}
              <strong className="text-slate-800">{statusModalSpace.slot_number}</strong>.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleQuickStatusChange('available')}
                disabled={submitting}
                className="p-3 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 flex items-center justify-center gap-2"
              >
                Available
              </button>
              <button
                onClick={() => handleQuickStatusChange('reserved')}
                disabled={submitting}
                className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold hover:bg-amber-100 flex items-center justify-center gap-2"
              >
                Reserved
              </button>
              <button
                onClick={() => handleQuickStatusChange('occupied')}
                disabled={submitting}
                className="p-3 rounded-lg border border-rose-300 bg-rose-50 text-rose-800 text-xs font-semibold hover:bg-rose-100 flex items-center justify-center gap-2"
              >
                Occupied
              </button>
              <button
                onClick={() => handleQuickStatusChange('out_of_service')}
                disabled={submitting}
                className="p-3 rounded-lg border border-slate-300 bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 flex items-center justify-center gap-2"
              >
                Out of Service
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
