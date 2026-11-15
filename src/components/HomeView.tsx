import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { OrderTransaction, DepositTransaction, ProductItem } from '../types/index.ts';
import { db, collection, query, where, onSnapshot } from '../lib/firebase.ts';
import {
  mergeOrders,
  mergeDeposits,
  loadUserTransactionsCache,
  saveUserTransactionsCache
} from '../utils/transactionSync.ts';
import {
  Wallet,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Zap,
  RefreshCw,
  ShoppingBag,
  ShieldCheck
} from 'lucide-react';

interface HomeViewProps {
  setActiveTab: (tab: string) => void;
  setSelectedProduct: (id: string) => void;
  onOpenAuth: () => void;
}

const HERO_ILLUSTRATION =
  'https://gbaike-image.cdn.bcebos.com/32fa828ba61ea8d3fd1f58b41757274e251f95caf274/32fa828ba61ea8d3fd1f58b41757274e251f95caf274_16_9?x-bce-process=image/format,f_auto';
const HERO_ILLUSTRATION_FALLBACK = '/images/hero-am.jpg';

export const HomeView: React.FC<HomeViewProps> = ({ setActiveTab, setSelectedProduct, onOpenAuth }) => {
  const { userProfile, storeSettings, refreshUserProfile } = useAuth();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [apiOrders, setApiOrders] = useState<OrderTransaction[]>([]);
  const [fsUidOrders, setFsUidOrders] = useState<OrderTransaction[]>([]);
  const [fsEmailOrders, setFsEmailOrders] = useState<OrderTransaction[]>([]);
  const [apiDeposits, setApiDeposits] = useState<DepositTransaction[]>([]);
  const [fsUidDeposits, setFsUidDeposits] = useState<DepositTransaction[]>([]);
  const [fsEmailDeposits, setFsEmailDeposits] = useState<DepositTransaction[]>([]);
  const [allOrders, setAllOrders] = useState<OrderTransaction[]>([]);
  const [allDeposits, setAllDeposits] = useState<DepositTransaction[]>([]);

  useEffect(() => {
    if (!userProfile?.uid) {
      setAllOrders([]);
      setAllDeposits([]);
      return;
    }

    const cached = loadUserTransactionsCache(userProfile.uid, userProfile.email);
    const mergedOrders = mergeOrders(cached.orders, apiOrders, fsUidOrders, fsEmailOrders);
    const mergedDeposits = mergeDeposits(cached.deposits, apiDeposits, fsUidDeposits, fsEmailDeposits);

    setAllOrders(mergedOrders);
    setAllDeposits(mergedDeposits);
    saveUserTransactionsCache(userProfile.uid, userProfile.email, mergedOrders, mergedDeposits);
  }, [
    userProfile?.uid,
    userProfile?.email,
    apiOrders,
    fsUidOrders,
    fsEmailOrders,
    apiDeposits,
    fsUidDeposits,
    fsEmailDeposits
  ]);

  const fetchHomeData = async () => {
    try {
      const prodRes = await fetch('/api/products');
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        if (Array.isArray(prodData)) setProducts(prodData);
      }
      if (userProfile?.uid) {
        const emailParam = userProfile.email ? `?email=${encodeURIComponent(userProfile.email)}` : '';
        const txRes = await fetch(`/api/transactions/${userProfile.uid}${emailParam}`);
        if (txRes.ok) {
          const txData = await txRes.json();
          setApiOrders(txData.orders || []);
          setApiDeposits(txData.deposits || []);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (userProfile?.uid) {
      const cached = loadUserTransactionsCache(userProfile.uid, userProfile.email);
      if (cached.orders.length > 0) setAllOrders(cached.orders);
      if (cached.deposits.length > 0) setAllDeposits(cached.deposits);
    }

    fetchHomeData();
    if (!userProfile?.uid) return;

    const normalizedEmail = (userProfile.email || '').toLowerCase().trim();

    const unsubOrdsUid = onSnapshot(
      query(collection(db, 'orders'), where('uid', '==', userProfile.uid)),
      (snapshot) => {
        const list: OrderTransaction[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as OrderTransaction;
          if (data && (data.id || docSnap.id)) {
            list.push({ ...data, id: data.id || docSnap.id });
          }
        });
        setFsUidOrders(list);
      },
      () => {}
    );

    const unsubDepsUid = onSnapshot(
      query(collection(db, 'deposits'), where('uid', '==', userProfile.uid)),
      (snapshot) => {
        const list: DepositTransaction[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as DepositTransaction;
          if (data && (data.id || docSnap.id)) {
            list.push({ ...data, id: data.id || docSnap.id });
          }
        });
        setFsUidDeposits(list);
      },
      () => {}
    );

    let unsubOrdsEmail = () => {};
    let unsubDepsEmail = () => {};

    if (normalizedEmail) {
      unsubOrdsEmail = onSnapshot(
        query(collection(db, 'orders'), where('userEmail', '==', normalizedEmail)),
        (snapshot) => {
          const list: OrderTransaction[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as OrderTransaction;
            if (data && (data.id || docSnap.id)) {
              list.push({ ...data, id: data.id || docSnap.id });
            }
          });
          setFsEmailOrders(list);
        },
        () => {}
      );

      unsubDepsEmail = onSnapshot(
        query(collection(db, 'deposits'), where('userEmail', '==', normalizedEmail)),
        (snapshot) => {
          const list: DepositTransaction[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as DepositTransaction;
            if (data && (data.id || docSnap.id)) {
              list.push({ ...data, id: data.id || docSnap.id });
            }
          });
          setFsEmailDeposits(list);
        },
        () => {}
      );
    }

    return () => {
      unsubOrdsUid();
      unsubDepsUid();
      unsubOrdsEmail();
      unsubDepsEmail();
    };
  }, [userProfile?.uid, userProfile?.email]);

  const recentOrders = allOrders.slice(0, 3);
  const recentDeposits = allDeposits.slice(0, 3);
  const successfulOrdersCount = allOrders.filter((o) => o.status === 'Berhasil').length;
  const totalTransactionsCount = allOrders.length + allDeposits.length;
  const bulkPrice = products.find((p) => p.id === 'bulk-am')?.price ?? 200;
  const verifPrice = products.find((p) => p.id === 'am-verif')?.price ?? 300;

  return (
    <div className="space-y-6">
      {/* Main Balance Blue Gradient Card & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Balance Hero Card */}
        <div className="lg:col-span-2 rounded-3xl p-6 md-blue-gradient border border-blue-300/25 flex flex-col justify-between min-h-[185px] relative overflow-hidden">
          <div className="pointer-events-none absolute -bottom-14 -right-10 w-44 h-44 rounded-full bg-sky-300/20 blur-2xl" />

          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs font-semibold text-blue-100">
                <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-white" />
                </div>
                <span>Saldo Aktif Akun</span>
              </div>
              {userProfile && (
                <button
                  onClick={() => refreshUserProfile()}
                  className="p-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white transition-all cursor-pointer"
                  title="Perbarui Saldo"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-mono font-black text-3xl sm:text-4xl text-white tracking-tight tabular-nums">
                {userProfile ? userProfile.balance.toLocaleString() : '0'}
              </span>
              <span className="text-xs font-medium text-blue-100/80">Saldo</span>
            </div>
          </div>

          <div className="relative mt-6 pt-4 border-t border-white/20 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-medium text-blue-50 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-sky-200" />
              <span>Minimal deposit 500 via QRIS Instan</span>
            </div>

            <div>
              {userProfile ? (
                <button
                  onClick={() => setActiveTab('deposit')}
                  className="py-2 px-4 rounded-xl bg-white text-[#102A6B] hover:bg-blue-50 font-bold text-xs shadow-[0_8px_20px_-6px_rgba(0,0,0,0.45)] flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Deposit Sekarang</span>
                </button>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="py-2 px-4 rounded-xl bg-white text-[#102A6B] hover:bg-blue-50 font-bold text-xs shadow-[0_8px_20px_-6px_rgba(0,0,0,0.45)] flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Masuk untuk Deposit</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2-Column Mobile Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl md-card flex flex-col justify-center">
            <span className="text-xs font-semibold text-blue-300">Total Transaksi</span>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-1.5 tabular-nums">
              {totalTransactionsCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Order & Deposit</span>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl md-card flex flex-col justify-center">
            <span className="text-xs font-semibold text-sky-300">Order Berhasil</span>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-1.5 tabular-nums">
              {successfulOrdersCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Akun terproses</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Card with CTA + Illustration */}
      <div className="md-card rounded-3xl p-5 sm:p-7 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-blue-600/20 blur-3xl" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-300 font-semibold">
                AM PREMIUM AZRYL
              </span>
              <span className="text-slate-500">·</span>
              <span
                className={`font-semibold ${
                  storeSettings?.storeOpen !== false ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {storeSettings?.storeOpen !== false ? 'Layanan Buka 24 Jam' : 'Tutup Sementara'}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xl">
              Kelola saldo QRIS, pesan akun Bulk AM otomatis, dan selesaikan verifikasi link Alight Motion resmi dalam satu dashboard modern.
            </p>

            <div className="pt-1 flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  setSelectedProduct('bulk-am');
                  setActiveTab('menu');
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] text-white font-semibold text-xs nb-btn flex items-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Order Bulk AM</span>
                <span className="px-2 py-0.5 rounded-md bg-black/25 border border-white/20 font-mono text-[11px] font-bold">
                  Rp {bulkPrice.toLocaleString('id-ID')}
                </span>
              </button>

              <button
                onClick={() => {
                  setSelectedProduct('am-verif');
                  setActiveTab('menu');
                }}
                className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-blue-500/15 text-slate-100 border border-white/12 font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <span>Order AM Verif</span>
                <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-400/30 text-sky-300 font-mono text-[11px] font-bold">
                  Rp {verifPrice.toLocaleString('id-ID')}
                </span>
              </button>
            </div>
          </div>

          {/* Hero Visual Illustration */}
          <div className="lg:col-span-5">
            <div className="w-full aspect-[16/10] rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#121728] to-[#0D111C] shadow-[0_16px_40px_-14px_rgba(37,99,235,0.45)] relative">
              <img
                src={HERO_ILLUSTRATION}
                alt="AM PREMIUM AZRYL Workspace"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  if (!img.dataset.fallbackUsed) {
                    img.dataset.fallbackUsed = '1';
                    img.src = HERO_ILLUSTRATION_FALLBACK;
                  } else {
                    img.style.display = 'none';
                  }
                }}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#101114]/65 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity / Last Transactions */}
      {userProfile && (recentOrders.length > 0 || recentDeposits.length > 0) && (
        <div className="rounded-3xl md-card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.08]">
            <h2 className="text-sm font-bold font-display text-white">Aktivitas Terakhir</h2>
            <button
              onClick={() => setActiveTab('history')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 cursor-pointer"
            >
              Buka Riwayat
            </button>
          </div>

          <div className="space-y-2.5">
            {recentOrders.map((ord) => (
              <div
                key={ord.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#12141A] border border-white/[0.06] hover:border-blue-400/25 transition-colors text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-400/25 text-blue-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                    AM
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate">
                      {ord.productName} · {ord.quantity} akun
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate">{ord.email}</div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-2">
                  <div className="font-mono font-bold text-white tabular-nums">
                    {ord.totalPrice.toLocaleString()}
                  </div>
                  <span
                    className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                      ord.status === 'Berhasil'
                        ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                        : ord.status === 'Sedang diproses'
                        ? 'bg-sky-500/15 border-sky-400/30 text-sky-300'
                        : ord.status === 'Gagal'
                        ? 'bg-rose-500/15 border-rose-400/30 text-rose-300'
                        : 'bg-blue-500/15 border-blue-400/30 text-blue-300'
                    }`}
                  >
                    {ord.status}
                  </span>
                </div>
              </div>
            ))}

            {recentDeposits.map((dep) => (
              <div
                key={dep.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#12141A] border border-white/[0.06] hover:border-blue-400/25 transition-colors text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-400/25 text-sky-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                    QR
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate">
                      Deposit QRIS · {dep.senderName}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate">{dep.id}</div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-2">
                  <div className="font-mono font-bold text-sky-300 tabular-nums">
                    +{dep.amount.toLocaleString()}
                  </div>
                  <span
                    className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                      dep.status === 'Berhasil'
                        ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                        : dep.status === 'Ditolak'
                        ? 'bg-rose-500/15 border-rose-400/30 text-rose-300'
                        : 'bg-blue-500/15 border-blue-400/30 text-blue-300'
                    }`}
                  >
                    {dep.status}
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
