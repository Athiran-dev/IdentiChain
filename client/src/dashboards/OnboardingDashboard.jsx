import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { apiFetch } from '../api';
import { TxStatusToast } from '../components/DashboardComponents';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import IdentityRegistryData from '../abi/IdentityRegistry.json'; 
const identityRegistryABI = IdentityRegistryData.abi;

export default function OnboardingDashboard() {
  const { identity, refreshIdentity } = useAuth();
  const [application, setApplication] = useState(null);
  const [loadingApp, setLoadingApp] = useState(true);
  
  // Unified Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    designation: '',
    did: '',
    requestedRole: 'EMPLOYEE'
  });

  // Wagmi contract write for registerSelf
  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const [txStatus, setTxStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [backendProgress, setBackendProgress] = useState(null);

  useEffect(() => {
    async function fetchApp() {
      try {
        const res = await apiFetch('/api/identity/role-application/mine');
        setApplication(res.application);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingApp(false);
      }
    }
    fetchApp();
  }, []);

  // Watch for confirmation to mirror to backend and submit profile
  useEffect(() => {
    if (isConfirmed && txStatus === 'pending') {
      setTxStatus('success');
      setBackendProgress('Saving Profile and Requesting Role...');
      
      const processBackend = async () => {
        try {
          // 1. Update Profile
          await apiFetch(`/api/profile/${identity.profile.walletAddress}`, {
            method: 'PUT',
            body: JSON.stringify({
              name: formData.name,
              email: formData.email,
              department: formData.department,
              designation: formData.designation
            })
          });

          // 2. Mirror Identity Registration
          await apiFetch('/api/identity/register', {
            method: 'POST',
            body: JSON.stringify({
              walletAddress: identity.profile.walletAddress,
              did: formData.did || 'did:ethr:' + identity.profile.walletAddress,
              txHash,
            })
          });

          // 3. Submit Role Application
          const roleRes = await apiFetch('/api/identity/role-application', {
            method: 'POST',
            body: JSON.stringify({ requestedRole: formData.requestedRole })
          });
          
          setApplication(roleRes.application);
          refreshIdentity();
        } catch (e) {
          setErrorMessage('Backend setup failed: ' + e.message);
        } finally {
          setBackendProgress(null);
        }
      };
      
      processBackend();
    }
    
    if (writeError) {
      setTxStatus('error');
      setErrorMessage(writeError.message);
    }
  }, [isConfirmed, txStatus, writeError, txHash, formData, identity, refreshIdentity]);

  const submitBackendOnly = async () => {
    setBackendProgress('Saving Profile and Requesting Role...');
    try {
      // 1. Update Profile
      await apiFetch(`/api/profile/${identity.profile.walletAddress}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          department: formData.department,
          designation: formData.designation
        })
      });

      // 2. Submit Role Application
      const roleRes = await apiFetch('/api/identity/role-application', {
        method: 'POST',
        body: JSON.stringify({ requestedRole: formData.requestedRole })
      });
      
      setApplication(roleRes.application);
      refreshIdentity();
      setTxStatus('success');
    } catch (e) {
      setTxStatus('error');
      setErrorMessage('Backend setup failed: ' + e.message);
    } finally {
      setBackendProgress(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      setErrorMessage("Name and Email are required.");
      return;
    }
    setTxStatus('pending');
    setErrorMessage(null);
    
    if (isRegistered) {
      submitBackendOnly();
    } else {
      writeContract({
        address: import.meta.env.VITE_IDENTITY_REGISTRY_ADDRESS,
        abi: identityRegistryABI,
        functionName: 'registerSelf',
        args: [formData.did || 'did:ethr:' + identity?.profile?.walletAddress],
      });
    }
  };

  const isRegistered = identity?.onChain?.registeredAt > 0;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem 0' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary-dark)' }}>IdentiChain Gateway</h1>
        <div style={{ color: 'var(--text-muted)' }}>Secure Cryptographic Identity Provisioning</div>
      </div>

      {!application && (
        <div className="glass-card-primary" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Create Profile & Request Access</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            To participate in the ecosystem, create your profile and register your decentralized identity (DID).
          </p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>Full Name *</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="John Doe"
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', boxShadow: 'var(--neo-inset)', background: 'var(--neo-bg)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>Email Address *</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="john@example.com"
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', boxShadow: 'var(--neo-inset)', background: 'var(--neo-bg)' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>Department</label>
                <input 
                  type="text" 
                  value={formData.department}
                  onChange={e => setFormData({...formData, department: e.target.value})}
                  placeholder="Engineering"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', boxShadow: 'var(--neo-inset)', background: 'var(--neo-bg)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>Designation</label>
                <input 
                  type="text" 
                  value={formData.designation}
                  onChange={e => setFormData({...formData, designation: e.target.value})}
                  placeholder="Senior Developer"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', boxShadow: 'var(--neo-inset)', background: 'var(--neo-bg)' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>Decentralized Identifier (Optional)</label>
              <input 
                type="text" 
                value={formData.did}
                onChange={e => setFormData({...formData, did: e.target.value})}
                placeholder={`did:ethr:${identity?.profile?.walletAddress || '0x...'}`}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', boxShadow: 'var(--neo-inset)', background: 'var(--neo-bg)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>Requested Role</label>
              <select 
                value={formData.requestedRole}
                onChange={e => setFormData({...formData, requestedRole: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', boxShadow: 'var(--neo-inset)', background: 'var(--neo-bg)' }}
              >
                <option value="EMPLOYEE">Employee (Read/Verify Documents)</option>
                <option value="MANAGER">Manager (Mint/Update Documents)</option>
                <option value="AUDITOR">Auditor (View Audit Logs)</option>
                <option value="ADMIN">Admin (System Management)</option>
              </select>
            </div>

            <button type="submit" className="btn-primary" disabled={isPending || isConfirming || backendProgress} style={{ width: '100%', marginTop: '1rem' }}>
              <span>{isPending || isConfirming ? 'Registering on Blockchain...' : backendProgress ? backendProgress : 'Submit & Join'}</span>
            </button>
          </form>
        </div>
      )}

      {application && (
        <div className="glass-card-primary" style={{ padding: '2rem', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '1rem' }}>Application Status</h3>
          <div style={{ padding: '1rem', background: 'var(--neo-bg)', borderRadius: '12px', boxShadow: 'var(--neo-inset)' }}>
            <div style={{ fontWeight: '600', fontSize: '1.1rem', color: application.status === 'PENDING' ? '#dd6b20' : application.status === 'REJECTED' ? '#e53e3e' : '#38a169' }}>
              {application.status}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Requested Role: {application.requestedRole}
            </div>
          </div>
          {application.status === 'PENDING' && (
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              An administrator must approve your request before you can access the dashboard. Please check back later.
            </p>
          )}
          {application.status === 'APPROVED' && (
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Your role has been approved! Please refresh the page to access your dashboard.
            </p>
          )}
          {application.status === 'REJECTED' && (
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Your application was rejected. Please contact an administrator.
            </p>
          )}
        </div>
      )}

      <TxStatusToast status={txStatus} hash={txHash} error={errorMessage} />
    </div>
  );
}
