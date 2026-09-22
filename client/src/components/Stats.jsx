import React from 'react';
import { ShieldAlert, Fingerprint, Lock, Clock } from 'lucide-react';

const Stats = () => {
  const statsData = [
    {
      icon: <Fingerprint size={32} color="var(--primary-blue)" />,
      title: "100%",
      desc: "Cryptographic Identity Verification",
    },
    {
      icon: <Lock size={32} color="var(--primary-blue)" />,
      title: "Zero",
      desc: "Single Point of Failure (SPOF)",
    },
    {
      icon: <ShieldAlert size={32} color="var(--primary-blue)" />,
      title: "Tamper-Proof",
      desc: "Immutable Audit Ledgers",
    },
    {
      icon: <Clock size={32} color="var(--primary-blue)" />,
      title: "Real-time",
      desc: "Access Control & Monitoring",
    }
  ];

  return (
    <section style={{ padding: '4rem 2rem', background: 'var(--primary-dark)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.05, background: 'radial-gradient(circle at 50% 50%, var(--primary-blue) 0%, transparent 50%)' }}></div>
      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
          {statsData.map((stat, index) => (
            <div key={index} className="glass-card-secondary" style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '1rem', borderRadius: '50%' }}>
                {stat.icon}
              </div>
              <div>
                <h3 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.25rem' }}>{stat.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', lineHeight: 1.4 }}>{stat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
