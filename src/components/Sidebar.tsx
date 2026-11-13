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
  PlusCircle,
  ExternalLink
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

  const isAdmin = userProfile?.role === 'admin' || userProfile?.email?.toLowerCase().trim() === 'apriliansyahazril10@gmail.com';

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'menu', label: 'Order Layanan', icon: ShoppingBag },
    { id: 'history', label: 'Riwayat Transaksi', icon: Clock },
    { id: 'deposit', label: 'Deposit Saldo', icon: Wallet },
    { id: 'account', label: 'Akun Saya', icon: User },
    ...(isAdmin ? [{ id: 'admin', label: 'Panel Admin', icon: ShieldCheck }] : []),
  ];

  return (
    <aside
      className={`hidden md:flex flex-col justify-between h-screen sticky top-0 transition-all duration-300 z-40 bg-[#070b18]/90 backdrop-blur-2xl border-r border-blue-500/15 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-blue-500/10">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-950 p-1 border border-blue-500/30 shadow-md shadow-blue-500/20 flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src="https://cdn.corenexis.com/f/eJVaVCyH.png"
                  alt="AM PREMIUM Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/am-logo.png';
                  }}
                />
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-extrabold text-sm tracking-wider text-white">
                    AM PREMIUM
                  </span>
                </div>
                <p className="text-[10px] text-cyan-400 font-semibold tracking-wide">POWERED BY AZRYL</p>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-9 h-9 rounded-xl bg-slate-950 p-1 border border-blue-500/30 shadow-md shadow-blue-500/20 flex items-center justify-center overflow-hidden">
              <img
                src="https://cdn.corenexis.com/f/eJVaVCyH.png"
                alt="AM PREMIUM Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/am-logo.png';
                }}
              />
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            title={collapsed ? "Perluas Sidebar" : "Perkecil Sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* User Balance Card (Desktop) */}
        {!collapsed ? (
          <div className="p-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-950/70 via-slate-900/80 to-blue-900/40 border border-blue-500/20 shadow-lg shadow-blue-950/40 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all pointer-events-none" />
              
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Saldo Anda</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-cyan-300 font-mono">
                  Realtime
                </span>
              </div>

              <div className="font-display font-extrabold text-xl text-white tracking-tight mb-2.5">
                {userProfile ? userProfile.balance.toLocaleString() : '0'}
              </div>

              {userProfile ? (
                <button
                  onClick={() => setActiveTab('deposit')}
                  className="w-full py-2 px-3 rounded-xl bg-blue-600/80 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-600/20 active:scale-[0.98]"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Isi Saldo (QRIS)</span>
                </button>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="w-full py-2 px-3 rounded-xl bg-blue-600/80 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>Login untuk Cek Saldo</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3 text-center">
            <button
              onClick={() => setActiveTab('deposit')}
              className="w-10 h-10 mx-auto rounded-xl bg-blue-950/70 border border-blue-500/30 flex items-center justify-center text-cyan-400 hover:text-white hover:bg-blue-600 transition-all"
              title="Isi Saldo"
            >
              <Wallet className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="px-3 space-y-1 mt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isAdminItem = item.id === 'admin';

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-blue-600/20 text-cyan-300 border border-blue-500/40 shadow-sm shadow-blue-500/10'
                    : isAdminItem
                    ? 'text-amber-300/80 hover:text-amber-200 hover:bg-amber-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive 
                    ? 'text-cyan-400' 
                    : isAdminItem 
                    ? 'text-amber-400' 
                    : 'text-slate-400 group-hover:text-white'
                }`} />

                {!collapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}

                {!collapsed && isAdminItem && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold">
                    PRO
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info / Logout */}
      <div className="p-3 border-t border-blue-500/10 space-y-2">
        {userProfile && (
          <button
            onClick={() => logout()}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Keluar"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Keluar Akun</span>}
          </button>
        )}

        {!collapsed && (
          <div className="px-3 py-2 text-[10px] text-slate-500 text-center">
            AM PREMIUM © 2026 · AZRYL
          </div>
        )}
      </div>
    </aside>
  );
};
