import React, { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { injected } from 'wagmi/connectors';

export default function BackendTestHarness() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  // Auth State
  const [authPayload, setAuthPayload] = useState(null); // { token, walletAddress }

  // API Log State
  const [logs, setLogs] = useState([]);

  // Form States
  const [identityWallet, setIdentityWallet] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetOwner, setAssetOwner] = useState('');
  const [assetFile, setAssetFile] = useState(null);
  const [accessId, setAccessId] = useState('');

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://identichain-backend.onrender.com';

  const addLog = (method, endpoint, status, body) => {
    setLogs(prev => [{
      time: new Date().toLocaleTimeString(),
      method,
      endpoint,
      status,
      body: JSON.stringify(body, null, 2)
    }, ...prev]);
  };

  const handleSignIn = async () => {
    if (!isConnected || !address) return alert('Connect wallet first');
    try {
      const res = await fetch(`${API_BASE}/api/auth/nonce/${address}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to fetch nonce');

      const message = data.message;
      const signature = await signMessageAsync({ message });

      const verifyRes = await fetch(`${API_BASE}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, signature, message })
      });
      const verifyData = await verifyRes.json();
      
      if (!verifyRes.ok) throw new Error(verifyData.error || 'Failed to verify signature');

      setAuthPayload({ token: verifyData.token, walletAddress: address });
      addLog('POST', `/api/auth/verify`, verifyRes.status, verifyData);
    } catch (err) {
      console.error(err);
      addLog('AUTH', 'SignIn', 'ERROR', { error: err.message });
      alert(err.message);
    }
  };

  const getAuthHeaders = () => {
    if (!authPayload || !authPayload.token) throw new Error('Not signed in');
    return {
      'Authorization': `Bearer ${authPayload.token}`
    };
  };

  const checkIdentity = async () => {
    const target = identityWallet || address;
    if (!target) return alert('Enter a wallet address or connect wallet');
    try {
      const res = await fetch(`${API_BASE}/api/identity/${target}`);
      const data = await res.json();
      addLog('GET', `/api/identity/${target}`, res.status, data);
    } catch (err) {
      addLog('GET', `/api/identity/${target}`, 'ERROR', { error: err.message });
    }
  };

  const createAsset = async () => {
    if (!authPayload) return alert('Sign in first');
    if (!assetFile || !assetName) return alert('File and Name are required');

    const formData = new FormData();
    formData.append('file', assetFile);
    formData.append('name', assetName);
    formData.append('ownerAddress', assetOwner || address);

    try {
      const res = await fetch(`${API_BASE}/api/asset/create`, {
        method: 'POST',
        headers: { ...getAuthHeaders() },
        body: formData
      });
      const data = await res.json();
      addLog('POST', '/api/asset/create', res.status, data);
    } catch (err) {
      addLog('POST', '/api/asset/create', 'ERROR', { error: err.message });
    }
  };

  const listAssets = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/asset/list`);
      const data = await res.json();
      addLog('GET', '/api/asset/list', res.status, data);
    } catch (err) {
      addLog('GET', '/api/asset/list', 'ERROR', { error: err.message });
    }
  };

  const checkAccess = async () => {
    if (!authPayload) return alert('Sign in first');
    if (!accessId) return alert('Token ID is required');

    try {
      const res = await fetch(`${API_BASE}/api/asset/${accessId}/access`, {
        headers: { ...getAuthHeaders() }
      });
      
      if (!res.ok) {
        const data = await res.json();
        addLog('GET', `/api/asset/${accessId}/access`, res.status, data);
        return;
      }

      // If it's a file stream
      const blob = await res.blob();
      const verified = res.headers.get('X-Integrity-Verified') === 'true'; // parse header string → boolean
      const hash = res.headers.get('X-Document-Hash');
      
      addLog('GET', `/api/asset/${accessId}/access`, res.status, {
        message: 'File downloaded successfully',
        size: blob.size,
        type: blob.type,
        integrityVerified: verified,
        hash
      });
    } catch (err) {
      addLog('GET', `/api/asset/${accessId}/access`, 'ERROR', { error: err.message });
    }
  };

  return (
    <div className="container" style={{ paddingTop: '100px', paddingBottom: '100px' }}>
      <h1 style={{ marginBottom: '2rem', textAlign: 'center' }}>Backend Test Harness</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        
        {/* Left Column: Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Section 1 & 2: Wallet Connect & Auth */}
          <div className="glass-card-secondary" style={{ padding: '2rem' }}>
            <h3>1. Authentication</h3>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              {!isConnected ? (
                <button className="btn-primary" onClick={() => connect({ connector: injected() })}>
                  <span>Connect MetaMask</span>
                </button>
              ) : (
                <>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Connected: {address}</div>
                  <button className="btn-outline" onClick={() => disconnect()}><span>Disconnect</span></button>
                </>
              )}
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button 
                className="btn-primary" 
                onClick={handleSignIn}
                disabled={!isConnected}
                style={{ opacity: !isConnected ? 0.5 : 1 }}
              >
                <span>Sign In (JWT Flow)</span>
              </button>
              {authPayload && <div style={{ color: 'var(--success-green)', fontWeight: 'bold' }}>✓ Signed In</div>}
            </div>
          </div>

          {/* Section 3: Identity Check */}
          <div className="glass-card-secondary" style={{ padding: '2rem' }}>
            <h3>2. Identity Check (Unauthenticated)</h3>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
              <input 
                type="text" 
                placeholder="Wallet Address (defaults to connected)"
                value={identityWallet}
                onChange={e => setIdentityWallet(e.target.value)}
                style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }}
              />
              <button className="btn-primary" onClick={checkIdentity}><span>Check</span></button>
            </div>
          </div>

          {/* Section 4: Create Asset */}
          <div className="glass-card-secondary" style={{ padding: '2rem' }}>
            <h3>3. Create Asset (Authenticated)</h3>
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input 
                type="text" 
                placeholder="Asset Name"
                value={assetName}
                onChange={e => setAssetName(e.target.value)}
                style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }}
              />
              <input 
                type="text" 
                placeholder="Owner Wallet (defaults to connected)"
                value={assetOwner}
                onChange={e => setAssetOwner(e.target.value)}
                style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }}
              />
              <input 
                type="file" 
                onChange={e => setAssetFile(e.target.files[0])}
                style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc', background: 'var(--neo-bg)' }}
              />
              <button 
                className="btn-primary" 
                onClick={createAsset}
                disabled={!authPayload}
                style={{ opacity: !authPayload ? 0.5 : 1, alignSelf: 'flex-start' }}
              >
                <span>{authPayload ? 'Create Asset' : 'Sign in required'}</span>
              </button>
            </div>
          </div>

          {/* Section 5: List Assets */}
          <div className="glass-card-secondary" style={{ padding: '2rem' }}>
            <h3>4. List Assets (Unauthenticated)</h3>
            <button className="btn-primary" onClick={listAssets} style={{ marginTop: '1rem' }}>
              <span>List Assets</span>
            </button>
          </div>

          {/* Section 6: Access Asset */}
          <div className="glass-card-secondary" style={{ padding: '2rem' }}>
            <h3>5. Access Asset (Authenticated)</h3>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
              <input 
                type="number" 
                placeholder="Token ID"
                value={accessId}
                onChange={e => setAccessId(e.target.value)}
                style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }}
              />
              <button 
                className="btn-primary" 
                onClick={checkAccess}
                disabled={!authPayload}
                style={{ opacity: !authPayload ? 0.5 : 1 }}
              >
                <span>{authPayload ? 'Check Access' : 'Sign in required'}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Response Logs */}
        <div className="glass-card-primary" style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Response Logs</h3>
            <button onClick={() => setLogs([])} style={{ background: 'none', border: 'none', color: 'var(--primary-blue)', cursor: 'pointer', textDecoration: 'underline' }}>Clear</button>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {logs.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No API calls made yet.</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} style={{ background: '#1e293b', color: '#e2e8f0', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
                    <strong>{log.method} {log.endpoint}</strong>
                    <span style={{ color: log.status === 200 || log.status === 201 ? '#4ade80' : '#f87171' }}>{log.status}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>{log.time}</div>
                  <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
                    {log.body}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
