import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Wallet, LogIn } from 'lucide-react';

interface NavbarProps {
  onOpenAuth: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TAB_TITLES: Record<string, { section: string; desc: string }> = {
  home: { section: 'Dashboard', desc: 'Ringkasan Akun & Layanan' },
  menu: { section: 'Order Layanan', desc: 'Bulk AM & AM Verif API' },
  history: { section: 'Riwayat Transaksi', desc: 'Log Order & Deposit QRIS' },
  deposit: { section: 'Deposit Saldo', desc: 'Top Up Instan QRIS' },
  account: { section: 'Akun Saya', desc: 'Profil & Keamanan Firebase' },
  admin: { section: 'Panel Admin', desc: 'Control Center & API Docs' }
};

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth, activeTab, setActiveTab }) => {
  const { userProfile, storeSettings } = useAuth();
  const currentMeta = TAB_TITLES[activeTab] || TAB_TITLES.home;

  return (
    <header className="sticky top-0 z-30 w-full h-16 border-b-2 border-slate-950 bg-gradient-to-r from-[#F0F4FF] via-white to-[#EBF1FF] px-4 sm:px-6 flex items-center justify-between">
      {/* Brand / Context Zone */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setActiveTab('home')}
          className="flex md:hidden items-center gap-2 text-left group focus:outline-none cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-[#FFE600] p-1 border-2 border-slate-950 shadow-[2px_2px_0px_0px_#020617] flex items-center justify-center overflow-hidden">
            <img
              src="https://cdn.corenexis.com/f/eJVaVCyH.png"
              alt="AM PREMIUM Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/am-logo.png';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-black text-sm tracking-tight text-slate-950">
                AM PREMIUM
              </span>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-950 text-[#FFE600]">
                AZRYL
              </span>
            </div>
          </div>
        </button>

        {/* Desktop Breadcrumb */}
        <div className="hidden md:flex items-center gap-2.5">
          <span className="text-xs font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-lg bg-[#EBF1FF] border-2 border-slate-950 text-slate-950">
            AZRYL
          </span>
          <span className="text-slate-400 font-bold">/</span>
          <div>
            <span className="font-display font-black text-sm text-slate-950">{currentMeta.section}</span>
            <span className="text-xs text-slate-500 ml-2 hidden lg:inline">— {currentMeta.desc}</span>
          </div>
        </div>

        {/* Store Status Badge */}
        <div
          className={`hidden sm:flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-lg border-2 border-slate-950 text-[11px] font-extrabold ${
            storeSettings?.storeOpen
              ? 'bg-[#DCFCE7] text-slate-950'
              : 'bg-[#FFE4E6] text-slate-950'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full border border-slate-950 ${
              storeSettings?.storeOpen ? 'bg-[#16A34A]' : 'bg-[#DC2626]'
            }`}
          />
          <span>{storeSettings?.storeOpen ? 'TOKO BUKA' : 'TOKO TUTUP'}</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {userProfile ? (
          <>
            <button
              onClick={() => setActiveTab('deposit')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FFE600] hover:bg-[#FEF08A] border-2 border-slate-950 shadow-[2px_2px_0px_0px_#020617] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-xs cursor-pointer"
              title="Klik untuk Deposit Saldo"
            >
              <Wallet className="w-3.5 h-3.5 text-slate-950" />
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] font-bold text-slate-700 hidden sm:inline">SALDO:</span>
                <span className="font-mono font-extrabold text-slate-950 tabular-nums text-xs sm:text-sm">
                  {userProfile.balance.toLocaleString()}
                </span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('account')}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-white hover:bg-[#E0F2FE] border-2 border-slate-950 shadow-[2px_2px_0px_0px_#020617] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-xs cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-[#38BDF8] border border-slate-950 text-slate-950 flex items-center justify-center font-black text-[11px]">
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline font-bold text-slate-950 max-w-[110px] truncate">
                {userProfile.name}
              </span>
              {userProfile.role === 'admin' && (
                <span className="hidden sm:inline text-[9px] font-black px-1.5 py-0.5 rounded bg-[#FB923C] text-slate-950 border border-slate-950">
                  ADMIN
                </span>
              )}
            </button>
          </>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs border-2 border-slate-950 shadow-[3px_3px_0px_0px_#020617] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer whitespace-nowrap"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Masuk / Daftar</span>
          </button>
        )}
      </div>
    </header>
  );
};
