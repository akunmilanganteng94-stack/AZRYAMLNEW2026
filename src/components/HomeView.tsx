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

  const successfulOrdersCount = recentOrders.filter((o) => o.status === 'Berhasil').length;
  const totalTransactionsCount = recentOrders.length + recentDeposits.length;

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Top Welcome & Store Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border-2 border-slate-950 shadow-[4px_4px_0px_0px_#020617]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#FFE600] border border-slate-950 text-slate-950 uppercase tracking-widest">
              AZRYL OFFICIAL
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E0F2FE] border border-slate-950 text-slate-950">
              AM Premium
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-display text-slate-950 mt-1.5">
            Selamat Datang, {userProfile ? userProfile.name : 'Pengunjung'}
          </h1>
          <p className="text-xs font-medium text-slate-600 mt-0.5">
            Platform pembelian akun dan verifikasi Alight Motion resmi by AZRYL.
          </p>
        </div>

        {/* Store Status Badge */}
        <div
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_#020617] text-xs font-extrabold shrink-0 ${
            storeSettings?.storeOpen ? 'bg-[#DCFCE7] text-slate-950' : 'bg-[#FFE4E6] text-slate-950'
          }`}
        >
          <span
            className={`w-2.5 h-2.5 rounded-full border border-slate-950 ${
              storeSettings?.storeOpen ? 'bg-[#16A34A]' : 'bg-[#DC2626]'
            }`}
          />
          <span>Status Layanan: {storeSettings?.storeOpen ? 'Buka 24 Jam' : 'Tutup Sementara'}</span>
        </div>
      </div>

      {/* Hero Balance Card & Key Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Balance Hero Card */}
        <div className="lg:col-span-2 rounded-2xl p-6 bg-[#FFE600] border-2 border-slate-950 shadow-[5px_5px_0px_0px_#020617] flex flex-col justify-between min-h-[175px]">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-950">
                <div className="w-7 h-7 rounded-lg bg-white border-2 border-slate-950 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-slate-950" />
                </div>
                <span>Saldo Aktif Pengguna</span>
              </div>
              {userProfile && (
                <button
                  onClick={() => refreshUserProfile()}
                  className="p-2 rounded-xl bg-white hover:bg-[#E0F2FE] border-2 border-slate-950 shadow-[2px_2px_0px_0px_#020617] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                  title="Perbarui Saldo"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-950" />
                </button>
              )}
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono font-black text-3xl sm:text-4xl text-slate-950 tracking-tight tabular-nums">
                {userProfile ? userProfile.balance.toLocaleString() : '0'}
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t-2 border-slate-950 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-bold text-slate-950 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-slate-950" />
              <span>Minimal deposit 500 via QRIS</span>
            </div>

            <div className="flex items-center gap-2">
              {userProfile ? (
                <button
                  onClick={() => setActiveTab('deposit')}
                  className="py-2 px-4 rounded-xl bg-slate-950 hover:bg-[#2563EB] text-white font-extrabold text-xs border-2 border-slate-950 shadow-[3px_3px_0px_0px_#FFFFFF] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Deposit Sekarang</span>
                </button>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="py-2 px-4 rounded-xl bg-slate-950 hover:bg-[#2563EB] text-white font-extrabold text-xs border-2 border-slate-950 shadow-[3px_3px_0px_0px_#FFFFFF] flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Masuk untuk Deposit</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
          <div className="p-4 rounded-2xl bg-[#E0F2FE] border-2 border-slate-950 shadow-[4px_4px_0px_0px_#020617] flex flex-col justify-center">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
              Total Transaksi Anda
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-slate-950 mt-1 tabular-nums">
              {totalTransactionsCount}{' '}
              <span className="text-xs font-sans font-bold text-slate-700">Order & Depo</span>
            </div>
            <div className="text-[11px] font-bold text-slate-800 mt-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Pelacakan Real-time</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#DCFCE7] border-2 border-slate-950 shadow-[4px_4px_0px_0px_#020617] flex flex-col justify-center">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
              Order Berhasil
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-slate-950 mt-1 tabular-nums">
              {successfulOrdersCount}{' '}
              <span className="text-xs font-sans font-bold text-slate-700">Akun Terproses</span>
            </div>
            <div className="text-[11px] font-bold text-slate-800 mt-1.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>Garansi 100% diproses</span>
            </div>
          </div>
        </div>
      </div>

      {/* Promotional SaaS Banner */}
      <div className="rounded-2xl border-2 border-slate-950 bg-white shadow-[4px_4px_0px_0px_#020617] p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="space-y-2.5 max-w-xl">
          <span className="inline-block px-2.5 py-1 rounded-lg bg-[#38BDF8] text-slate-950 font-black text-[10px] border-2 border-slate-950 uppercase tracking-wider">
            LAYANAN INSTAN AZRYL
          </span>
          <h2 className="text-lg sm:text-2xl font-black font-display text-slate-950">
            Layanan Alight Motion Tercepat & Terpercaya
          </h2>
          <p className="text-xs font-medium text-slate-700 leading-relaxed">
            Dapatkan akun Bulk AM mulai dari 200 atau verifikasi akun link resmi dengan harga 300. Otomatis, cepat, dan amanah bersama AZRYL.
          </p>
          <div className="pt-1 flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setSelectedProduct('bulk-am');
                setActiveTab('menu');
              }}
              className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs nb-btn cursor-pointer"
            >
              Order Bulk AM
            </button>
            <button
              onClick={() => {
                setSelectedProduct('am-verif');
                setActiveTab('menu');
              }}
              className="px-4 py-2.5 rounded-xl bg-[#FFE600] hover:bg-[#FEF08A] text-slate-950 font-extrabold text-xs nb-btn cursor-pointer"
            >
              Order AM Verif
            </button>
          </div>
        </div>

        <div className="w-full md:w-64 aspect-[16/9] rounded-xl overflow-hidden border-2 border-slate-950 shadow-[3px_3px_0px_0px_#020617] bg-[#F4F3EE] shrink-0">
          <img
            src="https://cdn.corenexis.com/f/hUimw94N.webp"
            alt="AM Promo Banner"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/images/product-banner.webp';
            }}
          />
        </div>
      </div>

      {/* Product Showcase Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-black font-display text-slate-950">Layanan Utama</h2>
            <p className="text-xs font-medium text-slate-600">
              Pilih paket layanan akun Alight Motion yang Anda butuhkan
            </p>
          </div>
          <button
            onClick={() => setActiveTab('menu')}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FFE600] text-slate-950 border-2 border-slate-950 shadow-[2px_2px_0px_0px_#020617] text-xs font-extrabold flex items-center gap-1 cursor-pointer"
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
                className="flex flex-col justify-between rounded-2xl bg-white border-2 border-slate-950 shadow-[5px_5px_0px_0px_#020617] p-5 hover:-translate-y-0.5 transition-transform"
              >
                <div>
                  {/* Horizontal Rectangular Banner */}
                  <div className="w-full aspect-[16/8] rounded-xl overflow-hidden bg-slate-100 border-2 border-slate-950 mb-4 relative">
                    <img
                      src={prod.image || 'https://cdn.corenexis.com/f/hUimw94N.webp'}
                      alt={prod.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/product-banner.webp';
                      }}
                    />

                    <div className="absolute top-2.5 left-2.5 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#FFE600] p-1 border-2 border-slate-950 shadow-[2px_2px_0px_0px_#020617]">
                        <img
                          src="https://cdn.corenexis.com/f/eJVaVCyH.png"
                          alt="AM Logo"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/am-logo.png';
                          }}
                        />
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-white border-2 border-slate-950 text-[10px] font-black text-slate-950 shadow-[2px_2px_0px_0px_#020617]">
                        {isBulk ? 'Bulk Inject AM' : 'Verifikasi Link AM'}
                      </span>
                    </div>

                    <div
                      className={`absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-lg border-2 border-slate-950 text-[10px] font-black shadow-[2px_2px_0px_0px_#020617] ${
                        prod.active ? 'bg-[#4ADE80] text-slate-950' : 'bg-[#FB7185] text-slate-950'
                      }`}
                    >
                      {prod.active ? 'Tersedia' : 'Habis'}
                    </div>
                  </div>

                  {/* Header & Title */}
                  <div className="flex items-baseline justify-between mb-2">
                    <h3 className="text-lg font-black font-display text-slate-950">{prod.name}</h3>
                    <div className="text-right">
                      <span className="text-xl font-black font-mono text-[#2563EB] tabular-nums">
                        {prod.price.toLocaleString()}
                      </span>
                      <span className="text-[11px] font-bold text-slate-600"> / akun</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs font-medium text-slate-700 leading-relaxed min-h-[38px]">
                    {prod.description}
                  </p>
                </div>

                {/* Footer Action */}
                <div className="mt-5 pt-4 border-t-2 border-slate-950 flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                    {isBulk ? 'Proses inject instan' : 'Via link verifikasi'}
                  </span>

                  <button
                    onClick={() => handleOrderProduct(prod.id)}
                    disabled={!prod.active || !storeSettings?.storeOpen}
                    className="py-2 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs nb-btn flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
        <div className="rounded-2xl bg-white border-2 border-slate-950 shadow-[4px_4px_0px_0px_#020617] p-5">
          <div className="flex items-center justify-between mb-3 pb-3 border-b-2 border-slate-950">
            <h3 className="text-sm font-black font-display text-slate-950 uppercase tracking-wider">
              Aktivitas Terakhir
            </h3>
            <button
              onClick={() => setActiveTab('history')}
              className="text-xs font-extrabold text-[#2563EB] hover:underline cursor-pointer"
            >
              Buka Riwayat
            </button>
          </div>

          <div className="space-y-2.5">
            {recentOrders.map((ord) => (
              <div
                key={ord.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#F4F3EE] border-2 border-slate-950 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#FFE600] border-2 border-slate-950 text-slate-950 flex items-center justify-center font-black shrink-0">
                    AM
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-950 truncate">
                      {ord.productName} ({ord.quantity} akun)
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono truncate">{ord.email}</div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-2">
                  <div className="font-mono font-black text-slate-950 tabular-nums">
                    {ord.totalPrice.toLocaleString()}
                  </div>
                  <span
                    className={`inline-block mt-0.5 text-[10px] font-black px-2 py-0.5 rounded border border-slate-950 ${
                      ord.status === 'Berhasil'
                        ? 'bg-[#4ADE80] text-slate-950'
                        : ord.status === 'Sedang diproses'
                        ? 'bg-[#38BDF8] text-slate-950'
                        : ord.status === 'Gagal'
                        ? 'bg-[#FB7185] text-slate-950'
                        : 'bg-[#FFE600] text-slate-950'
                    }`}
                  >
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
