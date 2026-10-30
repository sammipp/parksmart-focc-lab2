import React, { useState, useEffect } from 'react';
import {
  ArrowRightLeft,
  LogIn,
  LogOut,
  Car,
  Clock,
  History,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { DemoDisclaimer } from '../components/ui/DemoDisclaimer';
import {
  getActiveVehicles,
  getVehicleHistory,
  recordEntry,
  recordExit,
} from '../api/vehicles';
import { getSpaces } from '../api/spaces';
import { VehicleSession, ParkingSpace } from '../types';

export const EntryExit: React.FC = () => {
  const [activeSessions, setActiveSessions] = useState<VehicleSession[]>([]);
  const [historySessions, setHistorySessions] = useState<VehicleSession[]>([]);
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Entry Form
  const [entryVehicleReg, setEntryVehicleReg] = useState('');
  const [entrySpaceId, setEntrySpaceId] = useState('');
  const [entryError, setEntryError] = useState<string | null>(null);
  const [entrySuccess, setEntrySuccess] = useState<string | null>(null);
  const [submittingEntry, setSubmittingEntry] = useState(false);

  // Exit Form
  const [exitSessionId, setExitSessionId] = useState('');
  const [exitError, setExitError] = useState<string | null>(null);
  const [exitSuccess, setExitSuccess] = useState<string | null>(null);
  const [submittingExit, setSubmittingExit] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [activeData, historyData, spacesData] = await Promise.all([
        getActiveVehicles(),
        getVehicleHistory({ per_page: 50 }),
        getSpaces({ per_page: 100 }),
      ]);
      setActiveSessions(activeData);
      setHistorySessions(historyData.sessions);
      setSpaces(spacesData.spaces);

      // Default entry space to first available space
      const firstAvailable = spacesData.spaces.find((s) => s.status === 'available');
      if (firstAvailable && !entrySpaceId) {
        setEntrySpaceId(firstAvailable.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load vehicle session data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRecordEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryVehicleReg.trim() || !entrySpaceId) {
      setEntryError('Please provide both registration number and slot.');
      return;
    }
    try {
      setSubmittingEntry(true);
      setEntryError(null);
      setEntrySuccess(null);

      const res = await recordEntry({
        vehicle_reg: entryVehicleReg.trim().toUpperCase(),
        space_id: entrySpaceId,
      });

      setEntrySuccess(`Vehicle ${res.vehicle_reg} entry recorded at slot ${res.space_id}`);
      setEntryVehicleReg('');
      fetchData();
    } catch (err: any) {
      setEntryError(err.message || 'Failed to record vehicle entry');
    } finally {
      setSubmittingEntry(false);
    }
  };

  const handleRecordExit = async (session: VehicleSession) => {
    try {
      setSubmittingExit(true);
      setExitError(null);
      setExitSuccess(null);

      const res = await recordExit({ session_id: session.id });
      setExitSuccess(
        `Exit processed for ${res.vehicle_reg}. Duration: ${res.duration_minutes}m, Charge: $${res.charge?.toFixed(2)}`
      );
      fetchData();
    } catch (err: any) {
      setExitError(err.message || 'Failed to process vehicle exit');
    } finally {
      setSubmittingExit(false);
    }
  };

  const handleQuickSimulation = async () => {
    // Pick random available space and random license plate
    const available = spaces.filter((s) => s.status === 'available');
    if (available.length === 0) {
      alert('No available spaces left to simulate an entry event.');
      return;
    }
    const randomSpace = available[Math.floor(Math.random() * available.length)];
    const randomPlate = `SIM-${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      await recordEntry({
        space_id: randomSpace.id,
        vehicle_reg: randomPlate,
      });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const availableSpaces = spaces.filter(
    (s) => s.status === 'available' || s.status === 'reserved'
  );

  if (loading) return <LoadingSpinner message="Loading entry/exit telemetry..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6">
      <DemoDisclaimer />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Vehicle Entry & Exit Gate Operations</h2>
          <p className="text-xs text-slate-500">
            Simulated access control, automatic slot occupation, duration tracking, and checkout calculation
          </p>
        </div>
        <button
          onClick={handleQuickSimulation}
          className="btn-secondary text-xs flex items-center gap-1.5 border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Simulate Random Arrival</span>
        </button>
      </div>

      {/* Gate Controls: 2 Columns (Entry & Quick Exit) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entry Gate Panel */}
        <div className="card-container p-5">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Simulate Vehicle Entry</h3>
              <p className="text-xs text-slate-500">Record incoming vehicle and allocate slot</p>
            </div>
          </div>

          {entryError && (
            <div className="mb-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{entryError}</span>
            </div>
          )}

          {entrySuccess && (
            <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{entrySuccess}</span>
            </div>
          )}

          <form onSubmit={handleRecordEntry} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vehicle Registration Plate *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. KA-05-MJ-9988"
                value={entryVehicleReg}
                onChange={(e) => setEntryVehicleReg(e.target.value.toUpperCase())}
                className="input-text uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assign Parking Slot *
              </label>
              <select
                value={entrySpaceId}
                onChange={(e) => setEntrySpaceId(e.target.value)}
                className="select-input"
              >
                {availableSpaces.length === 0 ? (
                  <option value="">No Available Spaces Found</option>
                ) : (
                  availableSpaces.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.slot_number} (Floor {s.floor} • {s.vehicle_type} • ${s.hourly_rate}/hr •{' '}
                      {s.status})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
              ⚡ Recording entry automatically updates slot status to <strong>Occupied</strong> and
              persists an active session timestamp.
            </div>

            <button
              type="submit"
              disabled={submittingEntry || availableSpaces.length === 0}
              className="btn-primary w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {submittingEntry ? 'Processing Gate...' : 'Record Simulated Arrival'}
            </button>
          </form>
        </div>

        {/* Exit Operations Summary Panel */}
        <div className="card-container p-5">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Exit & Fee Calculation Gate</h3>
              <p className="text-xs text-slate-500">
                Checkout active parked vehicles and release slots
              </p>
            </div>
          </div>

          {exitError && (
            <div className="mb-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{exitError}</span>
            </div>
          )}

          {exitSuccess && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{exitSuccess}</span>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs text-slate-600">
              Currently Active Vehicles: <strong>{activeSessions.length}</strong>
            </p>

            {activeSessions.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                No vehicles currently inside the parking facility.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {activeSessions.slice(0, 5).map((session) => (
                  <div
                    key={session.id}
                    className="p-3 flex items-center justify-between hover:bg-slate-50 text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-slate-800">
                        {session.vehicle_reg}
                      </span>
                      <span className="text-slate-500 ml-2">Slot {session.space_id}</span>
                      <p className="text-[10px] text-slate-400">
                        In: {new Date(session.entry_time).toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRecordExit(session)}
                      disabled={submittingExit}
                      className="btn-danger py-1 px-3 text-xs"
                    >
                      Process Exit
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
              💳 Exit automatically computes actual elapsed duration, calculates charges, and
              resets slot to <strong>Available</strong>.
            </div>
          </div>
        </div>
      </div>

      {/* Active Vehicles Table */}
      <div className="card-container p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-2">
          <Car className="w-4 h-4 text-blue-600" />
          Active Vehicles Inside Facility ({activeSessions.length})
        </h3>

        {activeSessions.length === 0 ? (
          <EmptyState
            icon={Car}
            title="Facility Empty"
            description="No vehicles are parked inside right now. Record an arrival above to simulate."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Vehicle Plate</th>
                  <th className="px-4 py-3 font-semibold">Assigned Slot</th>
                  <th className="px-4 py-3 font-semibold">Entry Timestamp</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">
                      {session.vehicle_reg}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{session.space_id}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(session.entry_time).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Parked
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRecordExit(session)}
                        disabled={submittingExit}
                        className="btn-danger py-1 px-3 text-xs"
                      >
                        Checkout & Exit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Completed History Table */}
      <div className="card-container p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-2">
          <History className="w-4 h-4 text-blue-600" />
          Recent Exit & Parking History
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Vehicle Plate</th>
                <th className="px-4 py-3 font-semibold">Slot</th>
                <th className="px-4 py-3 font-semibold">Entry Time</th>
                <th className="px-4 py-3 font-semibold">Exit Time</th>
                <th className="px-4 py-3 font-semibold">Duration</th>
                <th className="px-4 py-3 font-semibold">Charge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historySessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No checkout history recorded yet.
                  </td>
                </tr>
              ) : (
                historySessions.slice(0, 10).map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono font-medium text-slate-800">
                      {session.vehicle_reg}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{session.space_id}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(session.entry_time).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {session.exit_time
                        ? new Date(session.exit_time).toLocaleTimeString()
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {session.duration_minutes !== null && session.duration_minutes !== undefined
                        ? `${session.duration_minutes} min`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">
                      {session.charge !== null && session.charge !== undefined
                        ? `$${session.charge.toFixed(2)}`
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

