import React from 'react';
import { Info } from 'lucide-react';

export const DemoDisclaimer: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`flex items-start gap-3 p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/90 text-amber-900 text-xs sm:text-sm leading-relaxed ${className}`}
    >
      <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div>
        <span className="font-semibold text-amber-950">Demonstration Environment Notice:</span>{' '}
        This is an educational prototype built for Fundamentals of Cloud Computing Lab #2. Sensor readings, barrier movements, and revenue values are simulated demonstration data. No actual payment gateways or hardware sensors are connected.
      </div>
    </div>
  );
};

