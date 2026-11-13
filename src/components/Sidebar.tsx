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
    { id: 'home', label: 'Dashboard', icon: Home, accent: 'bg-[#FFE600]' },
    { id: 'menu', label: 'Order Layanan', icon: ShoppingBag, accent: 'bg-[#38BDF8]' },
    { id: 'history', label: 'Riwayat Transaksi', icon: Clock, accent: 'bg-[#4ADE80]' },
    { id: 'deposit', label: 'Deposit Saldo', icon: Wallet, accent: 'bg-[#FFE600]' },
    { id: 'account', label: 'Akun Saya', icon: User, accent: 'bg-[#E0E7FF]' },
    ...(isAdmin ? [{ id: 'admin', label: 'Panel Admin', icon: ShieldCheck, accent: 'bg-[#FB923C]' }] : [])
  ];

  return (
    <aside
      className={`hidden md:flex flex-col justify-between h-screen sticky top-0 transition-all duration-200 z-40 bg-[#DCE4FB] border-r-2 border-slate-950 ${
        collapsed ? 'w-[84px]' : 'w-[272px]'
      }`}
    >
      {/* Top Workspace Brand + Balance + Navigation */}
      <div className="flex flex-col min-h-0 overflow-y-auto">
        {/* Header Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b-2 border-slate-950 bg-gradient-to-r from-[#DCE4FB] to-[#F0F4FF]">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#FFE600] p-1 border-2 border-slate-950 shadow-[2px_2px_0px_0px_#020617] flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src="https://cdn.corenexis.com/f/eJVaVCyH.png"
                  alt="AM PREMIUM Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/am-logo.png';
                  }}
                />
              </div>
              <div className="min-w-0">
                <div className="font-display font-black text-sm tracking-tight text-slate-950 truncate">
                  AM PREMIUM
                </div>
                <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest bg-slate-950 text-[#FFE600] px-1.5 py-0.5 rounded">
                  BY AZRYL
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-10 h-10 rounded-xl bg-[#FFE600] p-1 border-2 border-slate-950 shadow-[2px_2px_0px_0px_#020617] flex items-center justify-center overflow-hidden">
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
            className="p-1.5 rounded-lg bg-white border-2 border-slate-950 text-slate-950 hover:bg-[#FFE600] shadow-[2px_2px_0px_0px_#020617] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer shrink-0"
            title={collapsed ? 'Perluas Sidebar' : 'Perkecil Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Modern Sidebar Balance Module */}
        {!collapsed ? (
          <div className="p-4 border-b-2 border-slate-950 bg-[#EBF1FF]">
            <div className="p-3.5 rounded-2xl bg-[#FFE600] border-2 border-slate-950 shadow-[4px_4px_0px_0px_#020617] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-950">
                  Saldo Akun
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-950 font-mono font-bold text-slate-950">
                  AKTIF
                </span>
              </div>

              <div className="font-display font-black text-2xl text-slate-950 tabular-nums tracking-tight">
                {userProfile ? userProfile.balance.toLocaleString() : '0'}
              </div>

              {userProfile ? (
                <button
                  onClick={() => setActiveTab('deposit')}
                  className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-blue-600 text-white border-2 border-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_#FFFFFF] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Top Up QRIS</span>
                </button>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-blue-600 text-white border-2 border-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Login / Daftar</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3 border-b-2 border-slate-950 bg-[#EBF1FF] text-center">
            <button
              onClick={() => setActiveTab('deposit')}
              className="w-11 h-11 mx-auto rounded-xl bg-[#FFE600] border-2 border-slate-950 shadow-[2px_2px_0px_0px_#020617] flex items-center justify-center text-slate-950 hover:bg-[#38BDF8] transition-all cursor-pointer"
              title="Isi Saldo"
            >
              <Wallet className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Section Heading */}
        {!collapsed && (
          <div className="px-4 pt-4 pb-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              Menu Utama
            </span>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="px-3 py-2 space-y-1.5">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isAdminItem = item.id === 'admin';

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? `${item.accent} text-slate-950 border-2 border-slate-950 shadow-[3px_3px_0px_0px_#020617]`
                    : isAdminItem
                    ? 'bg-[#FFF7ED] text-slate-950 border-2 border-slate-950 hover:bg-[#FED7AA]'
                    : 'text-slate-800 border-2 border-transparent hover:border-slate-950 hover:bg-[#F0F4FF] hover:text-slate-950'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border-2 ${
                    isActive
                      ? 'bg-white border-slate-950 text-slate-950'
                      : isAdminItem
                      ? 'bg-[#FB923C] border-slate-950 text-slate-950'
                      : 'bg-[#F0F4FF] border-slate-950 text-slate-950'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>

                {!collapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}

                {!collapsed && isAdminItem && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded border border-slate-950 bg-slate-950 text-[#FFE600] font-extrabold tracking-wider">
                    ROOT
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Logout Section */}
      <div className="p-3 border-t-2 border-slate-950 bg-[#DCE4FB] space-y-2">
        {userProfile && !collapsed && (
          <div className="px-3 py-2 rounded-xl bg-[#F0F4FF] border-2 border-slate-950 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#38BDF8] border-2 border-slate-950 flex items-center justify-center font-display font-black text-xs text-slate-950 shrink-0">
              {userProfile.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-extrabold text-slate-950 truncate">{userProfile.name}</div>
              <div className="text-[10px] font-mono text-slate-600 truncate">{userProfile.email}</div>
            </div>
          </div>
        )}

        {userProfile && (
          <button
            onClick={() => logout()}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold bg-[#FFE4E6] hover:bg-[#FB7185] text-slate-950 border-2 border-slate-950 shadow-[2px_2px_0px_0px_#020617] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Keluar"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Keluar Akun</span>}
          </button>
        )}

        {!collapsed && (
          <div className="pt-1 text-[10px] font-extrabold tracking-wider text-slate-500 text-center uppercase">
            AM PREMIUM · AZRYL
          </div>
        )}
      </div>
    </aside>
  );
};
