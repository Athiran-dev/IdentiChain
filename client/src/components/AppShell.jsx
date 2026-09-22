import React, { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { LogOut, ShieldAlert, User, Edit3, Moon, Sun } from 'lucide-react';
import ProfileModal from './ProfileModal';
import logo from '../assets/logo.png';

function RoleBadge({ role }) {
  const colors = {
    NONE: '#718096',
    EMPLOYEE: '#3182ce',
    MANAGER: '#805ad5',
    AUDITOR: '#dd6b20',
    ADMIN: '#e53e3e',
  };
  
  return (
    <span style={{
      backgroundColor: colors[role] || colors.NONE,
      color: 'white',
      padding: '4px 12px',
      borderRadius: '999px',
      fontSize: '0.8rem',
      fontWeight: '600',
      boxShadow: 'var(--neo-outset-sm)'
    }}>
      {role || 'NONE'}
    </span>
  );
}

export default function AppShell() {
  const { token, identity, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = useState(false);

  // If not signed in (no JWT), force them back to landing page where they can Connect & Sign In
  if (!token) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '2rem' }}>You must be signed in to view the dashboard</h2>
        <Link to="/" className="btn-primary"><span>Return to Home</span></Link>
      </div>
    );
  }

  const role = identity?.onChain?.role || 'NONE';
  const name = identity?.profile?.name || 'User';
  const wallet = identity?.profile?.walletAddress || '0x...';
  const profilePhotoUrl = identity?.profile?.profilePhotoUrl;

  const handleSignOut = () => {
    signOut();
    navigate('/');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', transition: 'background 0.3s ease' }}>
      <header style={{ 
        padding: '1rem 2rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.05)',
        marginBottom: '2rem',
        background: theme === 'dark' ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-color)',
        transition: 'background 0.3s ease',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link to="/app" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', gap: '0.75rem' }}>
            <img src={logo} alt="IdentiChain" style={{ height: '56px' }} />
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary-dark)', letterSpacing: '-0.5px' }}>IdentiChain</span>
          </Link>
          <RoleBadge role={role} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button 
            onClick={toggleTheme} 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-dark)', 
              cursor: 'pointer', 
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
          </button>
          
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--neo-bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            onClick={() => setShowProfileModal(true)}
            title="Edit Profile"
          >
            {profilePhotoUrl ? (
              <img src={profilePhotoUrl} alt="Profile" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', boxShadow: 'var(--neo-outset-sm)' }} />
            ) : (
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--neo-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--neo-inset)' }}>
                <User size={20} color="var(--text-muted)" />
              </div>
            )}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end', color: 'var(--primary-dark)' }}>
                {name} <Edit3 size={12} color="var(--primary-blue)" />
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {wallet.slice(0,6)}...{wallet.slice(-4)}
              </div>
            </div>
          </div>
          <button onClick={handleSignOut} className="btn-primary" style={{ padding: '0.5em 1em' }}>
            <span><LogOut size={16} /> Sign Out</span>
          </button>
        </div>
      </header>

      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}

      <main className="container" style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}

export { RoleBadge };
