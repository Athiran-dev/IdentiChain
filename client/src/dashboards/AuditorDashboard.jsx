import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { apiFetch } from '../api';
import { List, Download, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import ThreatDetectionPanel from '../components/ThreatDetectionPanel';
import { getGreeting } from '../utils';

export default function AuditorDashboard() {
  const { identity } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [role, setRole] = useState('ALL');
  const [actor, setActor] = useState('');
  const [timeframe, setTimeframe] = useState('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  
  const [expandedLogId, setExpandedLogId] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      let query = `?role=${role}`;
      if (actor) query += `&actor=${actor}`;
      
      if (timeframe !== 'ALL') {
        const now = new Date();
        let start = new Date();
        if (timeframe === 'TODAY') {
          start.setHours(0,0,0,0);
        } else if (timeframe === 'MONTH') {
          start.setMonth(now.getMonth() - 1);
        } else if (timeframe === 'QUARTER') {
          start.setMonth(now.getMonth() - 3);
        } else if (timeframe === 'CUSTOM') {
          if (customStart) query += `&startDate=${new Date(customStart).toISOString()}`;
          if (customEnd) {
             const end = new Date(customEnd);
             query += `&endDate=${end.toISOString()}`;
          }
        }
        
        if (timeframe !== 'CUSTOM') {
           query += `&startDate=${start.toISOString()}`;
        }
      }

      const res = await apiFetch(`/api/audit/log${query}`);
      setLogs(res.logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [role, timeframe]);

  const handleApplyFilters = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleDownloadCSV = () => {
    let query = `?role=${role}`;
    if (actor) query += `&actor=${actor}`;
    
    if (timeframe !== 'ALL') {
      const now = new Date();
      let start = new Date();
      if (timeframe === 'TODAY') {
        start.setHours(0,0,0,0);
      } else if (timeframe === 'MONTH') {
        start.setMonth(now.getMonth() - 1);
      } else if (timeframe === 'QUARTER') {
        start.setMonth(now.getMonth() - 3);
      } else if (timeframe === 'CUSTOM') {
        if (customStart) query += `&startDate=${new Date(customStart).toISOString()}`;
        if (customEnd) {
           const end = new Date(customEnd);
           query += `&endDate=${end.toISOString()}`;
        }
      }
      if (timeframe !== 'CUSTOM') {
         query += `&startDate=${start.toISOString()}`;
      }
    }
    
    const token = sessionStorage.getItem('token');
    const url = `${import.meta.env.VITE_API_BASE_URL || 'https://identichain-backend.onrender.com'}/api/audit/export${query}`;
    
    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.blob())
    .then(blob => {
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    })
    .catch(err => alert("Failed to download: " + err.message));
  };

  const formatActionSentence = (log) => {
    const actorStr = (
      <>
        <span style={{ fontWeight:'600', color:'var(--primary-dark)' }}>{log.actorName}</span>
        <span style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginLeft:'0.25rem' }}>({log.actorRole})</span>
      </>
    );
    
    if (!log.target) {
       if (log.actionType === 'DOCUMENT_MINTED') {
           return <>{actorStr} <span style={{ margin:'0 0.5rem', color:'var(--text-muted)' }}>minted a new document</span></>;
       }
       return <>{actorStr} <span style={{ margin:'0 0.5rem', color:'var(--text-muted)' }}>performed {log.actionType}</span></>;
    }

    const isSelf = log.actor && log.target && log.target.toLowerCase() === log.actor.toLowerCase();
    
    let targetStr;
    if (isSelf) {
       targetStr = <span style={{ fontWeight:'600', color:'var(--primary-dark)' }}>self</span>;
    } else {
       targetStr = (
         <>
           <span style={{ fontWeight:'600', color:'var(--primary-dark)' }}>{log.targetName}</span>
           {log.targetRole && <span style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginLeft:'0.25rem' }}>({log.targetRole})</span>}
         </>
       );
    }

    if (log.actionType === 'ACCESS_GRANTED') {
       const permMatch = log.details.match(/Granted (VIEW|EDIT)/i);
       const perm = permMatch ? permMatch[1].toUpperCase() : 'access';
       return <>{actorStr} <span style={{ margin:'0 0.5rem', color:'var(--text-muted)' }}>granted {perm} permission to</span> {targetStr}</>;
    }
    
    if (log.actionType === 'ACCESS_REVOKED') {
       return <>{actorStr} <span style={{ margin:'0 0.5rem', color:'var(--text-muted)' }}>revoked access from</span> {targetStr}</>;
    }
    
    if (log.actionType === 'ROLE_APPROVED') {
       return <>{actorStr} <span style={{ margin:'0 0.5rem', color:'var(--text-muted)' }}>approved role for</span> {targetStr}</>;
    }
    
    return <>{actorStr} <span style={{ margin:'0 0.5rem', color:'var(--text-muted)' }}>acted upon</span> {targetStr}</>;
  };

  return (
    <div style={{ padding: '2rem 0' }}>
      {/* Top Header */}
      <div className="glass-card-primary dashboard-header-flex" style={{ padding: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            {getGreeting()}, {identity?.profile?.name || 'Auditor'} <span style={{ fontSize: '0.8rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-blue)', padding: '4px 10px', borderRadius: '12px', verticalAlign: 'middle', marginLeft: '1rem' }}>Auditor Clearance</span>
          </h1>
          <div style={{ color: 'var(--text-muted)' }}>Organization Security Overview — Unit: Compliance & Audit</div>
        </div>
        <button className="btn-primary" onClick={handleDownloadCSV}>
          <span><Download size={16} /> Export to CSV</span>
        </button>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <ThreatDetectionPanel viewRole="AUDITOR" />
      </div>
      
      {/* FILTERS */}
      <div className="glass-card-primary" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Filter size={18}/> Filters</h4>
        <form onSubmit={handleApplyFilters} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ display:'block', fontSize:'0.85rem', marginBottom:'0.5rem', fontWeight:'600' }}>Timeframe</label>
            <select disabled={loading} value={timeframe} onChange={e => setTimeframe(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: 'none', background: 'var(--neo-bg)' }}>
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="MONTH">Last 30 Days</option>
              <option value="QUARTER">Last 90 Days</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
          </div>
          
          {timeframe === 'CUSTOM' && (
             <>
               <div>
                 <label style={{ display:'block', fontSize:'0.85rem', marginBottom:'0.5rem', fontWeight:'600' }}>Start Date & Time</label>
                 <input disabled={loading} type="datetime-local" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: 'none', background: 'var(--neo-bg)' }} />
               </div>
               <div>
                 <label style={{ display:'block', fontSize:'0.85rem', marginBottom:'0.5rem', fontWeight:'600' }}>End Date & Time</label>
                 <input disabled={loading} type="datetime-local" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: 'none', background: 'var(--neo-bg)' }} />
               </div>
             </>
          )}

          <div>
            <label style={{ display:'block', fontSize:'0.85rem', marginBottom:'0.5rem', fontWeight:'600' }}>Role Filter</label>
            <select disabled={loading} value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: 'none', background: 'var(--neo-bg)' }}>
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="EMPLOYEE">Employee</option>
              <option value="AUDITOR">Auditor</option>
            </select>
          </div>
          
          <div>
            <label style={{ display:'block', fontSize:'0.85rem', marginBottom:'0.5rem', fontWeight:'600' }}>Specific Person (Wallet)</label>
            <input disabled={loading} type="text" placeholder="0x..." value={actor} onChange={e => setActor(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: 'none', background: 'var(--neo-bg)' }} />
          </div>
          
          <div>
             <button disabled={loading} type="submit" className="btn-outline" style={{ width:'100%', padding:'0.5rem' }}>
                {loading ? 'Applying...' : 'Apply Filters'}
             </button>
          </div>
        </form>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading audit logs...</div>
      ) : (
        <div className="glass-card-primary" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <List size={20} /> System Audit Logs
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {logs.map(log => {
              const isExpanded = expandedLogId === log._id;
              return (
                <div key={log._id} className="glass-card-secondary" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  
                  {/* SUMMARY ROW */}
                  <div className="dashboard-log-list-grid">
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--primary-dark)', fontSize: '0.95rem' }}>{log.actionType}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                    
                    <div style={{ fontSize: '0.9rem' }}>
                      <div>
                        {formatActionSentence(log)}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{log.details}</div>
                    </div>
                    
                    <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                      {log.tokenId && <div style={{ fontWeight:'600' }}>Token #{log.tokenId}</div>}
                    </div>

                    <div>
                      <button onClick={() => setExpandedLogId(isExpanded ? null : log._id)} style={{ background:'transparent', border:'none', cursor:'pointer', color:'var(--primary-blue)' }}>
                        {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                      </button>
                    </div>
                  </div>

                  {/* EXPANDED DETAILS */}
                  {isExpanded && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)', fontSize: '0.85rem', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                      <div>
                        <div style={{ marginBottom:'0.5rem' }}><strong>Exact Timestamp:</strong> {log.timestamp ? new Date(log.timestamp).toISOString() : 'N/A'}</div>
                        <div style={{ marginBottom:'0.5rem' }}><strong>Actor Wallet:</strong> <span style={{ fontFamily:'monospace' }}>{log.actor}</span></div>
                        {log.target && <div style={{ marginBottom:'0.5rem' }}><strong>Target Address:</strong> <span style={{ fontFamily:'monospace' }}>{log.target}</span></div>}
                      </div>
                      <div>
                         {log.transactionHash && (
                          <div style={{ marginBottom:'0.5rem' }}>
                            <strong>Transaction:</strong> <a href={`https://sepolia.etherscan.io/tx/${log.transactionHash}`} target="_blank" rel="noreferrer" style={{ color:'var(--primary-blue)', fontFamily:'monospace', wordBreak:'break-all' }}>{log.transactionHash}</a>
                          </div>
                        )}
                        <div style={{ marginBottom:'0.5rem' }}><strong>Full Details:</strong> {log.details}</div>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
            {logs.length === 0 && <div style={{color:'var(--text-muted)', textAlign:'center'}}>No audit logs found.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
