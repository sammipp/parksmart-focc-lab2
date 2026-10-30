import React from 'react';
import { CheckCircle2, Clock, Ban, AlertCircle } from 'lucide-react';
import { SpaceStatus, ReservationStatus } from '../../types';

interface StatusBadgeProps {
  status: SpaceStatus | ReservationStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normalized = status.toLowerCase();

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let icon = <AlertCircle className="w-3.5 h-3.5" />;
  let label = status;

  switch (normalized) {
    case 'available':
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      label = 'Available';
      break;
    case 'reserved':
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
      icon = <Clock className="w-3.5 h-3.5 text-amber-600" />;
      label = 'Reserved';
      break;
    case 'occupied':
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
      icon = <Ban className="w-3.5 h-3.5 text-rose-600" />;
      label = 'Occupied';
      break;
    case 'out_of_service':
      colorClasses = 'bg-slate-100 text-slate-600 border-slate-200';
      icon = <AlertCircle className="w-3.5 h-3.5 text-slate-500" />;
      label = 'Out of Service';
      break;
    case 'active':
      colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
      icon = <Clock className="w-3.5 h-3.5 text-blue-600" />;
      label = 'Active';
      break;
    case 'completed':
      colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
      icon = <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />;
      label = 'Completed';
      break;
    case 'cancelled':
      colorClasses = 'bg-rose-50 text-rose-600 border-rose-200';
      icon = <AlertCircle className="w-3.5 h-3.5 text-rose-500" />;
      label = 'Cancelled';
      break;
    default:
      label = status;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-full ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      } ${colorClasses}`}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
};

