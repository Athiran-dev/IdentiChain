import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';
import { Clock, CheckCircle, XCircle, AlertTriangle, Eye, GitPullRequest } from 'lucide-react';

/**
 * Employee-facing list of their own change requests.
 *
 * Props:
 *   onViewDiff — callback(changeRequestId) to open diff viewer (optional)
 */
export default function MyChangeRequests({ onViewDiff }) {
  const [changeRequests, setChangeRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(''); // '' = all, 'PENDING', 'APPROVED', 'REJECTED'

  const fetchCRs = async () => {
    setLoading(true);
    try {
      const url = filter
        ? `/api/asset/my-change-requests?status=${filter}`
        : '/api/asset/my-change-requests';
      const res = await apiFetch(url);
      setChangeRequests(res.changeRequests);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCRs();
  }, [filter]);

  const statusIcon = (status) => {
    switch (status) {
      case 'PENDING': return <Clock size={14} color="#d69e2e" />;
      case 'APPROVED': return <CheckCircle size={14} color="#38a169" />;
      case 'REJECTED': return <XCircle size={14} color="#e53e3e" />;
      default: return null;
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case 'PENDING': return '#d69e2e';
      case 'APPROVED': return '#38a169';
      case 'REJECTED': return '#e53e3e';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div className="glass-card-primary" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <GitPullRequest size={20} /> My Change Requests
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['', 'PENDING', 'APPROVED', 'REJECTED'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={filter === f ? 'btn-primary' : 'btn-outline'}
              style={{ padding: '0.3em 0.75em', fontSize: '0.75rem' }}
            >
              <span>{f || 'All'}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</div>
      ) : changeRequests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          No change requests found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {changeRequests.map((cr) => (
            <div
              key={cr._id}
              className="glass-card-secondary"
              style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  {statusIcon(cr.status)}
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {cr.name || `Document #${cr.tokenId}`}
                  </span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    color: statusColor(cr.status),
                    background: `${statusColor(cr.status)}15`,
                  }}>
                    {cr.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem' }}>
                  <span>Token #{cr.tokenId}</span>
                  <span>Base v{cr.baseVersion}</span>
                  <span>{new Date(cr.createdAt).toLocaleString()}</span>
                </div>
                {cr.status === 'REJECTED' && cr.reviewNote && (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(229, 62, 62, 0.06)',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    color: '#c53030',
                    borderLeft: '3px solid #e53e3e',
                  }}>
                    <strong>Review note:</strong> {cr.reviewNote}
                  </div>
                )}
                {cr.status === 'APPROVED' && cr.reviewedBy && (
                  <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#38a169' }}>
                    Approved by {cr.reviewedBy.slice(0, 8)}... on {new Date(cr.reviewedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
