import React from 'react';
import { Shield, UserCog, Search, User, ArrowRight, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../App.css';

const LoginPortals = () => {
  const portals = [
    {
      icon: <Shield size={24} color="white" />,
      role: "Administrator",
      gradient: "linear-gradient(135deg, #3b82f6, #1d4ed8)"
    },
    {
      icon: <UserCog size={24} color="white" />,
      role: "Manager",
      gradient: "linear-gradient(135deg, #6366f1, #4338ca)"
    },
    {
      icon: <Search size={24} color="white" />,
      role: "Auditor",
      gradient: "linear-gradient(135deg, #0ea5e9, #0284c7)"
    },
    {
      icon: <User size={24} color="white" />,
      role: "User",
      gradient: "linear-gradient(135deg, #64748b, #475569)"
    }
  ];

  return (
    <section className="login-portals-section">
      <div className="container login-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Left Column: SecureDocs */}
        <div className="securedocs-container glass-card-primary" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', color: 'white', padding: '3rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: '0 20px 40px rgba(30, 58, 138, 0.3)' }}>
          <h3 style={{ color: 'white', fontSize: '2.5rem', marginBottom: '0.5rem', textShadow: '0 2px 10px rgba(255,255,255,0.2)' }}>SecureDocs</h3>
          <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '2.5rem', fontSize: '1.1rem' }}>Justice through technology</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateX(5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(59, 130, 246, 0.4)' }}>
              <div style={{ width: '0', height: '0', borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '12px solid white', marginLeft: '4px' }}></div>
            </div>
            <div>
              <div style={{ fontWeight: '600' }}>Watch Demo</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>2:48</div>
            </div>
          </div>
        </div>

        {/* Right Column: Access the Platform & Latest Updates */}
        <div className="access-column" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="access-platform-card glass-card-secondary" style={{ padding: '2rem' }}>
            <div className="section-header" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Access the Platform</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Choose your authorized role to continue.</p>
            </div>
            <div className="portals-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {portals.map((portal, index) => (
                <Link to="/app" key={index} className="portal-card" style={{ padding: '1.25rem', cursor: 'pointer', textDecoration: 'none', color: 'inherit', border: '1px solid var(--border-color)', transition: 'all 0.3s' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 10px 20px rgba(0,0,0,0.1)`; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                  <div className="portal-icon" style={{ background: portal.gradient, boxShadow: '0 8px 16px rgba(0,0,0,0.15)' }}>
                    {portal.icon}
                  </div>
                  <div className="portal-info">
                    <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{portal.role}</h4>
                  </div>
                  <ArrowRight size={16} className="text-muted" />
                </Link>
              ))}
            </div>
          </div>

          <div className="latest-updates-card glass-card-secondary" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Latest Updates</h3>
              <a href="#" style={{ fontSize: '0.85rem', fontWeight: '600' }}>View All &rarr;</a>
            </div>
            <ul style={{ listStyle: 'none', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <li style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--glass-border)' }}>SIH2026 - Internal Hackathon portal is now live.</li>
              <li style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--glass-border)' }}>Guidelines for Digital Signature Integration released.</li>
              <li style={{ padding: '0.5rem 0' }}>System maintenance scheduled on 25 May 2026.</li>
            </ul>
          </div>

        </div>
      </div>
    </section>
  );
};

export default LoginPortals;
