import React from 'react';
import { Home, ShoppingBag, Clock, Wallet, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const { userProfile } = useAuth();

  const isAdmin =
    userProfile?.role === 'admin' ||
    userProfile?.email?.toLowerCase().trim() === 'apriliansyahazril10@gmail.com';

  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'menu', label: 'Menu', icon: ShoppingBag },
    { id: 'history', label: 'Riwayat', icon: Clock },
    { id: 'deposit', label: 'Deposit', icon: Wallet },
    { id: 'account', label: 'Akun', icon: User }
  ];

  if (isAdmin) {
    tabs.push({ id: 'admin', label: 'Admin', icon: ShieldCheck });
  }

  return (
    <nav className="md:hidden fixed bottom-3 left-3 right-3 z-40 pointer-events-none">
      <div className="pointer-events-auto max-w-md mx-auto rounded-full bg-[#1C1E24]/92 backdrop-blur-xl border border-white/[0.12] shadow-[0_14px_34px_rgba(0,0,0,0.75),0_0_24px_-6px_rgba(37,99,235,0.35)] px-1.5 py-1.5">
        <div className={`grid ${isAdmin ? 'grid-cols-6' : 'grid-cols-5'} items-center gap-1`}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center min-h-[44px] rounded-full transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white shadow-[0_4px_18px_rgba(37,99,235,0.65)]'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className={`text-[10px] tracking-tight mt-0.5 whitespace-nowrap ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
