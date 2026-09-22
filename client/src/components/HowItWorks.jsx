import React from 'react';
import { UserPlus, Users, Image as ImageIcon, RefreshCw, FileCheck, ArrowRight } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      icon: <UserPlus size={24} color="white" />,
      title: "Register Identity",
      desc: "Admin registers a user and creates a DID.",
      gradient: "linear-gradient(135deg, #3b82f6, #1d4ed8)"
    },
    {
      icon: <Users size={24} color="white" />,
      title: "Assign Role",
      desc: "Admin assigns a role (Admin / Manager / Auditor / Employee).",
      gradient: "linear-gradient(135deg, #6366f1, #4338ca)"
    },
    {
      icon: <ImageIcon size={24} color="white" />,
      title: "Mint Asset",
      desc: "Mint an NFT asset and allocate it to the identity.",
      gradient: "linear-gradient(135deg, #0ea5e9, #0284c7)"
    },
    {
      icon: <RefreshCw size={24} color="white" />,
      title: "Access Control",
      desc: "Managers transfer assets and grant access rights securely.",
      gradient: "linear-gradient(135deg, #64748b, #475569)"
    },
    {
      icon: <FileCheck size={24} color="white" />,
      title: "Audit Trail",
      desc: "Every action is recorded on-chain, ensuring transparency.",
      gradient: "linear-gradient(135deg, #3b82f6, #6366f1)"
    }
  ];

  return (
    <section style={{ padding: '6rem 2rem', background: 'var(--background-light)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary-blue)', textTransform: 'uppercase', letterSpacing: '2px' }}>Platform Workflow</span>
          <h2 style={{ fontSize: '2.8rem', fontWeight: 800, color: 'var(--primary-dark)', marginTop: '0.5rem' }}>From <span style={{ color: 'var(--primary-blue)' }}>Identity</span> to <span style={{ color: 'var(--primary-blue)' }}>Integrity</span></h2>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
          {steps.map((step, index) => (
            <div key={index} className="glass-card-primary" style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', position: 'relative', border: '1px solid var(--border-color)' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: step.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.15)' }}>
                {step.icon}
              </div>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{step.title}</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{step.desc}</p>
              
              <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '30px', height: '30px', borderRadius: '50%', background: step.gradient, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
