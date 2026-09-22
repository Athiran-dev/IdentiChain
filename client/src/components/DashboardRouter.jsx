import React from 'react';
import { useAuth } from './AuthContext';
import OnboardingDashboard from '../dashboards/OnboardingDashboard';
import EmployeeDashboard from '../dashboards/EmployeeDashboard';
import ManagerDashboard from '../dashboards/ManagerDashboard';
import AuditorDashboard from '../dashboards/AuditorDashboard';
import AdminDashboard from '../dashboards/AdminDashboard';

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
