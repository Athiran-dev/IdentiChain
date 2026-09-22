import React from 'react';
import { ShieldCheck } from 'lucide-react';
import '../App.css';

const CTA = () => {
  return (
    <section className="cta-section">
      <div className="container">
        <div className="cta-banner">
          <div className="cta-content">
            <div className="cta-illustration">
              <div className="shield-icon-large">
                <ShieldCheck size={64} className="text-white" />
              </div>
            </div>
            <div className="cta-text">
              <h2>Let's Build a Safer Digital India</h2>
              <p>Together, let's stop SIM-swap fraud, protect citizens, and strengthen India's digital infrastructure.</p>
            </div>
          </div>
          <div className="cta-actions">
            <button className="btn-primary">Join the Network</button>
            <button className="btn-outline-white">Contact Us</button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
