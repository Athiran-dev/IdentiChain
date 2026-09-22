import React, { useState, useEffect } from 'react';
import { apiFetch, API_BASE_URL } from '../api';
import DiffViewerModal from './DiffViewerModal';
import { GitPullRequest, Eye, CheckCircle, XCircle, AlertTriangle, Clock, Loader } from 'lucide-react';

/**
 * Manager/Admin panel for reviewing pending change requests on a document.
 *
 * Props:
 *   tokenId         — document token ID
 *   assetName       — document name (for display)
 *   onApprove       — callback({ tokenId, metadataCID, changeRequestId }) → triggers Wagmi tx
 *   isPending       — from useWriteContract (disable buttons while tx pending)
 *   isConfirming    — from useWaitForTransactionReceipt
 */
export default function ChangeRequestPanel({ tokenId, assetName, onApprove, isPending, isConfirming }) {
  const [changeRequests, setChangeRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectNote, setRejectNote] = useState('');

  // Diff viewer state
  const [diffState, setDiffState] = useState(null); // { current, proposed, fileType, fileName, versionWarning, changeRequest }

  const fetchCRs = async () => {
    try {
      const res = await apiFetch(`/api/asset/${tokenId}/change-requests`);
      setChangeRequests(res.changeRequests);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCRs();
  }, [tokenId]);

  const handleViewDiff = async (cr) => {
    try {
      const res = await apiFetch(`/api/asset/change-request/${cr._id}/preview`);
      setDiffState({
        currentContent: res.current.content,
        proposedContent: res.proposed.content,
        fileType: res.current.fileType,
        fileName: cr.name,
        versionWarning: res.versionWarning,
        changeRequest: res.changeRequest,
      });
    } catch (e) {
      alert(`Failed to load diff: ${e.message}`);
    }
  };

  const handleApprove = async (cr) => {
    try {
      const res = await apiFetch(`/api/asset/change-request/${cr._id}/approve`, {
        method: 'POST',
      });
      if (res.versionWarning) {
        if (!window.confirm(`⚠️ ${res.versionWarning}\n\nProceed anyway?`)) {
          return;
        }
      }
      // Trigger on-chain tx via parent
      onApprove({
        tokenId: res.tokenId,
        metadataCID: res.metadataCID,
        changeRequestId: cr._id,
      });
    } catch (e) {
      alert(`Approve failed: ${e.message}`);
    }
  };

  const handleReject = async (crId) => {
    try {
      await apiFetch(`/api/asset/change-request/${crId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reviewNote: rejectNote }),
      });
      setRejectingId(null);
      setRejectNote('');
      fetchCRs();
    } catch (e) {
      alert(`Reject failed: ${e.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Loader size={16} className="spin-animation" /> Loading change requests...
      </div>
    );
  }

  if (changeRequests.length === 0) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        No pending change requests for this document.
      </div>
    );
  }

  return (
    <div>
      <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <GitPullRequest size={18} />
        Pending Changes ({changeRequests.length})
      </h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {changeRequests.map((cr) => (
          <div
            key={cr._id}
            className="glass-card-secondary"
            style={{ padding: '1rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={14} color="#d69e2e" />
                  Change from {cr.submittedBy?.slice(0, 10)}...
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Based on v{cr.baseVersion} · Submitted {new Date(cr.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Base version mismatch warning */}
            {cr.baseVersion !== undefined && (
              <div id={`cr-warning-${cr._id}`} />
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button
                className="btn-outline"
                onClick={() => handleViewDiff(cr)}
                style={{ padding: '0.4em 0.8em', fontSize: '0.8rem' }}
              >
                <span><Eye size={14} /> View Diff</span>
              </button>
              <button
                className="btn-primary"
                onClick={() => handleApprove(cr)}
                disabled={isPending || isConfirming}
                style={{ padding: '0.4em 0.8em', fontSize: '0.8rem' }}
              >
                <span><CheckCircle size={14} /> Approve</span>
              </button>
              {rejectingId === cr._id ? (
                <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                  <input
                    type="text"
                    placeholder="Reason (optional)"
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.4rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(229,62,62,0.3)',
                      fontSize: '0.8rem',
                      fontFamily: 'inherit',
                    }}
                  />
                  <button
                    className="btn-outline"
                    onClick={() => handleReject(cr._id)}
                    style={{ padding: '0.4em 0.8em', fontSize: '0.8rem', color: '#e53e3e' }}
                  >
                    <span>Confirm</span>
                  </button>
                  <button
                    className="btn-outline"
                    onClick={() => { setRejectingId(null); setRejectNote(''); }}
                    style={{ padding: '0.4em 0.8em', fontSize: '0.8rem' }}
                  >
                    <span>Cancel</span>
                  </button>
                </div>
              ) : (
                <button
                  className="btn-outline"
                  onClick={() => setRejectingId(cr._id)}
                  style={{ padding: '0.4em 0.8em', fontSize: '0.8rem', color: '#e53e3e' }}
                >
                  <span><XCircle size={14} /> Reject</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Diff viewer modal */}
      {diffState && (
        <DiffViewerModal
          currentContent={diffState.currentContent}
          proposedContent={diffState.proposedContent}
          fileType={diffState.fileType}
          fileName={diffState.fileName}
          versionWarning={diffState.versionWarning}
          changeRequest={diffState.changeRequest}
          onClose={() => setDiffState(null)}
        />
      )}
    </div>
  );
}
