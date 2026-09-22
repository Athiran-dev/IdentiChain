import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import Services from './components/Services';
import HowItWorks from './components/HowItWorks';
import LoginPortals from './components/LoginPortals';
import Footer from './components/Footer';
import BackendTestHarness from './components/BackendTestHarness';
import AppShell from './components/AppShell';
import DashboardRouter from './components/DashboardRouter';

function LandingPage() {
  return (
    <div className="app-container">
      <div className="header-hero-wrapper">
        <Header />
        <main>
          <Hero />
        </main>
      </div>
      <main>
        <Services />
        <HowItWorks />
        <LoginPortals />
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dev-test" element={<BackendTestHarness />} />
      <Route path="/app" element={<AppShell />}>
        <Route index element={<DashboardRouter />} />
      </Route>
    </Routes>
  );
}

export default App;
