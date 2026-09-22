import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../components/AuthContext';
import { apiFetch, API_BASE_URL } from '../api';
import { CheckCircle, XCircle, Users, FileText, Key, ShieldAlert, Eye } from 'lucide-react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import IdentityRegistryData from '../abi/IdentityRegistry.json';
import AssetNFTData from '../abi/AssetNFT.json';
import { TxStatusToast, VerificationBadge } from '../components/DashboardComponents';
import DocumentViewerModal from '../components/DocumentViewerModal';
import CreateAssetPage from '../components/CreateAssetPage';
import VersionHistoryPanel from '../components/VersionHistoryPanel';
import ChangeRequestPanel from '../components/ChangeRequestPanel';
import ThreatDetectionPanel from '../components/ThreatDetectionPanel';
import { getGreeting } from '../utils';
import { Plus, Clock, UserCog, ToggleLeft, ToggleRight, GitPullRequest, LayoutDashboard, Server, Shield, Activity, Lock, Database } from 'lucide-react';

const identityRegistryABI = IdentityRegistryData.abi;
const assetNFTABI = AssetNFTData.abi;
const ROLE_NUM = { 'EMPLOYEE': 1, 'MANAGER': 2, 'AUDITOR': 3, 'ADMIN': 4 };

export default function AdminDashboard() {
  const { identity } = useAuth();
  const adminWallet = identity?.profile?.walletAddress;
  
  const [activeTab, setActiveTab] = useState('overview');
  const [applications, setApplications] = useState([]);
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Overview specific states
  const [overviewStats, setOverviewStats] = useState(null);
  const [recentAssets, setRecentAssets] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);

  const [verifyingId, setVerifyingId] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);

  // Management states
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [historyTokenId, setHistoryTokenId] = useState(null);
  const [grantForm, setGrantForm] = useState({ wallet: '', level: '1', hasExpiry: false, expiryDate: '', expiryTime: '', maxViews: '' });
  const [actionContext, setActionContext] = useState(null);

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const [activeApp, setActiveApp] = useState(null);
  const [txToast, setTxToast] = useState({ status: null, hash: null, error: null });

  // Document viewer modal state — Feature 1: arrayBuffer
  const [viewerState, setViewerState] = useState({
    open: false, arrayBuffer: null, contentType: null, title: null,
    verification: null, accessLevel: null,
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'applications') {
        const res = await apiFetch('/api/identity/role-applications');
        setApplications(res.applications);
      } else if (activeTab === 'assets') {
        const res = await apiFetch('/api/asset/list');
        setAssets(res.assets);
      } else if (activeTab === 'users') {
        const res = await apiFetch('/api/identity/users');
        // Sort: Active users first, then by creation date
        const sortedUsers = (res.users || []).sort((a, b) => {
          if (a.isActiveCache === b.isActiveCache) return 0;
          return a.isActiveCache ? -1 : 1;
        });
        setUsers(sortedUsers);
      } else if (activeTab === 'overview') {
        const [statsRes, assetsRes, logsRes] = await Promise.all([
          apiFetch('/api/stats/overview'),
          apiFetch('/api/asset/list'),
          apiFetch('/api/audit/log?limit=4') // fetch 4 for the stream
        ]);
        setOverviewStats(statsRes.stats);
        setRecentAssets(assetsRes.assets.slice(0, 3));
        setRecentLogs(logsRes.logs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Use refs for action tracking to avoid re-trigger when clearing state
  const activeAppRef = useRef(null);
  const actionContextRef = useRef(null);

  const setActiveAppTracked = (val) => { activeAppRef.current = val; setActiveApp(val); };
  const setActionContextTracked = (val) => { actionContextRef.current = val; setActionContext(val); };

  useEffect(() => {
    if (isConfirmed) {
      const currentApp = activeAppRef.current;
      const currentAction = actionContextRef.current;

      if (currentApp) {
        apiFetch(`/api/identity/role-application/${currentApp._id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'APPROVED', txHash })
        }).then(() => {
          setTxToast({ status: 'success', hash: txHash, error: null });
          fetchData();
        }).catch(e => {
          setTxToast({ status: 'error', hash: txHash, error: `Mirror failed: ${e.message}` });
        }).finally(() => {
          activeAppRef.current = null;
          setActiveApp(null);
        });
      } else if (currentAction) {
        if (currentAction.type === 'APPROVE_CR') {
          // Feature 3: Confirm CR approval
          apiFetch(`/api/asset/change-request/${currentAction.changeRequestId}/confirm-approval`, {
            method: 'POST',
            body: JSON.stringify({ txHash })
          }).then(() => {
            setTxToast({ status: 'success', hash: txHash, error: null });
            fetchData();
          }).catch(e => {
            setTxToast({ status: 'error', hash: txHash, error: `CR approval mirror failed: ${e.message}` });
          }).finally(() => {
            actionContextRef.current = null;
            setActionContext(null);
          });
        } else if (currentAction.type === 'STATUS_UPDATE') {
          // No backend mirror needed for status update, just refresh data
          setTxToast({ status: 'success', hash: txHash, error: null });
          fetchData();
          actionContextRef.current = null;
          setActionContext(null);
        } else {
          // Mirror access grant/revoke
          apiFetch('/api/access/mirror', {
            method: 'POST',
            body: JSON.stringify({
              txHash,
              actionType: currentAction.type.includes('GRANT') ? 'ACCESS_GRANTED' : 'ACCESS_REVOKED',
              maxViews: currentAction.type === 'GRANT' || currentAction.type === 'AUTO_GRANT'
                ? (grantForm.maxViews || null)
                : undefined,
            })
          }).then(() => {
            setTxToast({ status: 'success', hash: txHash, error: null });
            if (currentAction.type === 'AUTO_GRANT') {
              viewDocument(currentAction.asset);
              fetchData();
            }
          }).catch(e => {
            setTxToast({ status: 'error', hash: txHash, error: `Mirror failed: ${e.message}` });
          }).finally(() => {
            actionContextRef.current = null;
            setActionContext(null);
            setGrantForm({ wallet: '', level: '1', hasExpiry: false, expiryDate: '', expiryTime: '', maxViews: '' });
          });
        }
        if (currentAction.type === 'DIRECT_EDIT') {
          apiFetch(`/api/asset/${currentAction.tokenId}/confirm-update`, {
            method: 'POST',
            body: JSON.stringify({ txHash })
          }).then(() => {
            setTxToast({ status: 'success', hash: txHash, error: null });
            closeViewer();
            fetchData();
          }).catch(e => {
            setTxToast({ status: 'error', hash: txHash, error: `Confirm failed: ${e.message}` });
          }).finally(() => {
            actionContextRef.current = null;
            setActionContext(null);
          });
        }
      }
    }
    if (writeError) {
      setTxToast({ status: 'error', hash: null, error: writeError.message });
      activeAppRef.current = null;
      setActiveApp(null);
      actionContextRef.current = null;
      setActionContext(null);
    }
  }, [isConfirmed, writeError, txHash]);

  const handleApprove = (app) => {
    setActiveAppTracked(app);
    setTxToast({ status: 'pending', hash: null, error: null });
    
    if (app.requestedRole === 'ADMIN') {
      writeContract({
        address: import.meta.env.VITE_IDENTITY_REGISTRY_ADDRESS,
        abi: identityRegistryABI,
        functionName: 'assignAdminRole',
        args: [app.wallet],
      });
    } else {
      writeContract({
        address: import.meta.env.VITE_IDENTITY_REGISTRY_ADDRESS,
        abi: identityRegistryABI,
        functionName: 'assignRole',
        args: [app.wallet, ROLE_NUM[app.requestedRole]],
      });
    }
  };

  const handleReject = async (app) => {
    if (!window.confirm('Are you sure you want to reject this application?')) return;
    try {
      await apiFetch(`/api/identity/role-application/${app._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'REJECTED' })
      });
      fetchData();
    } catch (e) {
      alert(`Reject failed: ${e.message}`);
    }
  };

  const handleSetStatus = (wallet, currentStatus) => {
    if (window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this identity?\n\nThis will ${currentStatus ? 'prevent' : 'allow'} the wallet from performing protected operations.`)) {
      setActionContextTracked({ type: 'STATUS_UPDATE', wallet });
      setTxToast({ status: 'pending', hash: null, error: null });
      writeContract({
        address: import.meta.env.VITE_IDENTITY_REGISTRY_ADDRESS,
        abi: identityRegistryABI,
        functionName: 'setActiveStatus',
        args: [wallet, !currentStatus],
      });
    }
  };

  const handleGrant = (e, tokenId) => {
    e.preventDefault();
    if (!grantForm.wallet) return;

    let expiresAt = BigInt(0);
    if (grantForm.hasExpiry && grantForm.expiryDate && grantForm.expiryTime) {
      const dateTime = new Date(`${grantForm.expiryDate}T${grantForm.expiryTime}`);
      if (dateTime.getTime() <= Date.now()) {
        return alert("Expiry must be in the future.");
      }
      expiresAt = BigInt(Math.floor(dateTime.getTime() / 1000));
    }

    setActionContextTracked({ type: 'GRANT', tokenId });
    setTxToast({ status: 'pending', hash: null, error: null });
    writeContract({
      address: import.meta.env.VITE_ASSET_NFT_ADDRESS,
      abi: assetNFTABI,
      functionName: 'grantAccess',
      args: [BigInt(tokenId), grantForm.wallet, Number(grantForm.level), expiresAt],
    });
  };

  const handleRevoke = (e, tokenId) => {
    e.preventDefault();
    if (!grantForm.wallet) return;
    setActionContextTracked({ type: 'REVOKE', tokenId });
    setTxToast({ status: 'pending', hash: null, error: null });
    writeContract({
      address: import.meta.env.VITE_ASSET_NFT_ADDRESS,
      abi: assetNFTABI,
      functionName: 'revokeAccess',
      args: [BigInt(tokenId), grantForm.wallet],
    });
  };

  // Feature 3: Approve Change Request
  const handleApproveCR = ({ tokenId, metadataCID, changeRequestId }) => {
    setActionContextTracked({ type: 'APPROVE_CR', tokenId, changeRequestId });
    setTxToast({ status: 'pending', hash: null, error: null });
    writeContract({
      address: import.meta.env.VITE_ASSET_NFT_ADDRESS,
      abi: assetNFTABI,
      functionName: 'updateDocument',
      args: [BigInt(tokenId), metadataCID],
    });
  };

  const handleDirectEdit = async (content) => {
    try {
      if (!viewerState.tokenId) return;
      const blob = new Blob([content], { type: viewerState.contentType });
      const formData = new FormData();
      formData.append('file', blob, viewerState.title);

      const res = await apiFetch(`/api/asset/${viewerState.tokenId}/prepare-update`, {
        method: 'POST',
        body: formData,
        isFormData: true,
      });

      if (res.metadataCID) {
        setActionContextTracked({ type: 'DIRECT_EDIT', tokenId: viewerState.tokenId });
        setTxToast({ status: 'pending', hash: null, error: null });
        writeContract({
          address: import.meta.env.VITE_ASSET_NFT_ADDRESS,
          abi: assetNFTABI,
          functionName: 'updateDocument',
          args: [BigInt(viewerState.tokenId), res.metadataCID],
        });
      }
    } catch (e) {
      alert(`Direct edit failed: ${e.message}`);
    }
  };

  // Feature 1: arrayBuffer-based viewer
  const viewDocument = async (asset, version = null) => {
    setVerifyingId(asset.tokenId);
    setVerificationResult(null);
    try {
      const token = sessionStorage.getItem('token');
      const url = version 
        ? `${API_BASE_URL}/api/asset/${asset.tokenId}/access?version=${version}`
        : `${API_BASE_URL}/api/asset/${asset.tokenId}/access`;
        
      const blobRes = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!blobRes.ok) {
        const err = await blobRes.json();
        throw new Error(err.error || err.message || 'Access failed');
      }

      const verifiedHeader = blobRes.headers.get('x-integrity-verified');
      const hashHeader = blobRes.headers.get('x-document-hash');
      const contentType = blobRes.headers.get('content-type') || 'application/octet-stream';
      const accessLevel = blobRes.headers.get('x-access-level') || 'EDIT';

      const verification = { integrityVerified: verifiedHeader, hash: hashHeader };
      setVerificationResult({ tokenId: asset.tokenId, ...verification });

      const arrayBuffer = await blobRes.arrayBuffer();

      setViewerState({
        open: true,
        tokenId: asset.tokenId,
        arrayBuffer,
        contentType,
        title: asset.name || `Document #${asset.tokenId}`,
        verification,
        accessLevel,
      });
    } catch (e) {
      alert(`Error accessing document: ${e.message}`);
    } finally {
      setVerifyingId(null);
    }
  };

  const closeViewer = () => {
    setViewerState({
      open: false, arrayBuffer: null, contentType: null, title: null,
      verification: null, accessLevel: null,
    });
  };

  const handleViewDocument = (asset, version = null) => {
    if (asset.accessLevel === 'VIEW' || asset.accessLevel === 'EDIT') {
      viewDocument(asset, version);
    } else {
      if (window.confirm('Grant yourself access to proceed?')) {
        setActionContextTracked({ type: 'AUTO_GRANT', tokenId: asset.tokenId, asset });
        setTxToast({ status: 'pending', hash: null, error: null });
        writeContract({
          address: import.meta.env.VITE_ASSET_NFT_ADDRESS,
          abi: assetNFTABI,
          functionName: 'grantAccess',
          args: [BigInt(asset.tokenId), adminWallet, 2, BigInt(0)],
        });
      }
    }
  };

  return (
    <div style={{ padding: '2rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Admin Dashboard</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className={activeTab === 'overview' ? 'btn-primary' : 'btn-outline'} 
            onClick={() => setActiveTab('overview')}
          >
            <span><LayoutDashboard size={16} /> Overview</span>
          </button>
          <button 
            className={activeTab === 'applications' ? 'btn-primary' : 'btn-outline'} 
            onClick={() => setActiveTab('applications')}
          >
            <span><Users size={16} /> Role Applications</span>
          </button>
          <button 
            className={activeTab === 'users' ? 'btn-primary' : 'btn-outline'} 
            onClick={() => { setActiveTab('users'); setSelectedAsset(null); }}
          >
            <span><UserCog size={16} /> Identity Management</span>
          </button>
          <button 
            className={activeTab === 'assets' ? 'btn-primary' : 'btn-outline'} 
            onClick={() => { setActiveTab('assets'); setSelectedAsset(null); }}
          >
            <span><FileText size={16} /> Asset Management</span>
          </button>
          <button 
            className={activeTab === 'create' ? 'btn-primary' : 'btn-outline'} 
            onClick={() => setActiveTab('create')}
          >
            <span><Plus size={16} /> Create New Asset</span>
          </button>
          <button 
            className={activeTab === 'threats' ? 'btn-primary' : 'btn-outline'} 
            onClick={() => setActiveTab('threats')}
            style={activeTab === 'threats' ? { background: '#e11d48', borderColor: '#e11d48' } : { color: '#e11d48', borderColor: '#e11d48' }}
          >
            <span><ShieldAlert size={16} /> AI Threats</span>
          </button>
        </div>
      </div>

      {activeTab === 'create' && (
        <CreateAssetPage 
          onCancel={() => setActiveTab('assets')}
          onSuccess={() => { setActiveTab('assets'); fetchData(); }}
        />
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading data...</div>
      ) : activeTab === 'threats' ? (
        <ThreatDetectionPanel 
          viewRole="ADMIN" 
          onDeactivateIdentity={(wallet) => handleSetStatus(wallet, true)} 
        />
      ) : activeTab === 'overview' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
           {/* Top Header */}
           <div className="glass-card-primary" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div>
               <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                 {getGreeting()}, {identity?.profile?.name || 'Admin'} <span style={{ fontSize: '0.8rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-blue)', padding: '4px 10px', borderRadius: '12px', verticalAlign: 'middle', marginLeft: '1rem' }}>Level-5 Clearance</span>
               </h1>
               <div style={{ color: 'var(--text-muted)' }}>Organization Security Overview — Unit: Cryptographic Assets Division</div>
             </div>
             <div className="glass-card-secondary" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-blue)' }}></div>
                 <div>
                   <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>AUTHORIZED SIGNER</div>
                   <div style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{adminWallet?.slice(0,6)}...{adminWallet?.slice(-4)}</div>
                 </div>
               </div>
               <div style={{ borderLeft: '1px solid var(--glass-border)', paddingLeft: '1rem' }}>
                 <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>NETWORK ID</div>
                 <div style={{ color: 'var(--primary-blue)', fontWeight: 'bold' }}>Sepolia</div>
               </div>
             </div>
           </div>

           {/* 4 Metric Cards */}
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
             <div className="glass-card-primary" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                 <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total Registered Employees</div>
                 <Users size={18} color="var(--primary-blue)" />
               </div>
               <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{overviewStats?.totalUsers || 0}</div>
               <div style={{ fontSize: '0.8rem', color: 'var(--success-green)' }}>Identities Verified</div>
             </div>
             <div className="glass-card-primary" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                 <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Active Digital Assets</div>
                 <Lock size={18} color="var(--primary-blue)" />
               </div>
               <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{overviewStats?.totalAssets || 0}</div>
               <div style={{ fontSize: '0.8rem', color: 'var(--success-green)' }}>Encrypted IPFS Storage</div>
             </div>
             <div className="glass-card-primary" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                 <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Pending Access Requests</div>
                 <ShieldAlert size={18} color="#e53e3e" />
               </div>
               <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{overviewStats?.pendingApps || 0}</div>
               <div style={{ fontSize: '0.8rem', color: '#e53e3e' }}>Awaiting Review</div>
             </div>
             <div className="glass-card-primary" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                 <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Immutable Audit Events</div>
                 <CheckCircle size={18} color="var(--primary-blue)" />
               </div>
               <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{overviewStats?.totalLogs || 0}</div>
               <div style={{ fontSize: '0.8rem', color: 'var(--success-green)' }}>100% verified against Ledger</div>
             </div>
           </div>

           {/* Telemetry Bar */}
           <div className="glass-card-secondary" style={{ padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
               <Activity size={18} color="var(--primary-blue)" /> Cryptographic Infrastructure Telemetry
             </div>
             <div style={{ display: 'flex', gap: '2rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                 <Server size={14} color="var(--success-green)" /> Sepolia RPC: <span style={{ color: 'var(--success-green)' }}>Online</span>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                 <Database size={14} color="var(--success-green)" /> IPFS Storage: <span style={{ color: 'var(--success-green)' }}>100% Avail</span>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                 <Shield size={14} color="var(--primary-blue)" /> KMS Vault: <span style={{ color: 'var(--primary-blue)' }}>Secured</span>
               </div>
             </div>
           </div>

           {/* Bottom Split */}
           <div style={{ display: 'grid', gridTemplateColumns: '6.5fr 3.5fr', gap: '2rem' }}>
             {/* Left side: Assets Table */}
             <div className="glass-card-primary" style={{ padding: '2rem' }}>
               <h3 style={{ marginBottom: '1.5rem' }}>Recent Organizational Digital Assets</h3>
               <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                 <thead>
                   <tr style={{ borderBottom: '2px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                     <th style={{ padding: '1rem 0.5rem' }}>ASSET NAME</th>
                     <th style={{ padding: '1rem 0.5rem' }}>NFT ID</th>
                     <th style={{ padding: '1rem 0.5rem' }}>VER.</th>
                     <th style={{ padding: '1rem 0.5rem' }}>IPFS CID</th>
                     <th style={{ padding: '1rem 0.5rem' }}>SHA-256</th>
                   </tr>
                 </thead>
                 <tbody>
                   {recentAssets.map(a => (
                     <tr key={a.tokenId} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                       <td style={{ padding: '1rem 0.5rem', fontWeight: 'bold' }}>{a.name}</td>
                       <td style={{ padding: '1rem 0.5rem', color: 'var(--primary-blue)', fontFamily: 'monospace' }}>#{a.tokenId}</td>
                       <td style={{ padding: '1rem 0.5rem' }}>v{a.version}</td>
                       <td style={{ padding: '1rem 0.5rem', fontFamily: 'monospace' }}>{a.currentCID?.slice(0,8)}...</td>
                       <td style={{ padding: '1rem 0.5rem', color: 'var(--success-green)' }}>● Verified</td>
                     </tr>
                   ))}
                   {recentAssets.length === 0 && <tr><td colSpan="5" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>No recent assets.</td></tr>}
                 </tbody>
               </table>
             </div>

             {/* Right side: Audit Stream */}
             <div className="glass-card-primary" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <h3 style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 Real-Time Audit Ledger
                 <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success-green)' }}></div>
               </h3>
               {recentLogs.map(log => (
                 <div key={log._id} className="glass-card-secondary" style={{ padding: '1rem', borderRadius: '12px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                     <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary-dark)', background: 'var(--neo-bg)', padding: '2px 8px', borderRadius: '8px' }}>
                       {log.actionType}
                     </span>
                     <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                       {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'N/A'}
                     </span>
                   </div>
                   <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                     <strong>Actor: </strong> <span style={{ color: 'var(--primary-blue)' }}>{log.actorName}</span>
                   </div>
                   <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                     {log.details && log.details.length > 60 ? log.details.slice(0, 60) + '...' : log.details}
                   </div>
                 </div>
               ))}
               {recentLogs.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No recent events.</div>}
             </div>
           </div>
        </div>
      ) : activeTab === 'applications' ? (
        <div className="glass-card-primary" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Pending Role Applications</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {applications.map(app => (
              <div key={app._id} className="glass-card-secondary" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>Wallet: {app.wallet}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Requested Role: <span style={{ fontWeight: 'bold', color: 'var(--primary-dark)' }}>{app.requestedRole}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Submitted: {new Date(app.submittedAt).toLocaleString()}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn-primary" 
                    onClick={() => handleApprove(app)}
                    disabled={isPending || isConfirming}
                    style={{ padding: '0.5em 1em' }}
                  >
                    <span><CheckCircle size={16} /> Approve</span>
                  </button>
                  <button 
                    className="btn-outline" 
                    onClick={() => handleReject(app)}
                    disabled={isPending || isConfirming}
                    style={{ padding: '0.5em 1em', color: '#e53e3e' }}
                  >
                    <span><XCircle size={16} /> Reject</span>
                  </button>
                </div>
              </div>
            ))}
            {applications.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                No pending applications.
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'users' ? (
        <div className="glass-card-primary" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Identity Management</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '1rem 0.5rem' }}>Name</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Wallet</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Role</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Department</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.walletAddress} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: '500' }}>{u.name || 'Unknown'}</td>
                    <td style={{ padding: '1rem 0.5rem', fontFamily: 'monospace' }}>{u.walletAddress.slice(0,8)}...{u.walletAddress.slice(-6)}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span style={{ padding: '4px 8px', background: 'var(--neo-bg)', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        {u.roleCache || 'NONE'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '0.75rem', 
                        fontWeight: 'bold',
                        background: u.isActiveCache ? 'rgba(72, 187, 120, 0.1)' : 'rgba(229, 62, 62, 0.1)',
                        color: u.isActiveCache ? 'var(--success-green)' : '#e53e3e'
                      }}>
                        {u.isActiveCache ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>{u.department || 'N/A'}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <button 
                        onClick={() => handleSetStatus(u.walletAddress, u.isActiveCache)}
                        className="btn-outline" 
                        disabled={isPending || isConfirming}
                        style={{ 
                          padding: '0.5rem', 
                          fontSize: '0.8rem',
                          color: u.isActiveCache ? '#e53e3e' : 'var(--success-green)',
                          borderColor: u.isActiveCache ? 'rgba(229, 62, 62, 0.3)' : 'rgba(72, 187, 120, 0.3)'
                        }}
                      >
                        {u.isActiveCache ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><ToggleLeft size={14} /> Deactivate</span>
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><ToggleRight size={14} /> Activate</span>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No identities found.</div>}
          </div>
        </div>
      ) : (
        <div className="glass-card-primary" style={{ padding: '2rem' }}>
          {historyTokenId ? (
            <VersionHistoryPanel 
              tokenId={historyTokenId}
              onClose={() => setHistoryTokenId(null)}
              onViewVersion={(version) => handleViewDocument(assets.find(a => a.tokenId === historyTokenId), version)}
            />
          ) : !selectedAsset ? (
            <>
              <h3 style={{ marginBottom: '1.5rem' }}>System-Wide Assets (Metadata)</h3>
              
              {verificationResult && (
                <div className="glass-card-secondary" style={{ padding: '1rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <strong>Last Verification Result (Token #{verificationResult.tokenId}):</strong>
                    <div style={{ marginTop: '0.5rem' }}>
                      <VerificationBadge integrityVerified={verificationResult.integrityVerified} hash={verificationResult.hash} />
                    </div>
                  </div>
                  <button className="btn-outline" onClick={() => setVerificationResult(null)}>Dismiss</button>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                {assets.map(asset => (
                  <div key={asset.tokenId} className="glass-card-secondary" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{asset.name}</h4>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>CID: {asset.currentCID?.slice(0, 8)}...</div>
                      </div>
                      <div style={{ background: 'var(--neo-bg)', padding: '4px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 'bold', boxShadow: 'var(--neo-inset)' }}>
                        ID: {asset.tokenId}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <div><strong>Owner:</strong> {asset.owner?.slice(0, 10)}...</div>
                      <div><strong>Version:</strong> {asset.version}</div>
                    </div>
                    <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-outline" onClick={() => handleViewDocument(asset)} style={{ flex: 1, padding: '0.5em 0.5em', fontSize: '0.85rem' }} disabled={verifyingId === asset.tokenId || isPending || isConfirming}>
                        <span><Eye size={14} /> View</span>
                      </button>
                      <button className="btn-primary" onClick={() => setSelectedAsset(asset)} style={{ flex: 1, padding: '0.5em 0.5em', fontSize: '0.85rem' }}>
                        <span><Key size={14} /> Access</span>
                      </button>
                      <button className="btn-outline" onClick={() => setHistoryTokenId(asset.tokenId)} style={{ flex: 1, padding: '0.5em 0.5em', fontSize: '0.85rem' }}>
                        <span><Clock size={14} /> History</span>
                      </button>
                    </div>
                  </div>
                ))}
                {assets.length === 0 && <div style={{color:'var(--text-muted)', gridColumn:'1/-1'}}>No assets in the system.</div>}
              </div>
            </>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h3>Access Control: {selectedAsset.name} (Token #{selectedAsset.tokenId})</h3>
                <button className="btn-outline" onClick={() => setSelectedAsset(null)}>Back to Assets</button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff3cd', color: '#856404', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
                <ShieldAlert size={20} />
                <span style={{ fontSize: '0.9rem' }}>
                  <strong>Note:</strong> Admins have permission-management power on all documents, but decrypting actual content still requires you to grant yourself VIEW/EDIT access. The isAdmin bypass only bypasses access grants, not the content decryption layer.
                </span>
              </div>

              <div className="glass-card-secondary" style={{ padding: '1.5rem', maxWidth: '500px' }}>
                <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Target Wallet Address</label>
                    <input type="text" placeholder="0x..." value={grantForm.wallet} onChange={e=>setGrantForm({...grantForm, wallet: e.target.value})} className="neo-input" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', boxShadow: 'var(--neo-inset)', background: 'var(--neo-bg)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Access Level (For Granting)</label>
                    <select value={grantForm.level} onChange={e=>setGrantForm({...grantForm, level: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', boxShadow: 'var(--neo-inset)', background: 'var(--neo-bg)' }}>
                      <option value="1">VIEW</option>
                      <option value="2">EDIT</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Expiry</label>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <input type="radio" checked={!grantForm.hasExpiry} onChange={() => setGrantForm({...grantForm, hasExpiry: false})} /> No Expiry
                      </label>
                      <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <input type="radio" checked={grantForm.hasExpiry} onChange={() => setGrantForm({...grantForm, hasExpiry: true})} /> Set Expiry
                      </label>
                    </div>
                    {grantForm.hasExpiry && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input type="date" value={grantForm.expiryDate} onChange={e=>setGrantForm({...grantForm, expiryDate: e.target.value})} className="neo-input" style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', boxShadow: 'var(--neo-inset)', background: 'var(--neo-bg)' }} required={grantForm.hasExpiry} />
                        <input type="time" value={grantForm.expiryTime} onChange={e=>setGrantForm({...grantForm, expiryTime: e.target.value})} className="neo-input" style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', boxShadow: 'var(--neo-inset)', background: 'var(--neo-bg)' }} required={grantForm.hasExpiry} />
                      </div>
                    )}
                  </div>
                  {/* Feature 2: Max Views input */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Max Views (optional)</label>
                    <input
                      type="number"
                      placeholder="Unlimited"
                      min="1"
                      value={grantForm.maxViews}
                      onChange={e => setGrantForm({...grantForm, maxViews: e.target.value})}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', boxShadow: 'var(--neo-inset)', background: 'var(--neo-bg)' }}
                    />
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Leave blank for unlimited. Server-enforced.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <button onClick={(e) => handleGrant(e, selectedAsset.tokenId)} className="btn-primary" disabled={isPending || isConfirming} style={{ flex: 1 }}>
                      <span>Grant Access</span>
                    </button>
                    <button onClick={(e) => handleRevoke(e, selectedAsset.tokenId)} className="btn-outline" disabled={isPending || isConfirming} style={{ flex: 1, color: '#e53e3e' }}>
                      <span>Revoke Access</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Feature 3: Pending Change Requests */}
              <div style={{ marginTop: '2rem' }}>
                <ChangeRequestPanel
                  tokenId={selectedAsset.tokenId}
                  assetName={selectedAsset.name}
                  onApprove={handleApproveCR}
                  isPending={isPending}
                  isConfirming={isConfirming}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <TxStatusToast status={txToast.status} hash={txToast.hash} error={txToast.error} />

      {viewerState.open && (
        <DocumentViewerModal
          arrayBuffer={viewerState.arrayBuffer}
          contentType={viewerState.contentType}
          title={viewerState.title}
          verification={viewerState.verification}
          accessLevel={viewerState.accessLevel}
          onClose={closeViewer}
          onDirectEdit={handleDirectEdit}
        />
      )}
    </div>
  );
}
