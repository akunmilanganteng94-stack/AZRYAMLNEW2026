import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Home,
  ShoppingBag,
  Clock,
  Wallet,
  User,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  PlusCircle
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  onOpenAuth: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  onOpenAuth
}) => {
  const { userProfile, logout } = useAuth();

  const isAdmin =
    userProfile?.role === 'admin' ||
    userProfile?.email?.toLowerCase().trim() === 'apriliansyahazril10@gmail.com';

  const mainNavItems = [
    { id: 'home', label: 'Dashboard', icon: Home },
    { id: 'menu', label: 'Order Layanan', icon: ShoppingBag },
    { id: 'history', label: 'Riwayat Transaksi', icon: Clock },
    { id: 'deposit', label: 'Deposit Saldo', icon: Wallet },
    { id: 'account', label: 'Akun Saya', icon: User },
    ...(isAdmin ? [{ id: 'admin', label: 'Panel Admin', icon: ShieldCheck }] : [])
  ];

  return (
    <aside
      className={`hidden md:flex flex-col justify-between h-screen sticky top-0 transition-all duration-200 z-40 bg-[#14161D]/95 backdrop-blur-xl border-r border-white/[0.08] ${
        collapsed ? 'w-[84px]' : 'w-[272px]'
      }`}
    >
      {/* Top Workspace Brand + Balance + Navigation */}
      <div className="flex flex-col min-h-0 overflow-y-auto">
        {/* Header Brand (Sejajar AM PREMIUM AZRYL) */}
        <div className="h-16 flex items-center justify-between px-4 bg-gradient-to-r from-[#0B1E4F] via-[#173B9A] to-[#1D4ED8] border-b border-blue-400/20">
          {!collapsed ? (
            <button
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-white/15 p-1 border border-white/25 shadow-[0_4px_12px_rgba(0,0,0,0.3)] flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src="https://cdn.corenexis.com/f/eJVaVCyH.png"
                  alt="AM PREMIUM AZRYL"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/am-logo.png';
                  }}
                />
              </div>
              <span className="font-display font-extrabold text-[13px] tracking-tight text-white whitespace-nowrap truncate">
                AM PREMIUM AZRYL
              </span>
            </button>
          ) : (
            <div className="mx-auto w-9 h-9 rounded-xl bg-white/15 p-1 border border-white/25 flex items-center justify-center overflow-hidden">
              <img
                src="https://cdn.corenexis.com/f/eJVaVCyH.png"
                alt="AM PREMIUM AZRYL"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/am-logo.png';
                }}
              />
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all cursor-pointer shrink-0"
            title={collapsed ? 'Perluas Sidebar' : 'Perkecil Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Blue Gradient Sidebar Balance Card */}
        {!collapsed ? (
          <div className="p-4 border-b border-white/[0.06]">
            <div className="p-4 rounded-2xl md-blue-gradient border border-blue-300/25 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-blue-100/90">
                  Saldo Akun
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 border border-white/20 font-mono font-semibold text-white">
                  QRIS Ready
                </span>
              </div>

              <div className="font-display font-black text-2xl text-white tabular-nums tracking-tight">
                {userProfile ? userProfile.balance.toLocaleString() : '0'}
              </div>

              {userProfile ? (
                <button
                  onClick={() => setActiveTab('deposit')}
                  className="w-full py-2 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-semibold flex items-center justify-center gap-1.5 backdrop-blur-sm transition-all cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Top Up Saldo</span>
                </button>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="w-full py-2 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Login / Daftar</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3 border-b border-white/[0.06] text-center">
            <button
              onClick={() => setActiveTab('deposit')}
              className="w-11 h-11 mx-auto rounded-xl bg-gradient-to-br from-[#2563EB] to-[#0EA5E9] border border-blue-300/25 shadow-[0_6px_18px_-4px_rgba(37,99,235,0.6)] flex items-center justify-center text-white hover:brightness-110 transition-all cursor-pointer"
              title="Isi Saldo"
            >
              <Wallet className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Section Heading */}
        {!collapsed && (
          <div className="px-4 pt-4 pb-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-slate-500">
              Menu Utama
            </span>
          </div>
        )}

        {/* Vertical Navigation Links */}
        <nav className="px-3 py-2 space-y-1.5">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isAdminItem = item.id === 'admin';

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white border border-blue-300/25 shadow-[0_8px_22px_-6px_rgba(37,99,235,0.65)]'
                    : isAdminItem
                    ? 'text-sky-300 border border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/20 hover:text-white'
                    : 'text-slate-400 border border-transparent hover:bg-white/[0.05] hover:text-white'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : isAdminItem
                      ? 'bg-blue-500/20 text-sky-300'
                      : 'bg-white/[0.04] text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {!collapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}

                {!collapsed && isAdminItem && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-sky-200 font-semibold">
                    Root
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Logout Section */}
      <div className="p-3 border-t border-white/[0.08] space-y-2">
        {userProfile && !collapsed && (
          <button
            onClick={() => setActiveTab('account')}
            className="w-full px-3 py-2.5 rounded-xl bg-[#1C1E24] hover:bg-white/[0.06] border border-white/[0.08] flex items-center gap-2.5 text-left transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#0EA5E9] flex items-center justify-center font-display font-bold text-xs text-white shrink-0">
              {userProfile.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">{userProfile.name}</div>
              <div className="text-[11px] font-mono text-slate-400 truncate">{userProfile.email}</div>
            </div>
          </button>
        )}

        {userProfile && (
          <button
            onClick={() => logout()}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-all cursor-pointer ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Keluar"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Keluar Akun</span>}
          </button>
        )}

        {!collapsed && (
          <div className="pt-1 text-[10px] font-semibold tracking-wider text-slate-500 text-center">
            AM PREMIUM AZRYL
          </div>
        )}
      </div>
    </aside>
  );
};
