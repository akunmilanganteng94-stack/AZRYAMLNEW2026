/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ToastProvider } from './components/Toast.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { HomeView } from './components/HomeView.tsx';
import { ProductsView } from './components/ProductsView.tsx';
import { DepositView } from './components/DepositView.tsx';
import { HistoryView } from './components/HistoryView.tsx';
import { AccountView } from './components/AccountView.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';

function MainApp() {
  const { userProfile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedProductId, setSelectedProductId] = useState<string>('bulk-am');
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [resetOobCode, setResetOobCode] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    if (mode === 'resetPassword' && oobCode) {
      setResetOobCode(oobCode);
      setIsAuthOpen(true);
    }
  }, []);

  const handleClearResetCode = () => {
    setResetOobCode(null);
    if (window.location.search.includes('oobCode')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  // If user tries to access admin tab without permissions, fallback to home
  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeView
            setActiveTab={setActiveTab}
            setSelectedProduct={setSelectedProductId}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        );
      case 'menu':
        return (
          <ProductsView
            selectedProductId={selectedProductId}
            setSelectedProductId={setSelectedProductId}
            setActiveTab={setActiveTab}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        );
      case 'deposit':
        return (
          <DepositView
            setActiveTab={setActiveTab}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        );
      case 'history':
        return (
          <HistoryView
            onOpenAuth={() => setIsAuthOpen(true)}
            setActiveTab={setActiveTab}
          />
        );
      case 'account':
        return (
          <AccountView
            onOpenAuth={() => setIsAuthOpen(true)}
            setActiveTab={setActiveTab}
          />
        );
      case 'admin':
        return <AdminPanel setActiveTab={setActiveTab} />;
      default:
        return (
          <HomeView
            setActiveTab={setActiveTab}
            setSelectedProduct={setSelectedProductId}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#050814] text-slate-100 flex relative selection:bg-blue-600 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[400px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[400px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Desktop Collapsible Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <Navbar
          onOpenAuth={() => setIsAuthOpen(true)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderContent()}
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        resetOobCode={resetOobCode}
        onClearResetCode={handleClearResetCode}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  );
}
