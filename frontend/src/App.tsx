import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { ParkingSpaces } from './pages/ParkingSpaces';
import { Reservations } from './pages/Reservations';
import { EntryExit } from './pages/EntryExit';
import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminSpaces } from './pages/admin/AdminSpaces';
import { AdminReservations } from './pages/admin/AdminReservations';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="spaces" element={<ParkingSpaces />} />
        <Route path="reservations" element={<Reservations />} />
        <Route path="entry-exit" element={<EntryExit />} />
        <Route path="admin" element={<Navigate to="/admin/overview" replace />} />
        <Route path="admin/overview" element={<AdminOverview />} />
        <Route path="admin/spaces" element={<AdminSpaces />} />
        <Route path="admin/reservations" element={<AdminReservations />} />
        <Route path="admin/analytics" element={<AdminAnalytics />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default App;

