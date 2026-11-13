import React from 'react';
import { Home, ShoppingBag, Clock, Wallet, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const { userProfile } = useAuth();

  const isAdmin = userProfile?.role === 'admin' || userProfile?.email?.toLowerCase().trim() === 'apriliansyahazril10@gmail.com';

  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'menu', label: 'Menu', icon: ShoppingBag },
    { id: 'history', label: 'Riwayat', icon: Clock },
    { id: 'deposit', label: 'Deposit', icon: Wallet },
    { id: 'account', label: 'Akun', icon: User },
  ];

  if (isAdmin) {
    tabs.push({ id: 'admin', label: 'Admin', icon: ShieldCheck });
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070b18]/95 backdrop-blur-2xl border-t border-blue-500/15 shadow-2xl shadow-black">
      <div className={`grid ${isAdmin ? 'grid-cols-6' : 'grid-cols-5'} items-center h-16 max-w-md mx-auto px-2`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] relative py-1 focus:outline-none transition-all active:scale-90"
            >
              {/* Active glow dot */}
              {isActive && (
                <span className="absolute top-1.5 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
              )}

              <Icon
                className={`w-5 h-5 transition-colors ${
                  isActive ? 'text-cyan-400 scale-105' : 'text-slate-400'
                }`}
              />

              <span
                className={`text-[10px] font-medium tracking-tight mt-1 transition-colors ${
                  isActive ? 'text-cyan-300 font-semibold' : 'text-slate-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
