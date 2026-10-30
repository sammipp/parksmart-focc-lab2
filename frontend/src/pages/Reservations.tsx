import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  DollarSign,
  Car,
} from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { DemoDisclaimer } from '../components/ui/DemoDisclaimer';
import {
  getReservations,
  createReservation,
  cancelReservation,
} from '../api/reservations';
import { getSpaces } from '../api/spaces';
import { Reservation, ParkingSpace, ReservationStatus } from '../types';

export const Reservations: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [availableSpaces, setAvailableSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('');

  // Booking Wizard Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3>(1);
  const [bookingData, setBookingData] = useState({
    space_id: '',
    vehicle_reg: '',
    start_time: '',
    end_time: '',
  });
  const [selectedSpace, setSelectedSpace] = useState<ParkingSpace | null>(null);
  const [estimatedFee, setEstimatedFee] = useState(0);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Details Modal
  const [detailsReservation, setDetailsReservation] = useState<Reservation | null>(null);

  const fetchReservationsList = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = { per_page: 100 };
      if (statusFilter !== 'all') params.status = statusFilter as ReservationStatus;
      if (dateFilter) params.date = dateFilter;

      const [resData, spacesData] = await Promise.all([
        getReservations(params),
        getSpaces({ per_page: 100 }),
      ]);
      setReservations(resData.reservations);
      // Available or reserved spaces that can accept bookings
      setAvailableSpaces(spacesData.spaces.filter((s) => s.status !== 'out_of_service'));
    } catch (err: any) {
      setError(err.message || 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservationsList();
  }, [statusFilter, dateFilter]);

  const handleStartBooking = () => {
    // Set default times (starts 1 hour from now, duration 2 hours)
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const start = new Date(now.getTime() + 60 * 60 * 1000);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const toLocalISO = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours()
      )}:${pad(d.getMinutes())}`;

    setBookingData({
      space_id: availableSpaces[0]?.id || '',
      vehicle_reg: '',
      start_time: toLocalISO(start),
      end_time: toLocalISO(end),
    });
    setSelectedSpace(availableSpaces[0] || null);
    setBookingStep(1);
    setBookingError(null);
    setIsModalOpen(true);
  };

  const calculateFee = (space: ParkingSpace, startStr: string, endStr: string) => {
    try {
      const s = new Date(startStr);
      const e = new Date(endStr);
      const diffMs = e.getTime() - s.getTime();
      if (diffMs > 0) {
        const hours = diffMs / (1000 * 60 * 60);
        return Math.max(0, hours * (space.hourly_rate || 50));
      }
    } catch (err) {
      // ignore parse error
    }
    return 0;
  };

  useEffect(() => {
    if (selectedSpace && bookingData.start_time && bookingData.end_time) {
      setEstimatedFee(calculateFee(selectedSpace, bookingData.start_time, bookingData.end_time));
    }
  }, [selectedSpace, bookingData.start_time, bookingData.end_time]);

  const handleConfirmReservation = async () => {
    try {
      setSubmitting(true);
      setBookingError(null);

      // Validate inputs
      if (!bookingData.vehicle_reg.trim()) {
        setBookingError('Vehicle registration plate is required.');
        setBookingStep(2);
        return;
      }
      const s = new Date(bookingData.start_time);
      const e = new Date(bookingData.end_time);
      if (e <= s) {
        setBookingError('Reservation end time must be strictly after start time.');
        setBookingStep(2);
        return;
      }

      await createReservation({
        space_id: bookingData.space_id,
        vehicle_reg: bookingData.vehicle_reg.trim().toUpperCase(),
        start_time: new Date(bookingData.start_time).toISOString(),
        end_time: new Date(bookingData.end_time).toISOString(),
      });

      setIsModalOpen(false);
      fetchReservationsList();
    } catch (err: any) {
      setBookingError(err.message || 'Failed to complete booking. Conflict detected.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelReservation = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;
    try {
      await cancelReservation(id);
      fetchReservationsList();
      if (detailsReservation?.id === id) {
        setDetailsReservation(null);
      }
    } catch (err: any) {
      alert(`Could not cancel reservation: ${err.message}`);
    }
  };

  const filteredReservations = reservations.filter((r) => {
    const matchesSearch =
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.vehicle_reg.toLowerCase().includes(search.toLowerCase()) ||
      r.space_id.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <DemoDisclaimer />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Reservation Workflow</h2>
          <p className="text-xs text-slate-500">
            Book parking spots with real-time double-booking prevention and fee calculation
          </p>
        </div>
        <button onClick={handleStartBooking} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>New Reservation</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="card-container p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID, plate number, or slot..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-text pl-9"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select-input text-xs w-auto py-1.5"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="input-text text-xs w-auto py-1.5"
          />

          {(statusFilter !== 'all' || dateFilter) && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setDateFilter('');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Reservations Table */}
      {loading ? (
        <LoadingSpinner message="Retrieving reservation logs..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchReservationsList} />
      ) : filteredReservations.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No Reservations Recorded"
          description="Create your first parking reservation to test slot booking validation and persistence."
          action={{
            label: 'Make a Reservation',
            onClick: handleStartBooking,
          }}
        />
      ) : (
        <div className="card-container overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Reservation ID</th>
                  <th className="px-4 py-3 font-semibold">Slot</th>
                  <th className="px-4 py-3 font-semibold">Vehicle Plate</th>
                  <th className="px-4 py-3 font-semibold">Start Window</th>
                  <th className="px-4 py-3 font-semibold">End Window</th>
                  <th className="px-4 py-3 font-semibold">Est. Fee</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReservations.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-blue-600 font-medium">
                      {r.id.substring(0, 8)}...
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{r.space_id}</td>
                    <td className="px-4 py-3 font-mono font-medium text-slate-800">
                      {r.vehicle_reg}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(r.start_time).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(r.end_time).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      ${r.estimated_fee.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => setDetailsReservation(r)}
                        className="text-xs text-slate-600 hover:text-slate-900 font-medium underline"
                      >
                        Details
                      </button>
                      {r.status === 'active' && (
                        <button
                          onClick={() => handleCancelReservation(r.id)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Multi-Step Reservation Creation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Demonstration Reservation"
        maxWidth="lg"
      >
        <div className="space-y-5">
          {/* Step indicators */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div
              className={`flex items-center gap-1.5 text-xs font-semibold ${
                bookingStep >= 1 ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">
                1
              </span>
              <span>Select Slot</span>
            </div>
            <div className="w-8 h-0.5 bg-slate-200" />
            <div
              className={`flex items-center gap-1.5 text-xs font-semibold ${
                bookingStep >= 2 ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">
                2
              </span>
              <span>Vehicle & Time</span>
            </div>
            <div className="w-8 h-0.5 bg-slate-200" />
            <div
              className={`flex items-center gap-1.5 text-xs font-semibold ${
                bookingStep === 3 ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">
                3
              </span>
              <span>Review & Confirm</span>
            </div>
          </div>

          {bookingError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{bookingError}</span>
            </div>
          )}

          {/* STEP 1: SELECT SLOT */}
          {bookingStep === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Choose a parking slot from the list of operational spaces:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-1">
                {availableSpaces.map((space) => {
                  const isSelected = bookingData.space_id === space.id;
                  return (
                    <button
                      key={space.id}
                      type="button"
                      onClick={() => {
                        setBookingData({ ...bookingData, space_id: space.id });
                        setSelectedSpace(space);
                      }}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-slate-800">{space.slot_number}</span>
                        <span className="text-[10px] text-slate-500 capitalize">
                          {space.vehicle_type}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Floor: {space.floor} • ${space.hourly_rate}/hr
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setBookingStep(2)}
                  disabled={!bookingData.space_id}
                  className="btn-primary"
                >
                  Continue to Vehicle & Time
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: VEHICLE & TIME */}
          {bookingStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vehicle Registration Number (License Plate) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MH-12-AB-1234, DL-01-XYZ"
                  value={bookingData.vehicle_reg}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, vehicle_reg: e.target.value.toUpperCase() })
                  }
                  className="input-text font-mono uppercase"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reservation Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={bookingData.start_time}
                    onChange={(e) =>
                      setBookingData({ ...bookingData, start_time: e.target.value })
                    }
                    className="input-text"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reservation End Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={bookingData.end_time}
                    onChange={(e) => setBookingData({ ...bookingData, end_time: e.target.value })}
                    className="input-text"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
                <span className="text-slate-600">Configured Slot Hourly Rate:</span>
                <span className="font-bold text-slate-800">${selectedSpace?.hourly_rate || 50}/hr</span>
              </div>

              <div className="pt-3 flex justify-between">
                <button
                  type="button"
                  onClick={() => setBookingStep(1)}
                  className="btn-secondary"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!bookingData.vehicle_reg.trim()) {
                      setBookingError('Please enter a vehicle registration number');
                      return;
                    }
                    setBookingError(null);
                    setBookingStep(3);
                  }}
                  className="btn-primary"
                >
                  Review Details
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & CONFIRM */}
          {bookingStep === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Target Slot:</span>
                  <span className="font-bold text-slate-800">
                    {selectedSpace?.slot_number} (Floor {selectedSpace?.floor})
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Vehicle Registration:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {bookingData.vehicle_reg}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Reserved Window:</span>
                  <span className="font-medium text-slate-800 text-right">
                    {new Date(bookingData.start_time).toLocaleString()} <br /> to{' '}
                    {new Date(bookingData.end_time).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 text-sm">
                  <span className="font-semibold text-slate-700">Estimated Total Charge:</span>
                  <span className="font-extrabold text-blue-600 text-base">
                    ${estimatedFee.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/60 border border-blue-200 text-blue-900 rounded-lg text-xs leading-relaxed">
                ℹ️ <strong>Backend Conflict Detection:</strong> The Flask backend validates overlapping time windows using transactional SQLite queries before confirmation to prevent double bookings.
              </div>

              <div className="pt-3 flex justify-between">
                <button
                  type="button"
                  onClick={() => setBookingStep(2)}
                  className="btn-secondary"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReservation}
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting ? 'Confirming...' : 'Confirm & Persist Booking'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={!!detailsReservation}
        onClose={() => setDetailsReservation(null)}
        title="Reservation Details"
      >
        {detailsReservation && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Unique ID
                </span>
                <span className="font-mono text-slate-800 select-all font-semibold">
                  {detailsReservation.id}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Slot
                  </span>
                  <span className="font-bold text-slate-800 text-sm">
                    {detailsReservation.space_id}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Vehicle Plate
                  </span>
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    {detailsReservation.vehicle_reg}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Start Time
                </span>
                <span className="text-slate-700">
                  {new Date(detailsReservation.start_time).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  End Time
                </span>
                <span className="text-slate-700">
                  {new Date(detailsReservation.end_time).toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Estimated Fee
                  </span>
                  <span className="font-bold text-blue-600">
                    ${detailsReservation.estimated_fee.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Status
                  </span>
                  <StatusBadge status={detailsReservation.status} size="sm" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {detailsReservation.status === 'active' && (
                <button
                  onClick={() => handleCancelReservation(detailsReservation.id)}
                  className="btn-danger text-xs"
                >
                  Cancel Reservation
                </button>
              )}
              <button
                onClick={() => setDetailsReservation(null)}
                className="btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

