import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '../api';
import { CheckCircle, Loader2, UploadCloud, X, FileText } from 'lucide-react';

export default function CreateAssetPage({ onCancel, onSuccess }) {
  const { identity } = useAuth();
  const [form, setForm] = useState({
    name: '',
    description: '',
    assetType: 'Technical Document',
    file: null,
  });

  const [status, setStatus] = useState('IDLE'); // IDLE, PROCESSING, SUCCESS, ERROR
  const [errorMsg, setErrorMsg] = useState(null);
  const [result, setResult] = useState(null);

  const assetTypes = [
    'Technical Document',
    'Engineering Drawing',
    'Certificate',
    'Project Document',
    'Security Document',
    'Equipment Record',
    'Other'
  ];

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setForm({ ...form, file: e.target.files[0] });
    }
  };

  const handleRemoveFile = () => {
    setForm({ ...form, file: null });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.file || !form.name) {
      setErrorMsg('Document Name and File are required.');
      return;
    }

    setStatus('PROCESSING');
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('description', form.description);
      formData.append('assetType', form.assetType);
      formData.append('file', form.file);

      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/asset/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create asset');
      }

      setResult(data);
      setStatus('SUCCESS');
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('ERROR');
    }
  };

  if (status === 'SUCCESS' && result) {
    return (
      <div className="glass-card-primary" style={{ padding: '3rem', textAlign: 'center', maxWidth: '600px', margin: '2rem auto' }}>
        <CheckCircle size={48} className="text-success" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ marginBottom: '2rem' }}>Asset Created Successfully</h2>
        
        <div style={{ background: 'var(--neo-bg)', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--neo-inset)', textAlign: 'left', marginBottom: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '1rem', fontSize: '0.9rem' }}>
            <div style={{ color: 'var(--text-muted)' }}>Asset:</div>
            <div style={{ fontWeight: '600' }}>{result.asset?.name}</div>
            
            <div style={{ color: 'var(--text-muted)' }}>NFT ID:</div>
            <div>#{result.asset?.tokenId}</div>
            
            <div style={{ color: 'var(--text-muted)' }}>Version:</div>
            <div>{result.asset?.currentVersion}</div>
            
            <div style={{ color: 'var(--text-muted)' }}>Integrity:</div>
            <div className="text-success" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={14} /> Verified
            </div>
            
            <div style={{ color: 'var(--text-muted)' }}>Status:</div>
            <div>Active</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button onClick={() => onSuccess && onSuccess()} className="btn-primary">
            <span>Go to Assets</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card-primary" style={{ padding: '2rem', maxWidth: '700px', margin: '2rem auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Create Digital Asset</h2>
        {onCancel && (
          <button onClick={onCancel} className="btn-outline" style={{ padding: '0.5rem' }}>
            <X size={20} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
            Document Name *
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. BEL Radar Design v1.0"
            disabled={status === 'PROCESSING'}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', boxShadow: 'var(--neo-inset)', background: 'var(--neo-bg)' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
            Asset Type *
          </label>
          <select
            value={form.assetType}
            onChange={e => setForm({ ...form, assetType: e.target.value })}
            disabled={status === 'PROCESSING'}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', boxShadow: 'var(--neo-inset)', background: 'var(--neo-bg)' }}
          >
            {assetTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
            Description
          </label>
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Brief description of the document contents..."
            disabled={status === 'PROCESSING'}
            rows={3}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', boxShadow: 'var(--neo-inset)', background: 'var(--neo-bg)', resize: 'vertical' }}
          />
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
            Document File *
          </label>
          
          {!form.file ? (
            <div style={{ 
              border: '2px dashed var(--glass-border)', 
              borderRadius: '12px', 
              padding: '3rem 2rem',
              textAlign: 'center',
              background: 'rgba(0,0,0,0.1)',
              cursor: 'pointer'
            }} onClick={() => document.getElementById('file-upload').click()}>
              <UploadCloud size={48} className="text-primary-blue" style={{ margin: '0 auto 1rem' }} />
              <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Click to Browse or Drag & Drop</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Supports PDF, DOCX, PNG, JPG (Max 50MB)</div>
              <input 
                id="file-upload" 
                type="file" 
                onChange={handleFileChange} 
                style={{ display: 'none' }} 
                disabled={status === 'PROCESSING'}
              />
            </div>
          ) : (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '1rem',
              background: 'var(--neo-bg)',
              borderRadius: '8px',
              boxShadow: 'var(--neo-inset)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <FileText size={24} className="text-primary-blue" />
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{form.file.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{(form.file.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
              </div>
              {status !== 'PROCESSING' && (
                <button type="button" onClick={handleRemoveFile} className="btn-outline" style={{ padding: '0.5rem' }}>
                  <X size={16} />
                </button>
              )}
            </div>
          )}
        </div>

        {errorMsg && (
          <div style={{ padding: '1rem', background: 'rgba(229, 62, 62, 0.1)', borderLeft: '4px solid #e53e3e', color: '#e53e3e', marginBottom: '1.5rem', borderRadius: '0 4px 4px 0' }}>
            {errorMsg}
          </div>
        )}

        {status === 'PROCESSING' && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(49, 130, 206, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Loader2 size={24} className="text-primary-blue" style={{ animation: 'spin 2s linear infinite' }} />
            <div>
              <div style={{ fontWeight: '600', color: 'var(--primary-light)' }}>Processing Asset Creation...</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                The backend is currently hashing, encrypting, uploading to IPFS, and waiting for the blockchain mint transaction to confirm. This may take up to 30 seconds.
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-outline" disabled={status === 'PROCESSING'}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn-primary" disabled={status === 'PROCESSING' || !form.file || !form.name}>
            <span>{status === 'PROCESSING' ? 'Creating...' : 'Create Asset'}</span>
          </button>
        </div>
      </form>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
