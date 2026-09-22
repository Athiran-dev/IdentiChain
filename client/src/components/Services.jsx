import React from 'react';
import { UserCheck, Boxes, Shield, ClipboardCheck } from 'lucide-react';

const Services = () => {
  const servicesData = [
    {
      icon: <UserCheck size={32} color="white" />,
      title: "Identity Management",
      desc: "Register and manage decentralized identities (DIDs) securely.",
      gradient: "linear-gradient(135deg, #3b82f6, #1d4ed8)"
    },
    {
      icon: <Boxes size={32} color="white" />,
      title: "Asset Management",
      desc: "Mint, allocate and manage digital assets as unique NFTs.",
      gradient: "linear-gradient(135deg, #6366f1, #4338ca)"
    },
    {
      icon: <Shield size={32} color="white" />,
      title: "Access Control",
      desc: "Role-based access enforced by smart contracts.",
      gradient: "linear-gradient(135deg, #0ea5e9, #0284c7)"
    },
    {
      icon: <ClipboardCheck size={32} color="white" />,
      title: "Audit & Compliance",
      desc: "Immutable on-chain audit trail and reporting.",
      gradient: "linear-gradient(135deg, #64748b, #475569)"
    }
  ];

  return (
    <section id="services" style={{ padding: '6rem 2rem', background: 'var(--neo-bg)', transition: 'background 0.3s ease' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', margin: '4rem 0' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary-blue)', textTransform: 'uppercase', letterSpacing: '2px' }}>Core Capabilities</span>
          <h2 style={{ fontSize: '2.8rem', fontWeight: 800, color: 'var(--primary-dark)', marginTop: '0.5rem' }}>Built for a <span style={{ color: 'var(--primary-blue)' }}>Safer, Smarter</span> Digital Future.</h2>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
          {servicesData.map((service, index) => (
            <div key={index} className="glass-card-primary" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}
                 onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-10px)'; e.currentTarget.style.boxShadow = `0 20px 40px rgba(0,0,0,0.1)`; }}
                 onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--neo-outset)'; }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: service.gradient }}></div>
              <div style={{ background: service.gradient, width: '64px', height: '64px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.15)' }}>
                {service.icon}
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{service.title}</h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{service.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
