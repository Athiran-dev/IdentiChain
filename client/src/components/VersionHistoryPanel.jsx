import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../api';
import { Clock, CheckCircle, ExternalLink, X } from 'lucide-react';

export default function VersionHistoryPanel({ tokenId, onClose, onViewVersion }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchVersions() {
      try {
        const token = sessionStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/asset/${tokenId}/versions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch version history');
        }
        
        setVersions(data.versions);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchVersions();
  }, [tokenId]);

  return (
    <div className="glass-card-secondary" style={{ padding: '2rem', position: 'relative' }}>
      <button 
        onClick={onClose}
        className="btn-outline" 
        style={{ position: 'absolute', top: '1rem', right: '1rem', padding: '0.5rem' }}
      >
        <X size={16} />
      </button>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <Clock className="text-primary-blue" size={24} />
        <h3 style={{ margin: 0 }}>Version History (NFT #{tokenId})</h3>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading versions...</div>
      ) : error ? (
        <div style={{ padding: '1rem', color: '#e53e3e', background: 'rgba(229, 62, 62, 0.1)', borderRadius: '8px' }}>
          {error}
        </div>
      ) : versions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          No version history found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {versions.map((v, index) => {
            const isCurrent = index === 0;
            return (
              <div 
                key={v.version} 
                style={{ 
                  padding: '1.5rem', 
                  background: 'var(--neo-bg)', 
                  borderRadius: '12px', 
                  boxShadow: 'var(--neo-inset)',
                  border: isCurrent ? '1px solid var(--primary-blue)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Version {v.version}</h4>
                      {isCurrent && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', background: 'var(--primary-blue)', color: 'white', borderRadius: '12px' }}>
                          CURRENT
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {new Date(v.timestamp).toLocaleString()}
                    </div>
                  </div>
                  
                  {onViewVersion && (
                    <button 
                      onClick={() => onViewVersion(v.version)}
                      className="btn-outline" 
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <ExternalLink size={14} /> Open
                    </button>
                  )}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Edited By:</div>
                  <div style={{ fontFamily: 'monospace' }}>{v.editedBy || 'Unknown'}</div>
                  
                  <div style={{ color: 'var(--text-muted)' }}>File Hash:</div>
                  <div style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{v.hash}</div>
                  
                  <div style={{ color: 'var(--text-muted)' }}>Tx Hash:</div>
                  <div style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    <a href={`https://sepolia.etherscan.io/tx/${v.transactionHash}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-light)', textDecoration: 'none' }}>
                      {v.transactionHash}
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
