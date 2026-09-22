import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { apiFetch, API_BASE_URL } from '../api';
import { DocumentCard, VerificationBadge } from '../components/DashboardComponents';
import DocumentViewerModal from '../components/DocumentViewerModal';
import VersionHistoryPanel from '../components/VersionHistoryPanel';
import MyChangeRequests from '../components/MyChangeRequests';
import { getGreeting } from '../utils';
import { Clock, GitPullRequest, FileText, Activity, ShieldCheck, CheckCircle } from 'lucide-react';

export default function EmployeeDashboard() {
  const { identity } = useAuth();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('documents'); // 'documents' | 'my-changes'

  // Verification state
  const [verifyingId, setVerifyingId] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [historyTokenId, setHistoryTokenId] = useState(null);

  // Document viewer modal state
  const [viewerState, setViewerState] = useState({
    open: false, arrayBuffer: null, contentType: null, title: null,
    verification: null, accessLevel: null, tokenId: null,
  });

  // Grant info cache (for view-limit badges)
  const [grantInfoMap, setGrantInfoMap] = useState({});

  useEffect(() => {
    async function fetchAssets() {
      try {
        const wallet = identity?.profile?.walletAddress;
        const res = await apiFetch(`/api/asset/list?wallet=${wallet}`);
        const accessible = res.assets.filter(a => a.accessLevel === 'VIEW' || a.accessLevel === 'EDIT');
        setAssets(accessible);

        // Fetch grant info for each accessible asset (for view-limit display)
        const grantMap = {};
        await Promise.all(
          accessible.map(async (a) => {
            try {
              const grantRes = await apiFetch(`/api/access/my-grant/${a.tokenId}`);
              if (grantRes.grant) {
                grantMap[a.tokenId] = grantRes.grant;
              }
            } catch {}
          })
        );
        setGrantInfoMap(grantMap);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (identity) fetchAssets();
  }, [identity]);

  const handleAccess = async (doc, version = null) => {
    setVerifyingId(doc.tokenId);
    setVerificationResult(null);
    try {
      const token = sessionStorage.getItem('token');
      const url = version
        ? `${API_BASE_URL}/api/asset/${doc.tokenId}/access?version=${version}`
        : `${API_BASE_URL}/api/asset/${doc.tokenId}/access`;

      const blobRes = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!blobRes.ok) {
        const err = await blobRes.json();
        // Feature 2: Handle ACCESS_EXHAUSTED specifically
        if (err.error === 'ACCESS_EXHAUSTED') {
          alert("You've reached your view limit for this document — contact the owner for renewed access.");
          return;
        }
        throw new Error(err.message || err.error || 'Access failed');
      }

      const verifiedHeader = blobRes.headers.get('x-integrity-verified');
      const hashHeader = blobRes.headers.get('x-document-hash');
      const accessLevel = blobRes.headers.get('x-access-level') || doc.accessLevel || 'VIEW';
      const contentType = blobRes.headers.get('content-type') || 'application/octet-stream';

      const verification = { integrityVerified: verifiedHeader, hash: hashHeader };
      setVerificationResult({ tokenId: doc.tokenId, ...verification });

      // Get ArrayBuffer instead of blob URL (Feature 1)
      const arrayBuffer = await blobRes.arrayBuffer();

      setViewerState({
        open: true,
        arrayBuffer,
        contentType,
        title: doc.name || `Document #${doc.tokenId}`,
        verification,
        accessLevel,
        tokenId: doc.tokenId,
      });
    } catch (e) {
      alert(`Error accessing document: ${e.message}`);
    } finally {
      setVerifyingId(null);
    }
  };

  // Feature 3: Submit edited content for review
  const handleSubmitForReview = async (modifiedContent) => {
    const { tokenId, title } = viewerState;
    if (!tokenId) return;

    try {
      const blob = new Blob([modifiedContent], { type: 'text/plain' });
      const file = new File([blob], title || 'document.txt', { type: 'text/plain' });

      const formData = new FormData();
      formData.append('file', file);

      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/asset/${tokenId}/propose-change`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Propose change failed');

      alert('Change request submitted successfully! The document owner will review your changes.');
      closeViewer();
    } catch (e) {
      alert(`Submit failed: ${e.message}`);
    }
  };

  const closeViewer = () => {
    setViewerState({
      open: false, arrayBuffer: null, contentType: null, title: null,
      verification: null, accessLevel: null, tokenId: null,
    });
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading documents...</div>;

  return (
    <div style={{ padding: '2rem 0' }}>
      {/* Top Header */}
      <div className="glass-card-primary" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            {getGreeting()}, {identity?.profile?.name || 'Employee'} <span style={{ fontSize: '0.8rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-blue)', padding: '4px 10px', borderRadius: '12px', verticalAlign: 'middle', marginLeft: '1rem' }}>Employee Clearance</span>
          </h1>
          <div style={{ color: 'var(--text-muted)' }}>Organization Security Overview — Unit: {identity?.profile?.department || 'Operations'}</div>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-card-primary" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Accessible Assets</div>
            <FileText size={18} color="var(--primary-blue)" />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{assets.length}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--success-green)' }}>Granted by Organization</div>
        </div>
        <div className="glass-card-primary" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Active Grants</div>
            <CheckCircle size={18} color="var(--primary-blue)" />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{Object.keys(grantInfoMap).length}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--success-green)' }}>With Defined Limits</div>
        </div>
        <div className="glass-card-primary" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Network Status</div>
            <Activity size={18} color="var(--success-green)" />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--success-green)' }}>Online</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Connected to Sepolia</div>
        </div>
        <div className="glass-card-primary" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Identity Integrity</div>
            <ShieldCheck size={18} color="var(--primary-blue)" />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>100%</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--success-green)' }}>Cryptographically Verified</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        <button
          className={activeTab === 'documents' ? 'btn-primary' : 'btn-outline'}
          onClick={() => setActiveTab('documents')}
        >
          <span>Accessible Documents</span>
        </button>
        <button
          className={activeTab === 'my-changes' ? 'btn-primary' : 'btn-outline'}
          onClick={() => setActiveTab('my-changes')}
        >
          <span><GitPullRequest size={14} /> My Change Requests</span>
        </button>
      </div>

      {activeTab === 'my-changes' ? (
        <MyChangeRequests />
      ) : (
        <>
          {verificationResult && (
            <div className="glass-card-primary" style={{ padding: '1rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <strong>Last Verification Result (Token #{verificationResult.tokenId}):</strong>
                <div style={{ marginTop: '0.5rem' }}>
                  <VerificationBadge integrityVerified={verificationResult.integrityVerified} hash={verificationResult.hash} />
                </div>
              </div>
              <button className="btn-outline" onClick={() => setVerificationResult(null)}>Dismiss</button>
            </div>
          )}

          {assets.length === 0 ? (
            <div className="glass-card-primary" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              You do not have access to any documents.
            </div>
          ) : (
            <div className="glass-card-primary" style={{ padding: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Assets Available to You</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {assets.map(doc => (
                  <DocumentCard
                    key={doc.tokenId}
                    doc={doc}
                    grantInfo={grantInfoMap[doc.tokenId]}
                    onAccess={verifyingId === doc.tokenId ? null : () => handleAccess(doc)}
                    actionButtons={
                      <>
                        {verifyingId === doc.tokenId ? <span style={{fontSize:'0.85rem'}}>Verifying...</span> : null}
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
        </>
      )}

      {historyTokenId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <VersionHistoryPanel
              tokenId={historyTokenId}
              onClose={() => setHistoryTokenId(null)}
              onViewVersion={(v) => handleAccess(assets.find(d => d.tokenId === historyTokenId), v)}
            />
          </div>
        </div>
      )}

      {viewerState.open && (
        <DocumentViewerModal
          arrayBuffer={viewerState.arrayBuffer}
          contentType={viewerState.contentType}
          title={viewerState.title}
          verification={viewerState.verification}
          accessLevel={viewerState.accessLevel}
          onClose={closeViewer}
          onSubmitForReview={viewerState.accessLevel === 'EDIT' ? handleSubmitForReview : undefined}
        />
      )}
    </div>
  );
}
