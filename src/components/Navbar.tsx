import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { loadUserTransactionsCache } from '../utils/transactionSync.ts';
import { Wallet, LogIn, Bell, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface NavbarProps {
  onOpenAuth: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TAB_TITLES: Record<string, { section: string; desc: string }> = {
  home: { section: 'Dashboard', desc: 'Ringkasan Akun & Aktivitas' },
  menu: { section: 'Order Layanan', desc: 'Bulk AM & AM Verif API' },
  history: { section: 'Riwayat Transaksi', desc: 'Log Order & Deposit QRIS' },
  deposit: { section: 'Deposit Saldo', desc: 'Top Up Instan QRIS' },
  account: { section: 'Akun Saya', desc: 'Profil & Keamanan Firebase' },
  admin: { section: 'Panel Admin', desc: 'Control Center & API Docs' }
};

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth, activeTab, setActiveTab }) => {
  const { userProfile, storeSettings } = useAuth();
  const currentMeta = TAB_TITLES[activeTab] || TAB_TITLES.home;
  const [notifOpen, setNotifOpen] = useState(false);
  const [pendingDepCount, setPendingDepCount] = useState(0);
  const [notifItems, setNotifItems] = useState<
    Array<{ id: string; title: string; detail: string; status: string; targetTab: string }>
  >([]);
  const notifRef = useRef<HTMLDivElement>(null);

  const isAdmin =
    userProfile?.role === 'admin' ||
    userProfile?.email?.toLowerCase().trim() === 'apriliansyahazril10@gmail.com';

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!userProfile?.uid) {
      setNotifItems([]);
      setPendingDepCount(0);
      return;
    }

    const loadNotifications = () => {
      const cached = loadUserTransactionsCache(userProfile.uid, userProfile.email);
      const recentOrders = (cached.orders || []).slice(0, 3).map((o) => ({
        id: o.id,
        title: `${o.productName} · ${o.status}`,
        detail: `${o.quantity} akun (${o.totalPrice.toLocaleString()})`,
        status: o.status,
        targetTab: 'history'
      }));
      const recentDeposits = (cached.deposits || []).slice(0, 3).map((d) => ({
        id: d.id,
        title: `Deposit QRIS · ${d.status}`,
        detail: `+${d.amount.toLocaleString()} a.n. ${d.senderName}`,
        status: d.status,
        targetTab: 'history'
      }));
      const pendingCount = (cached.deposits || []).filter(
        (d) => d.status === 'Menunggu Konfirmasi Admin'
      ).length;
      setPendingDepCount(pendingCount);
      setNotifItems([...recentDeposits, ...recentOrders].slice(0, 5));
    };

    loadNotifications();
    const timer = setInterval(loadNotifications, 6000);
    return () => clearInterval(timer);
  }, [userProfile?.uid, userProfile?.email, activeTab]);

  return (
    <header className="sticky top-0 md:relative md:top-auto z-30 w-full min-h-14 sm:min-h-16 bg-gradient-to-r from-[#0F2666] via-[#1D4ED8] to-[#2563EB] backdrop-blur-xl border-b border-blue-400/25 shadow-[0_8px_28px_-10px_rgba(37,99,235,0.55)] px-2.5 min-[380px]:px-3 sm:px-6 py-1.5 flex items-center justify-between gap-1.5 sm:gap-2">
      {/* Left Zone: Brand on Mobile (sejajar), Breadcrumb on Desktop */}
      <div className="flex items-center gap-2 min-w-0 shrink-0 md:shrink">
        <button
          onClick={() => setActiveTab('home')}
          className="flex md:hidden items-center gap-1.5 min-[380px]:gap-2 text-left focus:outline-none cursor-pointer min-w-0"
        >
          <div className="w-7 h-7 min-[380px]:w-8 min-[380px]:h-8 rounded-xl bg-white/15 backdrop-blur-md p-1 border border-white/25 shadow-[0_4px_12px_rgba(0,0,0,0.25)] flex items-center justify-center overflow-hidden shrink-0">
            <img
              src="https://cdn.corenexis.com/f/eJVaVCyH.png"
              alt="AM PREMIUM AZRYL"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/am-logo.png';
              }}
            />
          </div>
          <div className="flex items-center whitespace-nowrap">
            <span className="font-display font-extrabold text-[11px] min-[380px]:text-[13px] tracking-tight text-white">
              AM PREMIUM AZRYL
            </span>
          </div>
        </button>

        {/* Desktop Breadcrumb */}
        <div className="hidden md:flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-sm text-white whitespace-nowrap">
              {currentMeta.section}
            </span>
            <span className="text-blue-200/60 hidden lg:inline">/</span>
            <span className="text-xs text-blue-100/80 hidden lg:inline truncate">
              {currentMeta.desc}
            </span>
          </div>
        </div>

        {/* Store Status Badge */}
        <div
          className={`hidden sm:inline-flex items-center gap-1.5 ml-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold backdrop-blur-md shrink-0 ${
            storeSettings?.storeOpen !== false
              ? 'bg-emerald-400/15 border-emerald-300/35 text-emerald-100'
              : 'bg-rose-400/15 border-rose-300/35 text-rose-100'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              storeSettings?.storeOpen !== false ? 'bg-emerald-400' : 'bg-rose-400'
            }`}
          />
          <span>{storeSettings?.storeOpen !== false ? 'Layanan Aktif' : 'Tutup Sementara'}</span>
        </div>
      </div>

      {/* Right Zone: Balance + Notifications + Profile */}
      <div className="flex items-center gap-1 min-[380px]:gap-1.5 sm:gap-2.5 min-w-0 shrink">
        {userProfile ? (
          <>
            {/* Quick Balance Pill */}
            <button
              onClick={() => setActiveTab('deposit')}
              className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-md transition-all text-xs cursor-pointer shrink-0"
              title="Saldo Akun — Klik untuk Deposit"
            >
              <Wallet className="w-3.5 h-3.5 text-sky-200 shrink-0" />
              <span className="font-mono font-bold text-white tabular-nums text-[11px] sm:text-xs">
                {userProfile.balance.toLocaleString()}
              </span>
            </button>

            {/* Real Notification Popover */}
            <div className="relative shrink-0" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen((prev) => !prev)}
                className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer"
                aria-label="Notifikasi"
                title="Notifikasi Aktivitas"
              >
                <Bell className="w-4 h-4" />
                {pendingDepCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-sky-400 text-[#09122C] font-mono font-black text-[9px] flex items-center justify-center shadow">
                    {pendingDepCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-[#1C1E24]/95 backdrop-blur-xl border border-white/12 shadow-[0_20px_50px_rgba(0,0,0,0.75)] p-3 z-50 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-xs font-bold text-white">Notifikasi Transaksi</span>
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        setActiveTab(isAdmin && pendingDepCount > 0 ? 'admin' : 'history');
                      }}
                      className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 cursor-pointer"
                    >
                      Lihat Semua
                    </button>
                  </div>

                  {notifItems.length === 0 ? (
                    <div className="py-5 text-center text-xs text-slate-400">
                      Belum ada aktivitas transaksi terbaru.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {notifItems.map((item) => {
                        const isSuccess = item.status === 'Berhasil';
                        const isPending =
                          item.status.includes('Menunggu') || item.status === 'Sedang diproses';
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setNotifOpen(false);
                              setActiveTab(item.targetTab);
                            }}
                            className="w-full text-left p-2.5 rounded-xl bg-white/[0.04] hover:bg-blue-500/15 border border-white/[0.06] flex items-start gap-2.5 transition-colors cursor-pointer"
                          >
                            <div className="mt-0.5 shrink-0">
                              {isSuccess ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : isPending ? (
                                <Clock className="w-4 h-4 text-sky-400" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-rose-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-white truncate">
                                {item.title}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">{item.detail}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile Button (Name identical on mobile & desktop) */}
            <button
              onClick={() => setActiveTab('account')}
              className="flex items-center gap-1.5 sm:gap-2 py-1 pl-1 pr-2 sm:px-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-md transition-all text-xs cursor-pointer min-w-0 max-w-[84px] min-[390px]:max-w-[120px] sm:max-w-[190px]"
              title="Kelola Akun & Profil"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-white truncate text-[11px] sm:text-xs">
                {userProfile.name}
              </span>
            </button>
          </>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold text-[11px] sm:text-xs border border-white/25 backdrop-blur-md transition-all cursor-pointer whitespace-nowrap"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Masuk / Daftar</span>
          </button>
        )}
      </div>
    </header>
  );
};
