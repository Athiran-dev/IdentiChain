import React, { Suspense, lazy } from 'react';
import { useAuth } from './AuthContext';
const OnboardingDashboard = lazy(() => import('../dashboards/OnboardingDashboard'));
const EmployeeDashboard = lazy(() => import('../dashboards/EmployeeDashboard'));
const ManagerDashboard = lazy(() => import('../dashboards/ManagerDashboard'));
const AuditorDashboard = lazy(() => import('../dashboards/AuditorDashboard'));
const AdminDashboard = lazy(() => import('../dashboards/AdminDashboard'));

export default function DashboardRouter() {
  const { identity, loading } = useAuth();

  if (loading || !identity) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading identity...</div>;
  }

  const role = identity.onChain?.role || 'NONE';
  const isActive = identity.onChain?.isActive;

  if (!isActive && role !== 'NONE') {
    return (
      <div className="glass-card-primary" style={{ padding: '3rem', textAlign: 'center', maxWidth: '600px', margin: '2rem auto' }}>
        <h2 style={{ color: 'var(--e53e3e)', marginBottom: '1rem' }}>Account Inactive</h2>
        <p>Your account has been deactivated by an Admin. You cannot access the dashboard.</p>
      </div>
    );
  }

  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '3rem' }}>Loading dashboard...</div>}>
      {renderDashboard(role)}
    </Suspense>
  );
}

function renderDashboard(role) {
  switch (role) {
    case 'NONE':
      return <OnboardingDashboard />;
    case 'EMPLOYEE':
      return <EmployeeDashboard />;
    case 'MANAGER':
      return <ManagerDashboard />;
    case 'AUDITOR':
      return <AuditorDashboard />;
    case 'ADMIN':
      return <AdminDashboard />;
    default:
      return <div>Unknown role: {role}</div>;
  }
}
