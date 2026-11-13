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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#F0F4FF] border-t-2 border-slate-950">
      <div className={`grid ${isAdmin ? 'grid-cols-6' : 'grid-cols-5'} items-center h-16 max-w-md mx-auto px-1.5 gap-1`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center h-12 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#FFE600] border-2 border-slate-950 shadow-[2px_2px_0px_0px_#020617] text-slate-950'
                  : 'text-slate-600 hover:text-slate-950 border-2 border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? 'font-black' : 'font-bold'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
