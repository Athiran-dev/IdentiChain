import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { apiFetch, API_BASE_URL } from '../api';
import { DocumentCard, TxStatusToast } from '../components/DashboardComponents';
import CreateAssetPage from '../components/CreateAssetPage';
import VersionHistoryPanel from '../components/VersionHistoryPanel';
import DocumentViewerModal from '../components/DocumentViewerModal';
import ChangeRequestPanel from '../components/ChangeRequestPanel';
import ThreatDetectionPanel from '../components/ThreatDetectionPanel';
import { getGreeting } from '../utils';
import { Plus, Users, UploadCloud, ArrowRightLeft, Clock, Eye, GitPullRequest, Lock, CheckCircle, ShieldAlert } from 'lucide-react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import AssetNFTData from '../abi/AssetNFT.json';
import IdentityRegistryData from '../abi/IdentityRegistry.json';
const assetNFTABI = AssetNFTData.abi;
const identityRegistryABI = IdentityRegistryData.abi;

export default function ManagerDashboard() {
  const { identity } = useAuth();
  const [ownedAssets, setOwnedAssets] = useState([]);
  const [sharedAssets, setSharedAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overviewStats, setOverviewStats] = useState(null);

  // Minting state
  const [showMintForm, setShowMintForm] = useState(false);
  
  // Selected Doc for management
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [historyTokenId, setHistoryTokenId] = useState(null);
  const [grants, setGrants] = useState([]);
  const [grantForm, setGrantForm] = useState({ wallet: '', level: '1', hasExpiry: false, expiryDate: '', expiryTime: '', maxViews: '' });

  // Viewer state — Feature 1: arrayBuffer instead of objectUrl
  const [viewerState, setViewerState] = useState({
    open: false, arrayBuffer: null, contentType: null, title: null,
    verification: null, accessLevel: null,
  });
  const [verifyingId, setVerifyingId] = useState(null);

  // Update doc state
  const [updateFile, setUpdateFile] = useState(null);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [preparedUpdate, setPreparedUpdate] = useState(null);

  // Transfer ownership state
  const [transferWallet, setTransferWallet] = useState('');

  // Wagmi contracts
  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // Action context
  const [actionContext, setActionContext] = useState(null); // 'GRANT', 'REVOKE', 'UPDATE', 'TRANSFER', 'APPROVE_CR'
  const [txToast, setTxToast] = useState({ status: null, hash: null, error: null });

  const fetchOwnedAssets = async () => {
    try {
      const wallet = identity?.profile?.walletAddress;
      // Fetch ALL organizational assets for the Manager (Global Access) and Stats
      const [resAll, statsRes] = await Promise.all([
        apiFetch(`/api/asset/list`),
        apiFetch(`/api/stats/overview`)
      ]);
      setOwnedAssets(resAll.assets);
      setOverviewStats(statsRes.stats);
      setSharedAssets([]); // Clear shared assets as everything is in the main list now
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (identity) {
      fetchOwnedAssets().finally(() => setLoading(false));
    }
  }, [identity]);

  const fetchGrants = async (tokenId) => {
    try {
      const res = await apiFetch(`/api/access/asset/${tokenId}`);
      setGrants(res.grants);
    } catch (e) {
      console.error(e);
    }
  };

  // ----- ON-CHAIN ACTION WATCHER -----
  useEffect(() => {
    if (isConfirmed && actionContext) {
      const mirror = async () => {
        try {
          if (actionContext.type === 'GRANT' || actionContext.type === 'REVOKE') {
            await apiFetch('/api/access/mirror', {
              method: 'POST',
              body: JSON.stringify({
                txHash,
                actionType: actionContext.type === 'GRANT' ? 'ACCESS_GRANTED' : 'ACCESS_REVOKED',
                maxViews: actionContext.type === 'GRANT' ? (grantForm.maxViews || null) : undefined,
              })
            });
            fetchGrants(actionContext.tokenId);
          } else if (actionContext.type === 'UPDATE') {
            await apiFetch(`/api/asset/${actionContext.tokenId}/confirm-update`, {
              method: 'POST',
              body: JSON.stringify({ txHash })
            });
            fetchOwnedAssets();
            setPreparedUpdate(null);
          } else if (actionContext.type === 'TRANSFER') {
            await apiFetch(`/api/asset/${actionContext.tokenId}/transfer-ownership`, {
              method: 'POST',
              body: JSON.stringify({ txHash })
            });
            fetchOwnedAssets();
            setSelectedDoc(null);
          } else if (actionContext.type === 'APPROVE_CR') {
            // Feature 3: Confirm CR approval
            await apiFetch(`/api/asset/change-request/${actionContext.changeRequestId}/confirm-approval`, {
              method: 'POST',
              body: JSON.stringify({ txHash })
            });
            fetchOwnedAssets();
          } else if (actionContext.type === 'DIRECT_EDIT') {
            await apiFetch(`/api/asset/${actionContext.tokenId}/confirm-update`, {
              method: 'POST',
              body: JSON.stringify({ txHash })
            });
            fetchOwnedAssets();
            closeViewer();
          } else if (actionContext.type === 'STATUS_UPDATE') {
            setTxToast({ status: 'success', hash: txHash, error: null });
          }
          setTxToast({ status: 'success', hash: txHash, error: null });
        } catch (e) {
          setTxToast({ status: 'error', hash: txHash, error: `Mirror failed: ${e.message}` });
        } finally {
          setActionContext(null);
        }
      };
      mirror();
    }
    if (writeError) {
      setTxToast({ status: 'error', hash: null, error: writeError.message });
      setActionContext(null);
    }
  }, [isConfirmed, writeError, txHash, actionContext]);

  // ----- ACCESS GRANTS -----
  const handleGrant = (e) => {
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

    setActionContext({ type: 'GRANT', tokenId: selectedDoc.tokenId });
    setTxToast({ status: 'pending', hash: null, error: null });
    
    writeContract({
      address: import.meta.env.VITE_ASSET_NFT_ADDRESS,
      abi: assetNFTABI,
      functionName: 'grantAccess',
      args: [BigInt(selectedDoc.tokenId), grantForm.wallet, Number(grantForm.level), expiresAt],
    });
  };

  const handleRevoke = (wallet) => {
    setActionContext({ type: 'REVOKE', tokenId: selectedDoc.tokenId });
    setTxToast({ status: 'pending', hash: null, error: null });
    writeContract({
      address: import.meta.env.VITE_ASSET_NFT_ADDRESS,
      abi: assetNFTABI,
      functionName: 'revokeAccess',
      args: [BigInt(selectedDoc.tokenId), wallet],
    });
  };

  // ----- TWO-STEP UPDATE -----
  const handlePrepareUpdate = async (e) => {
    e.preventDefault();
    if (!updateFile) return alert('File required');
    setUpdateStatus('preparing');
    
    try {
      const formData = new FormData();
      formData.append('file', updateFile);
      
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/asset/${selectedDoc.tokenId}/prepare-update`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPreparedUpdate(data);
      setActionContext({ type: 'UPDATE', tokenId: selectedDoc.tokenId });
      setTxToast({ status: 'pending', hash: null, error: null });
      writeContract({
        address: import.meta.env.VITE_ASSET_NFT_ADDRESS,
        abi: assetNFTABI,
        functionName: 'updateDocument',
        args: [BigInt(selectedDoc.tokenId), data.metadataCID],
      });
    } catch (e) {
      alert(`Prepare failed: ${e.message}`);
    } finally {
      setUpdateStatus(null);
    }
  };

  // ----- TRANSFER OWNERSHIP -----
  const handleTransfer = (e) => {
    e.preventDefault();
    if (!transferWallet) return;
    setActionContext({ type: 'TRANSFER', tokenId: selectedDoc.tokenId });
    setTxToast({ status: 'pending', hash: null, error: null });
    writeContract({
      address: import.meta.env.VITE_ASSET_NFT_ADDRESS,
      abi: assetNFTABI,
      functionName: 'reassignOwnership',
      args: [BigInt(selectedDoc.tokenId), transferWallet],
    });
  };

  // ----- Feature 3: Approve Change Request -----
  const handleApproveCR = ({ tokenId, metadataCID, changeRequestId }) => {
    setActionContext({ type: 'APPROVE_CR', tokenId, changeRequestId });
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
      });

      setActionContext({ type: 'DIRECT_EDIT', tokenId: viewerState.tokenId });
      setTxToast({ status: 'pending', hash: null, error: null });
      writeContract({
        address: import.meta.env.VITE_ASSET_NFT_ADDRESS,
        abi: assetNFTABI,
        functionName: 'updateDocument',
        args: [BigInt(viewerState.tokenId), res.metadataCID],
      });
    } catch (e) {
      alert(`Direct Edit failed: ${e.message}`);
    }
  };

  const handleSetStatus = (wallet, currentStatus) => {
    if (window.confirm(`Are you sure you want to deactivate this identity?`)) {
      setActionContext({ type: 'STATUS_UPDATE', wallet });
      setTxToast({ status: 'pending', hash: null, error: null });
      writeContract({
        address: import.meta.env.VITE_IDENTITY_REGISTRY_ADDRESS,
        abi: identityRegistryABI,
        functionName: 'setActiveStatus',
        args: [wallet, !currentStatus],
      });
    }
  };

  const openDoc = (doc) => {
    setSelectedDoc(doc);
    fetchGrants(doc.tokenId);
  };

  // Feature 1: Pass arrayBuffer to viewer
  const viewDocument = async (doc, version = null) => {
    setVerifyingId(doc.tokenId);
    try {
      const token = sessionStorage.getItem('token');
      const url = version
        ? `${API_BASE_URL}/api/asset/${doc.tokenId}/access?version=${version}`
        : `${API_BASE_URL}/api/asset/${doc.tokenId}/access`;

      const blobRes = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!blobRes.ok) {
        const err = await blobRes.json();
        throw new Error(err.error || err.message || 'Access failed');
      }

      const verification = {
        integrityVerified: blobRes.headers.get('x-integrity-verified'),
        hash: blobRes.headers.get('x-document-hash')
      };
      const contentType = blobRes.headers.get('content-type') || 'application/octet-stream';
      const accessLevel = blobRes.headers.get('x-access-level') || 'EDIT';
      const arrayBuffer = await blobRes.arrayBuffer();

      setViewerState({
        open: true,
        tokenId: doc.tokenId,
        arrayBuffer,
        contentType,
        title: doc.name || `Document #${doc.tokenId}`,
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

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem 0' }}>
      <div className="glass-card-primary dashboard-header-flex" style={{ padding: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            {getGreeting()}, {identity?.profile?.name || 'Manager'} <span style={{ fontSize: '0.8rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-blue)', padding: '4px 10px', borderRadius: '12px', verticalAlign: 'middle', marginLeft: '1rem' }}>Level-4 Clearance</span>
          </h1>
          <div style={{ color: 'var(--text-muted)' }}>Organization Security Overview — Unit: {identity?.profile?.department || 'Operations'}</div>
        </div>
      </div>

      {!selectedDoc && !historyTokenId && (
        <>
          {/* 4 Metric Cards */}
          <div className="dashboard-metrics-grid">
            <div className="glass-card-primary" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total Managed Employees</div>
                <Users size={18} color="var(--primary-blue)" />
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{overviewStats?.totalUsers || 0}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--success-green)' }}>Active in Organization</div>
            </div>
            <div className="glass-card-primary" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Global Digital Assets</div>
                <Lock size={18} color="var(--primary-blue)" />
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{overviewStats?.totalAssets || 0}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--success-green)' }}>Accessible for Management</div>
            </div>
            <div className="glass-card-primary" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Pending Role Requests</div>
                <ShieldAlert size={18} color="#e53e3e" />
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{overviewStats?.pendingApps || 0}</div>
              <div style={{ fontSize: '0.8rem', color: '#e53e3e' }}>Awaiting Admin Approval</div>
            </div>
            <div className="glass-card-primary" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total Audit Logs</div>
                <CheckCircle size={18} color="var(--primary-blue)" />
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{overviewStats?.totalLogs || 0}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--success-green)' }}>Monitored Events</div>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <ThreatDetectionPanel 
              viewRole="MANAGER" 
              onDeactivateIdentity={(wallet) => handleSetStatus(wallet, true)} 
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
            <button
              className={!showMintForm ? 'btn-primary' : 'btn-outline'}
              onClick={() => setShowMintForm(false)}
            >
              <span>Managed Documents</span>
            </button>
            <button
              className={showMintForm ? 'btn-primary' : 'btn-outline'}
              onClick={() => setShowMintForm(true)}
            >
              <span><Plus size={14} /> Upload New Asset</span>
            </button>
          </div>
        </>
      )}

      {showMintForm && (
        <CreateAssetPage 
          onCancel={() => setShowMintForm(false)} 
          onSuccess={() => { setShowMintForm(false); fetchOwnedAssets(); }} 
        />
      )}

      {!selectedDoc ? (
        <div>
          {ownedAssets.length === 0 ? (
            <div className="glass-card-primary" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No organizational assets have been minted yet.
            </div>
          ) : (
            <div className="glass-card-primary" style={{ padding: '2rem', marginBottom: '3rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>All Organizational Assets</h3>
              <div className="dashboard-documents-grid">
                {ownedAssets.map(doc => (
                  <DocumentCard 
                    key={doc.tokenId} 
                    doc={doc} 
                    onAccess={() => viewDocument(doc)}
                    actionButtons={
                      <>
                        <button className="btn-primary" onClick={() => openDoc(doc)} style={{ padding: '0.5em 0.5em', fontSize: '0.85rem' }}>
                          <span>Manage</span>
                        </button>
                        <button className="btn-outline" onClick={() => setHistoryTokenId(doc.tokenId)} style={{ padding: '0.5em 0.5em', fontSize: '0.85rem' }}>
                          <span><Clock size={14} /> History</span>
                        </button>
                      </>
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {sharedAssets.length > 0 && (
            <div className="glass-card-primary" style={{ padding: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Shared With Me</h3>
              <div className="dashboard-documents-grid">
                {sharedAssets.map(doc => (
                  <DocumentCard 
                    key={doc.tokenId} 
                    doc={doc} 
                    onAccess={() => viewDocument(doc)}
                    actionButtons={
                      <>
                        <button className="btn-outline" onClick={() => viewDocument(doc)} style={{ padding: '0.5em 0.5em', fontSize: '0.85rem' }} disabled={verifyingId === doc.tokenId}>
                          <span><Eye size={14} /> View</span>
                        </button>
                        <button className="btn-outline" onClick={() => setHistoryTokenId(doc.tokenId)} style={{ padding: '0.5em 0.5em', fontSize: '0.85rem' }}>
                          <span><Clock size={14} /> History</span>
                        </button>
                      </>
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card-primary" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <h3>Managing: {selectedDoc.name} (Token #{selectedDoc.tokenId})</h3>
            <button className="btn-outline" onClick={() => setSelectedDoc(null)}><span>Back to List</span></button>
          </div>

          <div className="dashboard-half-grid">
            {/* Access Control */}
            <div className="glass-card-secondary" style={{ padding: '1.5rem' }}>
              <h4><Users size={18} style={{verticalAlign:'middle', marginRight:'0.5rem'}}/> Access Control</h4>
              <form onSubmit={handleGrant} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="text" placeholder="Wallet Address" value={grantForm.wallet} onChange={e=>setGrantForm({...grantForm, wallet: e.target.value})} style={{...inputStyle, flex:1}} />
                  <select value={grantForm.level} onChange={e=>setGrantForm({...grantForm, level: e.target.value})} style={inputStyle}>
                    <option value="1">VIEW</option>
                    <option value="2">EDIT</option>
                  </select>
                </div>
                <div>
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
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Max Views (optional)</label>
                  <input
                    type="number"
                    placeholder="Unlimited"
                    min="1"
                    value={grantForm.maxViews}
                    onChange={e => setGrantForm({...grantForm, maxViews: e.target.value})}
                    style={{...inputStyle, width: '100%'}}
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Leave blank for unlimited views. This limit is enforced server-side.
                  </div>
                </div>
                <button type="submit" className="btn-primary" disabled={isPending || isConfirming}><span>Grant Access</span></button>
              </form>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {grants.map(g => (
                  <div key={g.wallet} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background:'var(--neo-bg)', padding:'0.75rem', borderRadius:'8px', boxShadow:'var(--neo-inset)'}}>
                    <div style={{fontSize:'0.85rem'}}>
                      <div>{g.wallet.slice(0,10)}...</div>
                      <div style={{fontWeight:'bold', color:'var(--primary-blue)'}}>{g.level}</div>
                      {g.maxViews != null && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Views: {g.viewsUsed || 0}/{g.maxViews}
                        </div>
                      )}
                    </div>
                    <button className="btn-outline" onClick={() => handleRevoke(g.wallet)} disabled={isPending || isConfirming} style={{padding:'0.25rem 0.75rem', fontSize:'0.75rem', color:'#e53e3e'}}>
                      <span>Revoke</span>
                    </button>
                  </div>
                ))}
                {grants.length === 0 && <div style={{fontSize:'0.85rem', color:'var(--text-muted)'}}>No active grants.</div>}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Update Document */}
              <div className="glass-card-secondary" style={{ padding: '1.5rem' }}>
                <h4><UploadCloud size={18} style={{verticalAlign:'middle', marginRight:'0.5rem'}}/> Update Document</h4>
                <p style={{fontSize:'0.85rem', color:'var(--text-muted)', margin:'0.5rem 0 1rem'}}>Upload a new version. This updates the IPFS hash and on-chain metadata.</p>
                <form onSubmit={handlePrepareUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input type="file" onChange={e=>setUpdateFile(e.target.files[0])} style={inputStyle} />
                  <button type="submit" className="btn-primary" disabled={updateStatus === 'preparing' || isPending || isConfirming || preparedUpdate}>
                    <span>{updateStatus === 'preparing' ? 'Encrypting & Uploading...' : preparedUpdate ? 'Confirming On-Chain...' : 'Upload & Update'}</span>
                  </button>
                </form>
              </div>

              {/* Transfer Ownership */}
              <div className="glass-card-secondary" style={{ padding: '1.5rem' }}>
                <h4><ArrowRightLeft size={18} style={{verticalAlign:'middle', marginRight:'0.5rem'}}/> Transfer Ownership</h4>
                <form onSubmit={handleTransfer} style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <input type="text" placeholder="New Owner Address" value={transferWallet} onChange={e=>setTransferWallet(e.target.value)} style={{...inputStyle, flex:1}} />
                  <button type="submit" className="btn-primary" disabled={isPending || isConfirming}><span>Transfer</span></button>
                </form>
              </div>
            </div>
          </div>

          {/* Feature 3: Pending Change Requests */}
          <div style={{ marginTop: '2rem' }}>
            <ChangeRequestPanel
              tokenId={selectedDoc.tokenId}
              assetName={selectedDoc.name}
              onApprove={handleApproveCR}
              isPending={isPending}
              isConfirming={isConfirming}
            />
          </div>
        </div>
      )}

      {historyTokenId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <VersionHistoryPanel 
              tokenId={historyTokenId}
              onClose={() => setHistoryTokenId(null)}
              onViewVersion={(v) => viewDocument(ownedAssets.find(d => d.tokenId === historyTokenId), v)}
            />
          </div>
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

const inputStyle = {
  padding: '0.75rem', borderRadius: '8px', border: 'none', boxShadow: 'var(--neo-inset)', background: 'var(--neo-bg)', fontFamily: 'inherit'
};
