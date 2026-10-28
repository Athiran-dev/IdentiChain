import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import Services from './components/Services';
import HowItWorks from './components/HowItWorks';
import LoginPortals from './components/LoginPortals';
import Footer from './components/Footer';

const BackendTestHarness = lazy(() => import('./components/BackendTestHarness'));
const AppShell = lazy(() => import('./components/AppShell'));
const DashboardRouter = lazy(() => import('./components/DashboardRouter'));

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
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>}>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dev-test" element={<BackendTestHarness />} />
      <Route path="/app" element={<AppShell />}>
        <Route index element={<DashboardRouter />} />
      </Route>
    </Routes>
    </Suspense>
  );
}

export default App;
