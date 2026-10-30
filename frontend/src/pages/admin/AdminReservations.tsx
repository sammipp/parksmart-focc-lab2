import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  AlertCircle,
  Calendar,
  XCircle,
} from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { getReservations, cancelReservation } from '../../api/reservations';
import { Reservation, ReservationStatus } from '../../types';

export const AdminReservations: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  const fetchReservations = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = { per_page: 100 };
      if (statusFilter !== 'all') params.status = statusFilter as ReservationStatus;
      if (dateFilter) params.date = dateFilter;

      const res = await getReservations(params);
      setReservations(res.reservations);
    } catch (err: any) {
      setError(err.message || 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [statusFilter, dateFilter]);

  const handleCancel = async (id: string) => {
    if (!confirm(`Cancel reservation ${id}? This action will free up the associated parking slot.`))
      return;
    try {
      await cancelReservation(id);
      fetchReservations();
    } catch (err: any) {
      alert(`Failed to cancel: ${err.message}`);
    }
  };

  const exportToCSV = () => {
    if (reservations.length === 0) return;
    const headers = [
      'ID',
      'Slot',
      'Vehicle Plate',
      'Start Time',
      'End Time',
      'Estimated Fee',
      'Status',
      'Created At',
    ];
    const rows = reservations.map((r) => [
      r.id,
      r.space_id,
      r.vehicle_reg,
      r.start_time,
      r.end_time,
      r.estimated_fee,
      r.status,
      r.created_at,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `parksmart-reservations-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = reservations.filter((r) => {
    const matchesSearch =
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.vehicle_reg.toLowerCase().includes(search.toLowerCase()) ||
      r.space_id.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Reservation Audit & Management</h2>
          <p className="text-xs text-slate-500">
            Inspect reservation history, perform administrative cancellations, and export audit logs
          </p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={reservations.length === 0}
          className="btn-secondary text-xs flex items-center gap-1.5"
        >
          <Download className="w-4 h-4 text-slate-600" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="card-container p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search reservation ID, plate, or slot..."
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

      {/* Table */}
      {loading ? (
        <LoadingSpinner message="Querying reservation audit records..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchReservations} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Matching Reservations"
          description="No reservation logs match the specified search or filter criteria."
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
                  <th className="px-4 py-3 font-semibold text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 select-all">
                      {r.id}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">{r.space_id}</td>
                    <td className="px-4 py-3 font-mono font-medium text-slate-800">
                      {r.vehicle_reg}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(r.start_time).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(r.end_time).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      ${r.estimated_fee.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === 'active' ? (
                        <button
                          onClick={() => handleCancel(r.id)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                        >
                          Revoke
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

