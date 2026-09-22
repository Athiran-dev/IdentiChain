import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';
import { AlertTriangle, Shield, Check, X, ShieldAlert, ShieldOff } from 'lucide-react';
import { useAuth } from './AuthContext';

export default function ThreatDetectionPanel({ viewRole, onDeactivateIdentity }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { identity } = useAuth();

  const fetchAlerts = async () => {
    try {
      let statusFilter = '';
      if (viewRole === 'AUDITOR') statusFilter = 'PENDING_AUDITOR';
      else if (viewRole === 'MANAGER') statusFilter = 'ESCALATED_MANAGER';
      else if (viewRole === 'ADMIN') statusFilter = 'ESCALATED_ADMIN';

      const res = await apiFetch(`/api/alerts/list?status=${statusFilter}`);
      setAlerts(res.alerts);
    } catch (e) {
      console.error('Failed to fetch alerts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [viewRole]);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await apiFetch(`/api/alerts/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      fetchAlerts();
    } catch (e) {
      alert(`Update failed: ${e.message}`);
    }
  };

  if (loading) return <div>Loading Threat Detection...</div>;

  if (alerts.length === 0) {
    return (
      <div className="glass-card-primary" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <Shield size={48} style={{ color: 'var(--success-green)', marginBottom: '1rem' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>No Active Threats Detected</h3>
        <p>The AI monitoring system has not flagged any anomalies for your role.</p>
      </div>
    );
  }

  const severityColor = (severity) => {
    switch(severity) {
      case 'CRITICAL': return '#dc2626';
      case 'HIGH': return '#e11d48';
      case 'MEDIUM': return '#d97706';
      default: return '#2563eb';
    }
  };

  return (
    <div className="glass-card-primary" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <ShieldAlert size={24} color="#e11d48" />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>AI Threat Detection Alerts</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {alerts.map(alert => (
          <div key={alert._id} style={{ 
            padding: '1.5rem', 
            borderRadius: '12px', 
            border: `1px solid ${severityColor(alert.severity)}`,
            background: 'var(--neo-bg)',
            boxShadow: 'var(--neo-shadow)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <AlertTriangle size={18} color={severityColor(alert.severity)} />
                  <span style={{ fontWeight: 'bold', color: severityColor(alert.severity) }}>
                    {alert.severity} SEVERITY ANOMALY
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '1rem' }}>
                    {new Date(alert.createdAt).toLocaleString()}
                  </span>
                </div>
                <div style={{ fontFamily: 'monospace', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  Suspect Wallet: {alert.wallet}
                </div>
                <div style={{ color: 'var(--text-color)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  <strong>AI Analysis:</strong> {alert.reason}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              {viewRole === 'AUDITOR' && (
                <>
                  <button onClick={() => handleUpdateStatus(alert._id, 'ESCALATED_MANAGER')} className="btn-primary" style={{ flex: 1 }}>
                    Forward to Manager
                  </button>
                  <button onClick={() => handleUpdateStatus(alert._id, 'DISMISSED')} className="btn-outline" style={{ flex: 1 }}>
                    Dismiss (False Alarm)
                  </button>
                </>
              )}
              {viewRole === 'MANAGER' && (
                <>
                  <button onClick={() => handleUpdateStatus(alert._id, 'ESCALATED_ADMIN')} className="btn-primary" style={{ flex: 1 }}>
                    Escalate to Admin
                  </button>
                  <button onClick={() => {
                    if (onDeactivateIdentity) onDeactivateIdentity(alert.wallet);
                  }} className="btn-primary" style={{ flex: 1, background: '#e11d48' }}>
                    Deactivate Identity
                  </button>
                  <button onClick={() => handleUpdateStatus(alert._id, 'DISMISSED')} className="btn-outline" style={{ flex: 1 }}>
                    Dismiss
                  </button>
                </>
              )}
              {viewRole === 'ADMIN' && (
                <>
                  <button onClick={() => {
                    if (onDeactivateIdentity) onDeactivateIdentity(alert.wallet);
                  }} className="btn-primary" style={{ flex: 1, background: '#e11d48' }}>
                    Deactivate Identity
                  </button>
                  <button onClick={() => handleUpdateStatus(alert._id, 'DISMISSED')} className="btn-outline" style={{ flex: 1 }}>
                    Dismiss
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
