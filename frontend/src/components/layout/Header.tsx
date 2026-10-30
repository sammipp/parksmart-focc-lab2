import React, { useState, useEffect } from 'react';
import { Menu, Clock, Activity, Database } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, title = 'Smart Parking Management' }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {title}
          </h1>
          <p className="hidden sm:block text-xs text-slate-500 font-medium">
            Cloud Computing Lab #2 • Amazon EKS & HPA Demo
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* System Status Pill */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700">
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-medium">SQLite (Demo Persistence)</span>
        </div>

        {/* Live Clock */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50/70 border border-blue-100 text-blue-800 text-xs font-mono font-medium">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>{time.toLocaleTimeString()}</span>
        </div>

        {/* Demo Tag */}
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
          <Activity className="w-3 h-3 text-emerald-600" />
          <span>Live Demo</span>
        </span>
      </div>
    </header>
  );
};

