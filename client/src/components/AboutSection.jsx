import React from 'react';
import { CheckCircle2, FileText, Download } from 'lucide-react';
import '../App.css';

const AboutSection = () => {
  const highlights = [
    "Decentralized Identifiers (DIDs) with IPFS storage",
    "NFT-based unique and traceable digital assets",
    "Smart-contract enforced roles: Admin, Manager, Auditor, User",
    "Immutable and transparent audit trail",
    "Built using Ethereum / Polygon Blockchain"
  ];

  const documents = [
    { name: "Problem Statement (PS ID: 26125).pdf" },
    { name: "Solution Approach.pdf" },
    { name: "Technical Architecture.pdf" },
    { name: "User Manual (Prototype).pdf" }
  ];

  return (
    <section className="about-section">
      <div className="container about-grid">
        {/* About IdentiChain */}
        <div className="about-column">
          <h3 className="column-title">About IdentiChain</h3>
          <p className="about-text">
            IdentiChain is a blockchain-powered platform developed for Bharat Electronics Limited to securely manage identities, control access, and track digital/physical assets using NFTs and smart contracts.
            <br/><br/>
            It ensures decentralization, security and full transparency across the asset lifecycle.
          </p>
          <div className="city-illustration"></div>
        </div>

        {/* Key Highlights */}
        <div className="about-column">
          <h3 className="column-title">Key Highlights</h3>
          <ul className="highlights-list">
            {highlights.map((item, index) => (
              <li key={index}>
                <CheckCircle2 size={20} className="text-success" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Important Documents */}
        <div className="about-column">
          <h3 className="column-title">Important Documents</h3>
          <ul className="documents-list">
            {documents.map((doc, index) => (
              <li key={index}>
                <div className="doc-info">
                  <FileText size={18} className="text-danger" />
                  <span>{doc.name}</span>
                </div>
                <button className="btn-download">
                  <Download size={18} className="text-primary-blue" />
                </button>
              </li>
            ))}
          </ul>
          <a href="#" className="view-all-docs">View All Documents &rarr;</a>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
