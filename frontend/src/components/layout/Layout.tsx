import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const titleMap: Record<string, string> = {
  '/': 'Executive Overview',
  '/spaces': 'Parking Space Availability & Grid',
  '/reservations': 'Reservation Workflow & Booking',
  '/entry-exit': 'Vehicle Entry & Exit Simulation',
  '/admin/overview': 'Administrative Management & Telemetry',
  '/admin/spaces': 'Parking Space CRUD Management',
  '/admin/reservations': 'Reservation Records & Cancellation Audit',
  '/admin/analytics': 'Occupancy & Revenue Analytics',
};

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const currentTitle = titleMap[location.pathname] || 'ParkSmart System';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} onCloseMobile={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} title={currentTitle} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        <footer className="py-4 px-6 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
          ParkSmart — Smart Parking Management System • BTech Fundamentals of Cloud Computing Lab #2
        </footer>
      </div>
    </div>
  );
};

