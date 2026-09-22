import React, { useState } from 'react';
import { API_BASE_URL } from '../api';
import { X, UploadCloud, User } from 'lucide-react';
import { useAuth } from './AuthContext';

export default function ProfileModal({ onClose }) {
  const { identity, token, refreshIdentity } = useAuth();
  
  const wallet = identity?.profile?.walletAddress;
  const initialProfile = identity?.profile || {};
  
  const [formData, setFormData] = useState({
    name: initialProfile.name || '',
    department: initialProfile.department || '',
    designation: initialProfile.designation || '',
    email: initialProfile.email || '',
    phone: initialProfile.phone || '',
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Save photo if provided
      if (photoFile) {
        const photoData = new FormData();
        photoData.append('photo', photoFile);

        const photoRes = await fetch(`${API_BASE_URL}/api/profile/photo`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: photoData
        });
        
        if (!photoRes.ok) {
          throw new Error('Failed to upload profile photo');
        }
      }

      // 2. Save profile fields
      const profileRes = await fetch(`${API_BASE_URL}/api/profile/${wallet}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!profileRes.ok) {
        throw new Error('Failed to update profile fields');
      }

      // Refresh identity in context
      await refreshIdentity();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-card-primary" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative' }}>
        <button 
          onClick={onClose}
          className="btn-outline" 
          style={{ position: 'absolute', top: '1rem', right: '1rem', padding: '0.5rem' }}
        >
          <X size={16} />
        </button>
        
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={24} className="text-primary-blue" /> Edit Profile
        </h2>

        {error && (
          <div style={{ padding: '1rem', color: '#e53e3e', background: 'rgba(229, 62, 62, 0.1)', borderRadius: '8px', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Profile Photo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {initialProfile.profilePhotoUrl && !photoFile ? (
                <img src={initialProfile.profilePhotoUrl} alt="Profile" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--neo-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--neo-inset)' }}>
                  <User size={30} color="var(--text-muted)" />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => setPhotoFile(e.target.files[0])}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', background: 'var(--neo-bg)', border: 'none', boxShadow: 'var(--neo-inset)' }} 
                />
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Name</label>
            <input 
              type="text" 
              placeholder="Your Full Name" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              className="neo-input" 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', boxShadow: 'var(--neo-inset)', background: 'var(--neo-bg)' }} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Department</label>
              <input 
                type="text" 
                placeholder="e.g. Finance" 
                value={formData.department} 
                onChange={e => setFormData({...formData, department: e.target.value})} 
                className="neo-input" 
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', boxShadow: 'var(--neo-inset)', background: 'var(--neo-bg)' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Designation</label>
              <input 
                type="text" 
                placeholder="e.g. Manager" 
                value={formData.designation} 
                onChange={e => setFormData({...formData, designation: e.target.value})} 
                className="neo-input" 
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', boxShadow: 'var(--neo-inset)', background: 'var(--neo-bg)' }} 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Email</label>
              <input 
                type="email" 
                placeholder="Email Address" 
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
                className="neo-input" 
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', boxShadow: 'var(--neo-inset)', background: 'var(--neo-bg)' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Phone</label>
              <input 
                type="text" 
                placeholder="Phone Number" 
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})} 
                className="neo-input" 
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', boxShadow: 'var(--neo-inset)', background: 'var(--neo-bg)' }} 
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
            style={{ marginTop: '1rem', padding: '1rem' }}
          >
            <span>{loading ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
