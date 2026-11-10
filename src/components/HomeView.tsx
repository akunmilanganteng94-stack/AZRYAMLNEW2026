import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { ProductItem, OrderTransaction, DepositTransaction } from '../types/index.ts';
import { 
  Wallet, 
  ArrowUpRight, 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  Zap, 
  Sparkles, 
  ShieldCheck, 
  Store,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

interface HomeViewProps {
  setActiveTab: (tab: string) => void;
  setSelectedProduct: (id: string) => void;
  onOpenAuth: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ setActiveTab, setSelectedProduct, onOpenAuth }) => {
  const { userProfile, storeSettings, refreshUserProfile } = useAuth();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderTransaction[]>([]);
  const [recentDeposits, setRecentDeposits] = useState<DepositTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchHomeData = async () => {
    try {
      const prodRes = await fetch('/api/products');
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData);
      }

      if (userProfile?.uid) {
        const txRes = await fetch(`/api/transactions/${userProfile.uid}`);
        if (txRes.ok) {
          const txData = await txRes.json();
          setRecentOrders((txData.orders || []).slice(0, 3));
          setRecentDeposits((txData.deposits || []).slice(0, 3));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomeData();
  }, [userProfile?.uid]);

  const handleOrderProduct = (productId: string) => {
    setSelectedProduct(productId);
    setActiveTab('menu');
  };

  const successfulOrdersCount = recentOrders.filter(o => o.status === 'Berhasil').length;
  const totalTransactionsCount = recentOrders.length + recentDeposits.length;

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Top Welcome & Store Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-slate-950/40 p-4 sm:p-5 rounded-3xl border border-blue-500/15">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              Selamat Datang
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
              AM Premium v2.6
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-white mt-0.5">
            {userProfile ? userProfile.name : 'Tamu Pengunjung'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Platform pembelian akun dan verifikasi Alight Motion resmi by AZRYL.
          </p>
        </div>

        {/* Store Open/Close Pill */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border text-xs font-medium ${
            storeSettings?.storeOpen 
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
              : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${storeSettings?.storeOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span>Status Layanan: {storeSettings?.storeOpen ? 'Buka 24 Jam' : 'Tutup Sementara'}</span>
          </div>
        </div>
      </div>

      {/* Hero Balance Card & Key Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Gradient Balance Card */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-blue-900/90 via-[#0a122e] to-[#040816] border border-blue-500/30 shadow-2xl shadow-blue-950/50">
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-600/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col justify-between h-full min-h-[160px]">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-cyan-200">
                  <Wallet className="w-4 h-4 text-cyan-400" />
                  <span>Saldo Aktif Pengguna</span>
                </div>
                {userProfile && (
                  <button 
                    onClick={() => refreshUserProfile()} 
                    className="p-1 rounded-lg text-cyan-300/80 hover:text-white hover:bg-white/10 transition-colors"
                    title="Perbarui Saldo"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
                  {userProfile ? userProfile.balance.toLocaleString() : '0'}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-blue-500/15 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-300 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Minimal deposit 500 via QRIS otomatis</span>
              </div>

              <div className="flex items-center gap-2">
                {userProfile ? (
                  <button
                    onClick={() => setActiveTab('deposit')}
                    className="py-2 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Deposit Sekarang</span>
                  </button>
                ) : (
                  <button
                    onClick={onOpenAuth}
                    className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-all"
                  >
                    <span>Masuk untuk Deposit</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
          <div className="p-4 rounded-2xl bg-[#090f23]/80 border border-blue-500/15 flex flex-col justify-center">
            <span className="text-[11px] text-slate-400">Total Transaksi Anda</span>
            <div className="text-xl sm:text-2xl font-bold font-display text-white mt-1">
              {totalTransactionsCount} <span className="text-xs font-normal text-slate-500">Order & Depo</span>
            </div>
            <div className="text-[10px] text-cyan-400 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Real-time tracking</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#090f23]/80 border border-blue-500/15 flex flex-col justify-center">
            <span className="text-[11px] text-slate-400">Order Berhasil</span>
            <div className="text-xl sm:text-2xl font-bold font-display text-emerald-400 mt-1">
              {successfulOrdersCount} <span className="text-xs font-normal text-slate-500">Akun Terproses</span>
            </div>
            <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Garansi 100% diproses</span>
            </div>
          </div>
        </div>
      </div>

      {/* Promotional Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-blue-500/20 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 p-6 sm:p-7 shadow-xl">
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-30 pointer-events-none overflow-hidden">
          <img 
            src="/images/hero.jpg" 
            alt="AM Promo Banner"
            className="w-full h-full object-cover object-center" 
          />
        </div>
        <div className="relative z-10 max-w-lg">
          <span className="inline-block px-2.5 py-1 rounded-lg bg-blue-500/20 text-cyan-300 font-semibold text-[10px] border border-blue-500/30 mb-2">
            PROMO KHUSUS HARI INI
          </span>
          <h2 className="text-lg sm:text-xl font-bold font-display text-white">
            Layanan Alight Motion Tercepat & Terpercaya
          </h2>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Dapatkan akun Bulk AM mulai dari 200 atau verifikasi akun link resmi dengan harga 300. Otomatis, cepat, dan amanah bersama AZRYL.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedProduct('bulk-am');
                setActiveTab('menu');
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 transition-all"
            >
              Order Bulk AM
            </button>
            <button
              onClick={() => {
                setSelectedProduct('am-verif');
                setActiveTab('menu');
              }}
              className="px-4 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-xs transition-all"
            >
              Order AM Verif
            </button>
          </div>
        </div>
      </div>

      {/* Product Showcase Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold font-display text-white">Layanan Utama</h2>
            <p className="text-xs text-slate-400">Pilih paket layanan akun Alight Motion yang Anda butuhkan</p>
          </div>
          <button
            onClick={() => setActiveTab('menu')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
          >
            <span>Lihat Semua</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 2 Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {products.map((prod) => {
            const isBulk = prod.id === 'bulk-am';

            return (
              <div
                key={prod.id}
                className="relative flex flex-col justify-between rounded-3xl bg-[#090e21] border border-blue-500/20 p-5 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-950/40 transition-all duration-300 group"
              >
                <div>
                  {/* Horizontal Rectangular Logo - Long Banner */}
                  <div className="w-full aspect-[16/8] rounded-2xl overflow-hidden bg-slate-950 border border-blue-500/30 mb-4 relative group-hover:border-cyan-400/60 group-hover:shadow-lg group-hover:shadow-blue-500/20 transition-all">
                    <img
                      src={prod.image || 'https://cdn.corenexis.com/f/hUimw94N.webp'}
                      alt={prod.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/product-banner.webp';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20 pointer-events-none" />
                    
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-black/80 backdrop-blur-md p-1 border border-white/20 shadow-md">
                        <img 
                          src="https://cdn.corenexis.com/f/eJVaVCyH.png" 
                          alt="AM Logo" 
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/am-logo.png';
                          }}
                        />
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-bold text-cyan-300">
                        {isBulk ? 'Bulk Inject AM' : 'Verifikasi Link AM'}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-lg bg-emerald-950/80 backdrop-blur-md border border-emerald-500/30 text-[10px] font-semibold text-emerald-300">
                      {prod.active ? 'Tersedia' : 'Habis'}
                    </div>
                  </div>

                  {/* Header & Title */}
                  <div className="flex items-baseline justify-between mb-2">
                    <h3 className="text-lg font-bold font-display text-white group-hover:text-cyan-300 transition-colors">
                      {prod.name}
                    </h3>
                    <div className="text-right">
                      <span className="text-xl font-extrabold font-display text-cyan-400">
                        {prod.price}
                      </span>
                      <span className="text-[11px] text-slate-400"> / akun</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-300 leading-relaxed min-h-[38px]">
                    {prod.description}
                  </p>
                </div>

                {/* Footer Action */}
                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {isBulk ? 'Proses inject instan' : 'Via link verifikasi'}
                  </span>

                  <button
                    onClick={() => handleOrderProduct(prod.id)}
                    disabled={!prod.active || !storeSettings?.storeOpen}
                    className="py-2 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-xs shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all disabled:opacity-50 active:scale-95"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Order Sekarang</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity / Last Transactions */}
      {userProfile && (recentOrders.length > 0 || recentDeposits.length > 0) && (
        <div className="rounded-3xl bg-[#090f23]/60 border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold font-display text-white">Aktivitas Terakhir</h3>
            <button
              onClick={() => setActiveTab('history')}
              className="text-[11px] text-cyan-400 hover:underline"
            >
              Buka Riwayat
            </button>
          </div>

          <div className="space-y-2">
            {recentOrders.map((ord) => (
              <div
                key={ord.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-cyan-400 flex items-center justify-center font-bold">
                    AM
                  </div>
                  <div>
                    <div className="font-semibold text-white">{ord.productName} ({ord.quantity} akun)</div>
                    <div className="text-[10px] text-slate-400 font-mono">{ord.email}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-slate-200">{ord.totalPrice.toLocaleString()}</div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                    ord.status === 'Berhasil' 
                      ? 'bg-emerald-500/15 text-emerald-400' 
                      : ord.status === 'Sedang diproses' 
                      ? 'bg-cyan-500/15 text-cyan-400' 
                      : ord.status === 'Gagal' 
                      ? 'bg-rose-500/15 text-rose-400' 
                      : 'bg-amber-500/15 text-amber-400'
                  }`}>
                    {ord.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
