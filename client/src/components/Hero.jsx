import React from 'react';
import { ArrowRight, ShieldCheck, Building2, Landmark } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroComponent from '../assets/heroComponenet.png';
import belLogo from '../assets/belLogo.png';
import stamp from '../assets/AshokaStamp.png';

const Hero = () => {
  return (
    <section className="hero-section-wrapper">
      {/* Background Shapes */}
      <div style={{ position: 'absolute', top: 0, left: '-5%', width: '30%', height: '30%', background: 'rgba(235, 244, 255, 0.5)', borderRadius: '50%', filter: 'blur(80px)', zIndex: 0 }}></div>
      <div style={{ position: 'absolute', bottom: '10%', right: '-5%', width: '30%', height: '30%', background: 'rgba(235, 244, 255, 0.5)', borderRadius: '50%', filter: 'blur(80px)', zIndex: 0 }}></div>

      {/* Abstract geometric corners as seen in the image */}
      <div style={{ position: 'absolute', left: '-20px', top: '50%', transform: 'translateY(-50%)', width: '80px', height: '150px', background: 'var(--primary-blue)', borderTopRightRadius: '100px', borderBottomRightRadius: '100px', zIndex: 0 }}></div>
      <div style={{ position: 'absolute', left: '-20px', top: '70%', width: '60px', height: '80px', background: '#fbbf24', borderTopRightRadius: '50px', borderBottomRightRadius: '50px', zIndex: 0 }}></div>
      <div style={{ position: 'absolute', right: '-20px', top: '10%', width: '100px', height: '100px', background: '#fcd34d', transform: 'rotate(45deg)', zIndex: 0 }}></div>

      <div className="hero-grid" style={{ flex: 1, maxWidth: '1300px', width: '100%', margin: '0 auto', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '4rem', alignItems: 'center', zIndex: 10 }}>

        {/* Left Content */}
        <div>
          <div style={{
            display: 'inline-block',
            background: '#e0e7ff',
            color: 'var(--primary-blue)',
            padding: '0.4rem 1rem',
            borderRadius: '99px',
            fontWeight: 700,
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            letterSpacing: '0.5px'
          }}>
            Decentralized Identity & Asset Platform
          </div>

          <h1 style={{
            fontSize: '4rem',
            fontWeight: 800,
            color: 'var(--primary-dark)',
            lineHeight: 1.1,
            marginBottom: '1.5rem',
            letterSpacing: '-1px'
          }}>
            Decentralized <span style={{ color: 'var(--primary-blue)' }}>Identity &<br />Asset</span> Infrastructure
          </h1>

          <p style={{
            fontSize: '1.15rem',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            marginBottom: '2.5rem',
            maxWidth: '90%'
          }}>
            Register identities, tokenize real-world assets, control access, and maintain tamper-proof audit trails — all secured on-chain.
          </p>

          <div className="hero-buttons" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '3rem' }}>
            <Link to="/app" style={{ 
              textDecoration: 'none', padding: '1rem 2rem', fontSize: '1rem', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: '0.5rem', 
              background: '#3b82f6', color: '#ffffff', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)', fontWeight: 'bold', transition: 'all 0.2s' 
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 15px 30px rgba(59, 130, 246, 0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(59, 130, 246, 0.3)'; }}>
              Access Platform <ArrowRight size={18} />
            </Link>
            <a href="#architecture" style={{ 
              textDecoration: 'none', padding: '1rem 2rem', fontSize: '1rem', borderRadius: '99px', 
              color: 'var(--primary-dark)', border: '2px solid var(--primary-dark)', background: 'transparent', transition: 'all 0.2s', fontWeight: 'bold' 
            }} 
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-dark)'; e.currentTarget.style.color = 'var(--neo-bg)'; }} 
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--primary-dark)'; }}>
              Explore Architecture
            </a>
          </div>

          <div className="hero-buttons" style={{ display: 'flex', gap: '2rem', alignItems: 'center', color: 'var(--text-dark)', fontWeight: 600, fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} color="var(--primary-blue)" /> Blockchain Secured
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={18} color="var(--primary-blue)" /> Enterprise Ready
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Landmark size={18} color="var(--primary-blue)" /> Government Backed
            </div>
          </div>
        </div>

        {/* Right Content - 3D Illustration */}
        <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
          <img src={heroComponent} alt="IdentiChain Infrastructure" style={{ width: '100%', maxWidth: '650px', height: 'auto', display: 'block' }} />
        </div>
      </div>

      {/* Footer Trusted By Section */}
      <div style={{
        marginTop: 'auto',
        borderTop: '1px solid var(--border-color)',
        padding: '2rem 0',
        background: 'rgba(0,0,0,0.02)',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        transition: 'background 0.3s ease'
      }}>
        <div className="hero-trusted-flex">
          <div>
            <h4 style={{ color: 'var(--primary-dark)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>Trusted by Government & Enterprises</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Building a secure and transparent digital future together.</p>
          </div>
          <div className="hero-trusted-logos">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img src={stamp} alt="Government of India" style={{ height: '50px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', color: 'var(--primary-dark)', fontWeight: 600, fontSize: '0.9rem' }}>
                <span>Government of India</span>
              </div>
            </div>
            <div style={{ width: '1px', height: '40px', background: 'var(--border-color)' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img src={belLogo} alt="Bharat Electronics Limited" style={{ height: '45px' }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: 'var(--primary-dark)', fontWeight: 700, fontSize: '0.9rem' }}>Bharat Electronics Limited</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Quality. Technology. Innovation</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
