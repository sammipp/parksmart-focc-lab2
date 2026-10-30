import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  TrendingUp,
  PieChart as PieIcon,
  Users,
  Layers,
  Percent,
  DollarSign,
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { StatCard } from '../../components/ui/StatCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/ui/ErrorState';
import { getOverview, getOccupancy } from '../../api/analytics';
import { AnalyticsOverview, OccupancyDataPoint } from '../../types';

export const AdminOverview: React.FC = () => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [occupancyTrend, setOccupancyTrend] = useState<OccupancyDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [overviewData, occupancyData] = await Promise.all([
        getOverview(),
        getOccupancy(7),
      ]);
      setOverview(overviewData);
      setOccupancyTrend(occupancyData);
    } catch (err: any) {
      setError(err.message || 'Failed to load administrative overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  if (loading) return <LoadingSpinner message="Querying cluster & database telemetry..." />;
  if (error || !overview) return <ErrorState message={error || 'Error'} onRetry={fetchAdminData} />;

  const availableCount = overview.available_spaces ?? overview.available ?? 0;
  const occupiedCount = overview.occupied_spaces ?? overview.occupied ?? 0;
  const reservedCount = overview.reserved_spaces ?? overview.reserved ?? 0;
  const outOfServiceCount = overview.out_of_service_spaces ?? overview.out_of_service ?? 0;

  const pieData = [
    { name: 'Available', value: availableCount, color: '#10B981' },
    { name: 'Occupied', value: occupiedCount, color: '#EF4444' },
    { name: 'Reserved', value: reservedCount, color: '#F59E0B' },
    { name: 'Out of Service', value: outOfServiceCount, color: '#64748B' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="card-container p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0 shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-bold tracking-tight">Admin Telemetry & Operations</h2>
            </div>
            <p className="text-xs text-slate-300 max-w-xl">
              System governance console for slot inventory, transaction auditing, and EKS container metrics.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-mono">
              Cluster: parksmart-eks
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Slots"
          value={overview.total_spaces ?? 0}
          subtitle="Managed across 4 zones"
          icon={Layers}
          color="slate"
        />
        <StatCard
          title="Current Load"
          value={`${overview.occupancy_percentage ?? overview.occupancy_percent ?? 0}%`}
          subtitle="Target HPA threshold: 50%"
          icon={Percent}
          color="blue"
        />
        <StatCard
          title="Active Bookings"
          value={overview.active_reservations ?? 0}
          subtitle="Confirmed future slots"
          icon={Users}
          color="amber"
        />
        <StatCard
          title="Today's Est. Revenue"
          value={`$${(overview.simulated_daily_revenue ?? overview.today_revenue ?? 0).toFixed(2)}`}
          subtitle="Demonstration calculation"
          icon={DollarSign}
          color="emerald"
        />
      </div>

      {/* Entry/Exit Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card-container p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Today's Inbound Entries</p>
              <h4 className="text-xl font-bold text-slate-900">{overview.today_entries} vehicles</h4>
            </div>
          </div>
          <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold">
            Simulated
          </span>
        </div>

        <div className="card-container p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Today's Outbound Checkouts</p>
              <h4 className="text-xl font-bold text-slate-900">{overview.today_exits} vehicles</h4>
            </div>
          </div>
          <span className="text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full font-semibold">
            Simulated
          </span>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Line */}
        <div className="lg:col-span-2 card-container p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            7-Day Occupancy Trend
          </h3>
          <p className="text-xs text-slate-500 mb-4">Historical utilization percentage</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={occupancyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                <Line
                  type="monotone"
                  dataKey="occupancy_percent"
                  stroke="#2563EB"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#2563EB' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Slot Distribution Pie */}
        <div className="card-container p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-1 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-blue-600" />
            Slot Status Breakdown
          </h3>
          <p className="text-xs text-slate-500 mb-2">Live allocation of 40 total slots</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

