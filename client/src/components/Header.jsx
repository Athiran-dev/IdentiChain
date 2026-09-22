import React, { useState } from 'react';
import { Search, Globe, Accessibility, Menu, LogOut, ShieldCheck, ChevronDown, Wallet, Moon, Sun } from 'lucide-react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import stamp from '../assets/AshokaStamp.png';
import belLogo from '../assets/belLogo.png';

const Header = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="header-fixed-wrapper">
      {/* Unified Glassmorphic Header Block */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.05)'
      }}>
        {/* IdentiChain Nav Bar */}
        <header className="header-container">
          <div className="header-left">
            <Link to="/" className="header-logo-link">
              <img src={logo} alt="IdentiChain" className="header-logo-img" />
              <span className="header-logo-text">IDENTICHAIN</span>
            </Link>
            
            <nav className="header-nav">
              <NavLink href="/" active={true}>Home</NavLink>
              <NavLink href="#platform">Platform</NavLink>
              <NavLink href="#solutions">Solutions</NavLink>
              <NavLink href="#security">Security</NavLink>
              <NavLink href="#resources">Resources</NavLink>
            </nav>
          </div>

          <div className="header-right">
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
            <WalletConnectButton />
          </div>
        </header>
      </div>
    </div>
  );
};

const NavLink = ({ href, children, active }) => {
  const [hover, setHover] = useState(false);
  return (
    <a 
      href={href} 
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ 
        textDecoration: 'none', 
        color: active ? 'var(--primary-blue)' : 'var(--text-color)', 
        fontWeight: active ? 700 : 600,
        padding: '0.5rem 1rem',
        borderRadius: '99px',
        background: hover ? 'rgba(0,0,0,0.05)' : 'transparent',
        transition: 'all 0.2s ease',
        fontSize: '0.95rem',
        borderBottom: active ? '2px solid var(--primary-blue)' : '2px solid transparent',
        borderRadius: active ? '0' : '99px' // The image shows an underline for active, not a pill background
      }}
    >
      {children}
    </a>
  );
};

function WalletConnectButton() {
  const { isConnected, address } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { token, signIn, signOut, loading, error } = useAuth();
  const navigate = useNavigate();
  const [hover, setHover] = useState(false);

  React.useEffect(() => {
    if (token && window.location.pathname === '/') {
      navigate('/app');
    }
  }, [token, navigate]);

  const btnStyle = {
    background: '#0f172a',
    color: 'white',
    border: 'none',
    padding: '0.6rem 1.5rem',
    borderRadius: '99px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: hover ? '0 10px 25px rgba(15, 23, 42, 0.3)' : '0 4px 10px rgba(15, 23, 42, 0.15)',
    transform: hover ? 'translateY(-2px)' : 'translateY(0)'
  };

  if (!isConnected) {
    return (
      <button 
        style={btnStyle}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => connect({ connector: injected() })}
        disabled={isPending}
      >
        <Wallet size={18} /> {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>
    );
  }

  if (!token) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.05)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success-green)' }}></div>
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>
        <button 
          style={btnStyle}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onClick={signIn}
          disabled={loading}
        >
          <ShieldCheck size={18} /> {loading ? 'Authenticating...' : 'Sign In'}
        </button>
        {error && <div style={{ color: '#e53e3e', fontSize: '0.8rem', position: 'absolute', right: '2rem', top: '100%' }}>{error}</div>}
      </div>
    );
  }

  // Connected and signed in
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.05)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success-green)' }}></div>
        {address.slice(0, 6)}...{address.slice(-4)}
      </div>
      <Link to="/app" style={{ ...btnStyle, textDecoration: 'none' }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        Dashboard
      </Link>
      <button onClick={signOut} style={{ padding: '0.5rem', background: 'transparent', color: '#e53e3e', border: 'none', cursor: 'pointer', transition: 'all 0.2s', borderRadius: '8px' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(229, 62, 62, 0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <LogOut size={18} />
      </button>
    </div>
  );
}

export default Header;
