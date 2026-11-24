import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../layouts/AppLayout';
import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white text-sm">
        Loading FixFlow session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected App Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="repairs" element={<PlaceholderPage title="Repairs Management" />} />
        <Route path="customers" element={<PlaceholderPage title="Customer CRM" />} />
        <Route path="devices" element={<PlaceholderPage title="Device Registry" />} />
        <Route path="technicians" element={<PlaceholderPage title="Technicians & Workload" />} />
        <Route path="inventory" element={<PlaceholderPage title="Spare Parts Inventory" />} />
        <Route path="suppliers" element={<PlaceholderPage title="Suppliers" />} />
        <Route path="quotations" element={<PlaceholderPage title="Quotations" />} />
        <Route path="invoices" element={<PlaceholderPage title="Invoices & Billing" />} />
        <Route path="payments" element={<PlaceholderPage title="Payments" />} />
        <Route path="warranties" element={<PlaceholderPage title="Warranty Management" />} />
        <Route path="reports" element={<PlaceholderPage title="Analytics & Reports" />} />
        <Route path="notifications" element={<PlaceholderPage title="Notifications" />} />
        <Route path="settings" element={<PlaceholderPage title="Shop Settings" />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
