import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { HomeDashboard } from './components/home/HomeDashboard';
import { ProductCard } from './components/products/ProductCard';
import { BulkOrderModal } from './components/products/BulkOrderModal';
import { VerifOrderModal } from './components/products/VerifOrderModal';
import { DepositView } from './components/deposit/DepositView';
import { TransactionHistory } from './components/history/TransactionHistory';
import { AccountView } from './components/account/AccountView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AuthModal } from './components/auth/AuthModal';
import { ToastContainer, ToastMessage } from './components/ui/Toast';
import { CardSkeleton } from './components/ui/Skeleton';
import { StoreStatus, OrderItem } from './types';
import { ShieldCheck, Zap } from 'lucide-react';

function MainAppContent() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [storeStatus, setStoreStatus] = useState<StoreStatus | null>(null);
  const [userStats, setUserStats] = useState<{
    totalOrders: number;
    successOrders: number;
    totalApprovedDeposits: number;
    totalSpent: number;
  } | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderItem[]>([]);

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [verifModalOpen, setVerifModalOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchStoreStatus = async () => {
    try {
      const res = await fetch('/api/store/status');
      if (res.ok) {
        const data = await res.json();
        setStoreStatus(data);
      }
    } catch (err) {
      console.error('Failed to load store status:', err);
    }
  };

  const fetchUserData = async () => {
    if (!user) {
      setUserStats(null);
      setRecentOrders([]);
      return;
    }
    try {
      const [profRes, histRes] = await Promise.all([
        fetch(`/api/user/profile?uid=${user.uid}`),
        fetch(`/api/user/history?uid=${user.uid}`),
      ]);

      if (profRes.ok) {
        const pData = await profRes.json();
        setUserStats(pData.stats);
      }

      if (histRes.ok) {
        const hData = await histRes.json();
        setRecentOrders(hData.orders || []);
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  };

  useEffect(() => {
    fetchStoreStatus();
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [user, profile]);

  const bulkPrice =
    storeStatus?.products.find((p) => p.id === 'bulk-am')?.price ?? 200;
  const verifPrice =
    storeStatus?.products.find((p) => p.id === 'am-verif')?.price ?? 300;
  const storeOpen = storeStatus?.storeOpen ?? true;

  return (
    <div className="min-h-screen bg-transparent text-slate-900 flex flex-col antialiased">
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      <div className="flex flex-1">
        {/* Desktop Collapsible Glassmorphism Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          onOpenAuth={() => setAuthModalOpen(true)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Navbar */}
          <Navbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenAuth={() => setAuthModalOpen(true)}
            storeOpen={storeOpen}
          />

          {/* Body Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {activeTab === 'home' && (
              <HomeDashboard
                storeStatus={storeStatus}
                userStats={userStats}
                recentOrders={recentOrders}
                onOrderBulk={() => setBulkModalOpen(true)}
                onOrderVerif={() => setVerifModalOpen(true)}
                onNavigateDeposit={() => setActiveTab('deposit')}
                onNavigateHistory={() => setActiveTab('history')}
                onOpenAuth={() => setAuthModalOpen(true)}
              />
            )}

            {activeTab === 'products' && (
              <div className="max-w-5xl mx-auto space-y-6 pb-20 lg:pb-10">
                <div className="border-b border-blue-500/15 pb-4">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                      Order Layanan Digital AM
                    </h1>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30 font-bold">
                      OFFICIAL AM
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Pilih paket akun Alight Motion Bulk atau verifikasi magic link resmi.
                  </p>
                </div>

                {!storeStatus ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CardSkeleton />
                    <CardSkeleton />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ProductCard
                      id="bulk-am"
                      name="Bulk AM"
                      price={bulkPrice}
                      description="Order akun Alight Motion Bulk instan otomatis. Minimal 1 akun, maksimal 5 akun per proses dengan pengiriman terkonfirmasi."
                      active={true}
                      storeOpen={storeOpen}
                      onOrder={user ? () => setBulkModalOpen(true) : () => setAuthModalOpen(true)}
                      variant="bulk"
                    />

                    <ProductCard
                      id="am-verif"
                      name="AM Verif"
                      price={verifPrice}
                      description="Layanan verifikasi akun Alight Motion resmi menggunakan magic link. Status terkonfirmasi langsung dari server Alight Creative."
                      active={true}
                      storeOpen={storeOpen}
                      onOrder={user ? () => setVerifModalOpen(true) : () => setAuthModalOpen(true)}
                      variant="verif"
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'deposit' && (
              <DepositView
                onSuccessToast={(msg) => addToast(msg, 'success')}
                onOpenAuth={() => setAuthModalOpen(true)}
              />
            )}

            {activeTab === 'history' && <TransactionHistory />}

            {activeTab === 'account' && (
              <AccountView
                onNavigateDeposit={() => setActiveTab('deposit')}
                onNavigateAdmin={() => setActiveTab('admin')}
                onOpenAuth={() => setAuthModalOpen(true)}
                onSuccessToast={(msg) => addToast(msg, 'success')}
              />
            )}

            {activeTab === 'admin' && (
              <AdminDashboard onSuccessToast={(msg) => addToast(msg, 'success')} />
            )}
          </main>

          {/* Minimalist Professional Footer */}
          <footer className="border-t border-slate-200/80 py-6 px-4 text-center text-xs text-slate-500 mb-16 lg:mb-0 bg-white/40 backdrop-blur-md">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">AM PREMIUM</span>
                <span aria-hidden="true" className="text-slate-400">·</span>
                <span className="text-slate-500 font-medium">Powered by AZRYL</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Layanan Digital & Verifikasi AM Terpercaya · Sistem Atomik & Aman
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccessToast={(msg) => addToast(msg, 'success')}
      />

      <BulkOrderModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        pricePerUnit={bulkPrice}
        onNavigateDeposit={() => setActiveTab('deposit')}
        onSuccessOrder={(msg) => {
          addToast(msg, 'success');
          fetchUserData();
        }}
      />

      <VerifOrderModal
        isOpen={verifModalOpen}
        onClose={() => setVerifModalOpen(false)}
        price={verifPrice}
        onNavigateDeposit={() => setActiveTab('deposit')}
        onSuccessOrder={(msg) => {
          addToast(msg, 'success');
          fetchUserData();
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
