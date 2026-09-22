import React from 'react';
import { Link } from 'react-router-dom';
import logowithName from '../assets/logowithName.png';
import { ArrowUp, ArrowRight } from 'lucide-react';

const Footer = () => {
  return (
    <footer style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Top CTA Section */}
      <div style={{
        backgroundColor: '#0a1945',
        position: 'relative',
        overflow: 'hidden',
        padding: '3.5rem 2rem'
      }}>
        {/* Orange Accent Left */}
        <div style={{
          position: 'absolute',
          left: '-20px',
          top: '-20px',
          width: '80px',
          height: '140px',
          backgroundColor: '#ff8a00',
          transform: 'rotate(30deg)',
          zIndex: 1
        }}></div>

        {/* Orange Accent Right */}
        <div style={{
          position: 'absolute',
          right: '-20px',
          top: '-40px',
          width: '60px',
          height: '100px',
          backgroundColor: '#ff8a00',
          transform: 'rotate(-45deg)',
          zIndex: 1
        }}></div>

        {/* Subtle Background Waves (using radial gradients to simulate) */}
        <div style={{
          position: 'absolute',
          right: '10%',
          bottom: '-50%',
          width: '600px',
          height: '600px',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '50%',
          zIndex: 0
        }}></div>
        <div style={{
          position: 'absolute',
          right: '5%',
          bottom: '-60%',
          width: '800px',
          height: '800px',
          border: '1px solid rgba(255,255,255,0.03)',
          borderRadius: '50%',
          zIndex: 0
        }}></div>

        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          zIndex: 2,
          flexWrap: 'wrap',
          gap: '2rem'
        }}>
          <div>
            <p style={{ color: '#a0aec0', fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              The future is verifiable.
            </p>
            <h2 style={{ color: 'white', fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2, maxWidth: '600px' }}>
              Build a more secure and<br/>verifiable digital infrastructure.
            </h2>
          </div>
          <div>
            <Link to="/app" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'white',
              color: '#0a1945',
              padding: '1rem 2rem',
              borderRadius: '999px',
              fontSize: '1rem',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.2)'; }}
            >
              Access Platform <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Footer Section */}
      <div style={{ backgroundColor: '#050c24', color: 'rgba(255,255,255,0.7)', padding: '4rem 2rem 2rem 2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem', marginBottom: '4rem' }}>
            
            {/* Brand Column */}
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <img src={logowithName} alt="IdentiChain Logo" style={{ height: '36px', filter: 'brightness(0) invert(1)' }} />
              </div>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '2rem', maxWidth: '300px' }}>
                Decentralized Identity & Asset Management.<br/>
                For a more secure and transparent tomorrow.
              </p>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <a href="https://github.com/Athiran-dev/IdentiChain" target="_blank" rel="noopener noreferrer" aria-label="GitHub" style={{ color: 'white', transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 0.7} onMouseLeave={e => e.currentTarget.style.opacity = 1}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                </a>
                <a href="#" aria-label="LinkedIn" style={{ color: 'white', transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 0.7} onMouseLeave={e => e.currentTarget.style.opacity = 1}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                </a>
                <a href="#" aria-label="X" style={{ color: 'white', transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 0.7} onMouseLeave={e => e.currentTarget.style.opacity = 1}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z"></path><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"></path></svg>
                </a>
              </div>
            </div>

            {/* Platform Links */}
            <div>
              <h4 style={{ color: 'white', fontWeight: 600, marginBottom: '1.5rem', fontSize: '0.95rem' }}>Platform</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <li><a href="#" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.85rem' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>Architecture</a></li>
                <li><a href="#" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.85rem' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>Identity (DID)</a></li>
                <li><a href="#" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.85rem' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>Assets (NFTs)</a></li>
                <li><a href="#" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.85rem' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>Smart Contracts</a></li>
              </ul>
            </div>

            {/* Resources Links */}
            <div>
              <h4 style={{ color: 'white', fontWeight: 600, marginBottom: '1.5rem', fontSize: '0.95rem' }}>Resources</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <li><a href="#" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.85rem' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>Documentation</a></li>
                <li><a href="#" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.85rem' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>API Reference</a></li>
                <li><a href="#" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.85rem' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>Security Audits</a></li>
                <li><a href="#" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.85rem' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>Whitepaper</a></li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 style={{ color: 'white', fontWeight: 600, marginBottom: '1.5rem', fontSize: '0.95rem' }}>Company</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <li><a href="#" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.85rem' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>Privacy Policy</a></li>
                <li><a href="#" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.85rem' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>Terms of Service</a></li>
                <li><a href="#" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.85rem' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>Contact Us</a></li>
              </ul>
            </div>

            {/* Smart Contracts Links */}
            <div style={{ gridColumn: 'span 2' }}>
              <h4 style={{ color: 'white', fontWeight: 600, marginBottom: '1.5rem', fontSize: '0.95rem' }}>Smart Contracts (Sepolia)</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <li>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginBottom: '0.2rem' }}>Identity Registry</div>
                  <a href={`https://sepolia.etherscan.io/address/${import.meta.env.VITE_IDENTITY_REGISTRY_ADDRESS || '0xE97f4e0A31E9F6b5E1629294183F2b7FeC01DD79'}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--success-green)', textDecoration: 'none', fontSize: '0.8rem', wordBreak: 'break-all' }} onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                    {import.meta.env.VITE_IDENTITY_REGISTRY_ADDRESS || '0xE97f4e0A31E9F6b5E1629294183F2b7FeC01DD79'}
                  </a>
                </li>
                <li>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginBottom: '0.2rem' }}>Audit Registry</div>
                  <a href={`https://sepolia.etherscan.io/address/${import.meta.env.VITE_AUDIT_REGISTRY_ADDRESS || '0xd465c059EE2DCAb139fb934C9a5D6A62f9B1a585'}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--success-green)', textDecoration: 'none', fontSize: '0.8rem', wordBreak: 'break-all' }} onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                    {import.meta.env.VITE_AUDIT_REGISTRY_ADDRESS || '0xd465c059EE2DCAb139fb934C9a5D6A62f9B1a585'}
                  </a>
                </li>
                <li>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginBottom: '0.2rem' }}>Asset NFT</div>
                  <a href={`https://sepolia.etherscan.io/address/${import.meta.env.VITE_ASSET_NFT_ADDRESS || '0x21fBd36c6C6EBB7C42Fdb2a69dDB8Aa38E578735'}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--success-green)', textDecoration: 'none', fontSize: '0.8rem', wordBreak: 'break-all' }} onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                    {import.meta.env.VITE_ASSET_NFT_ADDRESS || '0x21fBd36c6C6EBB7C42Fdb2a69dDB8Aa38E578735'}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>
            <div>
              &copy; 2026 IdentiChain. All rights reserved.
            </div>
            <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'} onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
              Back to Top <ArrowUp size={14} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
