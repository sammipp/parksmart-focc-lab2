import React, { useEffect, useState } from 'react';
import {
  Car,
  CheckCircle2,
  Clock,
  Ban,
  Percent,
  DollarSign,
  TrendingUp,
  MapPin,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorState } from '../components/ui/ErrorState';
import { DemoDisclaimer } from '../components/ui/DemoDisclaimer';
import { getOverview, getOccupancy } from '../api/analytics';
import { getReservations } from '../api/reservations';
import { AnalyticsOverview, OccupancyDataPoint, Reservation } from '../types';

export const Dashboard: React.FC = () => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [occupancyTrend, setOccupancyTrend] = useState<OccupancyDataPoint[]>([]);
  const [recentReservations, setRecentReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [overviewData, occupancyData, reservationsData] = await Promise.all([
        getOverview(),
        getOccupancy(7),
        getReservations({ page: 1, per_page: 5 }),
      ]);
      setOverview(overviewData);
      setOccupancyTrend(occupancyData);
      setRecentReservations(reservationsData.reservations);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Aggregating parking sensor and session metrics..." />;
  }

  if (error || !overview) {
    return (
      <ErrorState
        title="Failed to Load Dashboard"
        message={error || 'Could not communicate with the ParkSmart backend API.'}
        onRetry={fetchData}
      />
    );
  }

  const zoneData = overview.zones || [];

  return (
    <div className="space-y-6">
      <DemoDisclaimer />

      {/* 6 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Slots"
          value={overview.total_spaces ?? 0}
          subtitle="Configured slots"
          icon={Layers}
          color="slate"
        />
        <StatCard
          title="Available"
          value={overview.available_spaces ?? overview.available ?? 0}
          subtitle="Ready to park"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Occupied"
          value={overview.occupied_spaces ?? overview.occupied ?? 0}
          subtitle="Vehicles parked"
          icon={Ban}
          color="rose"
        />
        <StatCard
          title="Reserved"
          value={overview.reserved_spaces ?? overview.reserved ?? 0}
          subtitle="Upcoming slots"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Occupancy"
          value={`${overview.occupancy_percentage ?? overview.occupancy_percent ?? 0}%`}
          subtitle="Current load"
          icon={Percent}
          color="blue"
        />
        <StatCard
          title="Est. Revenue"
          value={`$${(overview.simulated_daily_revenue ?? overview.today_revenue ?? 0).toFixed(0)}`}
          subtitle="Sample today rate"
          icon={DollarSign}
          color="emerald"
        />
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Occupancy Trend */}
        <div className="lg:col-span-2 card-container p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                7-Day Occupancy Activity
              </h3>
              <p className="text-xs text-slate-500">
                Calculated from stored demonstration vehicle sessions
              </p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-medium">
              Demo Data
            </span>
          </div>
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={occupancyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="occupancyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis unit="%" tick={{ fontSize: 11, fill: '#64748B' }} domain={[0, 100]} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Occupancy']}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="occupancy_percent"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#occupancyGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Zone Breakdown Chart */}
        <div className="card-container p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Capacity by Zone
              </h3>
              <p className="text-xs text-slate-500">Available vs. Occupied</p>
            </div>
          </div>
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="zone_name" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="available" name="Available" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="occupied" name="Occupied" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Reservations Table */}
      <div className="card-container p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Recent Demonstration Reservations
            </h3>
            <p className="text-xs text-slate-500">Latest reservations registered in SQLite</p>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Active Bookings: <strong className="text-slate-800">{overview.active_reservations}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Reservation ID</th>
                <th className="px-4 py-3 font-semibold">Slot</th>
                <th className="px-4 py-3 font-semibold">Vehicle Plate</th>
                <th className="px-4 py-3 font-semibold">Start Time</th>
                <th className="px-4 py-3 font-semibold">End Time</th>
                <th className="px-4 py-3 font-semibold">Est. Fee</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentReservations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No reservations recorded yet.
                  </td>
                </tr>
              ) : (
                recentReservations.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {r.id.substring(0, 8)}...
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{r.space_id}</td>
                    <td className="px-4 py-3 font-mono font-medium text-slate-700">{r.vehicle_reg}</td>
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
                    <td className="px-4 py-3 font-medium text-slate-800">
                      ${r.estimated_fee.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} size="sm" />
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

