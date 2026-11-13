import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Wallet, ShieldCheck, User as UserIcon, LogIn, Store } from 'lucide-react';

interface NavbarProps {
  onOpenAuth: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth, activeTab, setActiveTab }) => {
  const { userProfile, storeSettings } = useAuth();

  return (
    <header className="sticky top-0 z-30 w-full h-16 border-b border-blue-500/10 bg-[#060814]/85 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between">
      {/* Brand Zone */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2.5 text-left group focus:outline-none"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-950 p-1 border border-blue-500/30 shadow-md shadow-blue-500/20 group-hover:border-cyan-400 group-hover:shadow-cyan-500/30 transition-all flex items-center justify-center overflow-hidden">
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
              <span className="font-display font-extrabold text-sm tracking-wider text-white">
                AM PREMIUM
              </span>
              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                AZRYL
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-none">Official Digital Services</p>
          </div>
        </button>

        {/* Store Open/Close status */}
        <div className="hidden sm:flex items-center gap-1.5 ml-3 pl-3 border-l border-slate-800 text-[11px]">
          <span className={`w-2 h-2 rounded-full ${storeSettings?.storeOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
          <span className={storeSettings?.storeOpen ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
            {storeSettings?.storeOpen ? 'Toko Buka' : 'Toko Tutup'}
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {userProfile ? (
          <>
            {/* Balance Card Quick Indicator */}
            <button
              onClick={() => setActiveTab('deposit')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-950/40 border border-blue-500/20 hover:border-blue-500/40 transition-all text-xs"
              title="Klik untuk Deposit Saldo"
            >
              <Wallet className="w-3.5 h-3.5 text-cyan-400" />
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] text-slate-400 font-mono">Saldo:</span>
                <span className="font-display font-bold text-white tabular-nums text-xs sm:text-sm text-cyan-300">
                  {userProfile.balance.toLocaleString()}
                </span>
              </div>
            </button>

            {/* User Profile */}
            <button
              onClick={() => setActiveTab('account')}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all text-xs"
            >
              <div className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-300 border border-blue-500/30 flex items-center justify-center font-bold text-[11px]">
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline font-medium text-slate-200 max-w-[100px] truncate">
                {userProfile.name}
              </span>
              {userProfile.role === 'admin' && (
                <span className="hidden sm:inline text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  ADMIN
                </span>
              )}
            </button>
          </>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium text-xs shadow-md shadow-blue-600/20 active:scale-95 transition-all"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Masuk / Daftar</span>
          </button>
        )}
      </div>
    </header>
  );
};
