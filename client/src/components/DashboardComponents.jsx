import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, Clock, FileText, Share2, Eye, Key } from 'lucide-react';

export function VerificationBadge({ integrityVerified, hash }) {
  if (integrityVerified === null || integrityVerified === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
        <Clock size={16} /> <span>Unverified</span>
      </div>
    );
  }

  // Handle both boolean and string "true"/"false" based on backend response bug
  const isVerified = String(integrityVerified) === 'true';

  if (isVerified) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-green)' }}>
        <ShieldCheck size={16} /> <span>Verified (Valid Hash)</span>
      </div>
    );
  } else {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e53e3e' }}>
        <ShieldAlert size={16} /> <span>Tampered! (Hash Mismatch)</span>
      </div>
    );
  }
}

export function DocumentCard({ doc, onAccess, actionButtons, grantInfo }) {
  const remainingViews = grantInfo && grantInfo.maxViews != null
    ? grantInfo.maxViews - (grantInfo.viewsUsed || 0)
    : null;

  return (
    <div className="glass-card-primary" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{doc.name || `Document #${doc.tokenId}`}</h3>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>CID: {doc.currentCID?.slice(0, 8)}...{doc.currentCID?.slice(-8)}</div>
        </div>
        <div style={{ background: 'var(--neo-bg)', padding: '4px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 'bold', boxShadow: 'var(--neo-inset)' }}>
          ID: {doc.tokenId}
        </div>
      </div>
      
      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <div><strong>Owner:</strong> {doc.owner?.slice(0, 6)}...{doc.owner?.slice(-4)}</div>
        <div><strong>Version:</strong> {doc.version}</div>
        <div><strong>Access Level:</strong> {doc.accessLevel || 'NONE'}</div>
      </div>

      {/* View limit badge */}
      {remainingViews !== null && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.35rem 0.75rem',
          borderRadius: '6px',
          fontSize: '0.78rem',
          fontWeight: 600,
          background: remainingViews <= 0 ? 'rgba(229, 62, 62, 0.1)' : remainingViews <= 2 ? 'rgba(214, 158, 46, 0.1)' : 'rgba(72, 187, 120, 0.1)',
          color: remainingViews <= 0 ? '#e53e3e' : remainingViews <= 2 ? '#d69e2e' : '#38a169',
        }}>
          <Eye size={13} />
          {remainingViews <= 0
            ? 'No views remaining'
            : `${remainingViews} of ${grantInfo.maxViews} views remaining`
          }
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
        {onAccess && (
          <button className="btn-primary" onClick={() => onAccess(doc)} style={{ padding: '0.5em 1em', fontSize: '0.85rem', flex: 1 }}>
            <span><Eye size={14} /> View / Verify</span>
          </button>
        )}
        {actionButtons}
      </div>
    </div>
  );
}

export function TxStatusToast({ status, hash, error }) {
  if (!status) return null;

  return (
    <div className="glass-card-secondary" style={{ 
      position: 'fixed', bottom: '2rem', right: '2rem', padding: '1.5rem', 
      width: '350px', zIndex: 1000,
      borderLeft: status === 'error' ? '4px solid #e53e3e' : status === 'success' ? '4px solid #38a169' : '4px solid #3182ce'
    }}>
      <h4 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {status === 'pending' && <Clock size={16} />}
        {status === 'success' && <ShieldCheck size={16} color="#38a169" />}
        {status === 'error' && <ShieldAlert size={16} color="#e53e3e" />}
        {status === 'pending' ? 'Transaction Pending...' : status === 'success' ? 'Transaction Confirmed' : 'Transaction Failed'}
      </h4>
      {hash && (
        <div style={{ fontSize: '0.8rem', wordBreak: 'break-all', marginBottom: '0.5rem' }}>
          Hash: <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noreferrer">{hash}</a>
        </div>
      )}
      {error && <div style={{ fontSize: '0.8rem', color: '#e53e3e' }}>{error}</div>}
    </div>
  );
}
