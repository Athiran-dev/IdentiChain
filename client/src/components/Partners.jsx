import React from 'react';
import { Shield, Building2, Landmark, ShieldAlert, Network } from 'lucide-react';

const Partners = () => {
  const partners = [
    {
      icon: <Building2 size={32} color="var(--primary-dark)" />,
      name: "Enterprises",
      desc: "Fortune 500 Ready"
    },
    {
      icon: <Shield size={32} color="var(--primary-dark)" />,
      name: "Security",
      desc: "Military-Grade Cryptography"
    },
    {
      icon: <Landmark size={32} color="var(--primary-dark)" />,
      name: "Compliance",
      desc: "Regulatory Approved"
    },
    {
      icon: <Network size={32} color="var(--primary-blue)" />,
      name: "Web3 Native",
      desc: "Built on Ethereum"
    }
  ];

  return (
    <section style={{ padding: '4rem 2rem', background: '#f8f9fc', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', marginBottom: '3rem' }}>
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.1))', flex: 1 }}></div>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600 }}>Trusted Infrastructure</h3>
          <div style={{ height: '1px', background: 'linear-gradient(270deg, transparent, rgba(0,0,0,0.1))', flex: 1 }}></div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '3rem' }}>
          {partners.map((partner, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '1rem', opacity: 0.7, filter: 'grayscale(100%)', transition: 'all 0.3s ease', cursor: 'pointer' }}
                 onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.filter = 'grayscale(0%)'; }}
                 onMouseLeave={e => { e.currentTarget.style.opacity = 0.7; e.currentTarget.style.filter = 'grayscale(100%)'; }}>
              <div style={{ background: 'var(--neo-bg)', padding: '1rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                {partner.icon}
              </div>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{partner.name}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{partner.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Partners;
