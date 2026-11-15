import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from './Toast.tsx';
import { ProductItem, OrderTransaction } from '../types/index.ts';
import { db, doc, setDoc } from '../lib/firebase.ts';
import {
  extractBulkAccounts,
  extractVerifMessage,
  formatValidUntil
} from '../utils/orderFormatting.ts';
import {
  sanitizeForFirestore,
  appendUserOrderCache
} from '../utils/transactionSync.ts';
import {
  ShoppingBag,
  Minus,
  Plus,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Send,
  Link as LinkIcon,
  Mail,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Clock
} from 'lucide-react';

interface ProductsViewProps {
  selectedProductId: string;
  setSelectedProductId: (id: string) => void;
  setActiveTab: (tab: string) => void;
  onOpenAuth: () => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  selectedProductId,
  setSelectedProductId,
  setActiveTab,
  onOpenAuth
}) => {
  const { userProfile, storeSettings, refreshUserProfile, updateBalanceLocally } = useAuth();
  const { showToast } = useToast();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [activeTab, setActiveTabLocal] = useState<'bulk-am' | 'am-verif'>(
    selectedProductId === 'am-verif' ? 'am-verif' : 'bulk-am'
  );

  // Bulk AM Form State
  const [bulkQuantity, setBulkQuantity] = useState<number>(1);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkOrderResult, setBulkOrderResult] = useState<OrderTransaction | null>(null);

  // AM Verif Form State
  const [verifEmail, setVerifEmail] = useState('');
  const [verifLink, setVerifLink] = useState('');
  const [isLinkSentToEmail, setIsLinkSentToEmail] = useState(false);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [verifProcessing, setVerifProcessing] = useState(false);
  const [verifOrderResult, setVerifOrderResult] = useState<OrderTransaction | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const isStoreClosed = storeSettings !== null && storeSettings.storeOpen === false;

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedKey(key);
    showToast('Berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
  };

  const handleSendLinkToEmail = async () => {
    if (!verifEmail || !verifEmail.includes('@')) {
      showToast('Masukkan alamat Gmail yang valid terlebih dahulu.', 'error');
      return;
    }

    setIsSendingLink(true);
    try {
      const res = await fetch('/api/verif/send-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gmail: verifEmail.trim() })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        showToast(data.error || 'Gagal mengirim link ke Gmail. Periksa kembali alamat Gmail Anda.', 'error');
        return;
      }

      setIsLinkSentToEmail(true);
      showToast(
        `Link verifikasi telah dikirim ke ${verifEmail}! Buka Gmail dan tempelkan link di kolom yang muncul.`,
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan jaringan saat mengirim link ke Gmail.', 'error');
    } finally {
      setIsSendingLink(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      setActiveTabLocal(selectedProductId === 'am-verif' ? 'am-verif' : 'bulk-am');
    }
  }, [selectedProductId]);

  const PRODUCT_BANNER_IMG = 'https://cdn.corenexis.com/f/hUimw94N.webp';

  const bulkProduct = products.find((p) => p.id === 'bulk-am') || {
    id: 'bulk-am',
    name: 'Bulk AM',
    price: 200,
    image: PRODUCT_BANNER_IMG,
    description: 'Layanan inject akun Alight Motion Bulk cepat, stabil, dan otomatis (1 - 5 akun).',
    active: true
  };

  const verifProduct = products.find((p) => p.id === 'am-verif') || {
    id: 'am-verif',
    name: 'AM Verif',
    price: 300,
    image: PRODUCT_BANNER_IMG,
    description: 'Verifikasi resmi akun Alight Motion via link autentikasi langsung.',
    active: true
  };

  const bulkTotalPrice = bulkProduct.price * bulkQuantity;
  const hasEnoughBulkBalance = (userProfile?.balance ?? 0) >= bulkTotalPrice;
  const hasEnoughVerifBalance = (userProfile?.balance ?? 0) >= verifProduct.price;

  // Handle Bulk Order Submission
  const handleBulkOrderSubmit = async () => {
    if (!userProfile) {
      onOpenAuth();
      return;
    }

    if (!hasEnoughBulkBalance) {
      showToast('Saldo tidak cukup. Silakan deposit terlebih dahulu.', 'error');
      return;
    }

    setShowBulkConfirm(false);
    setBulkProcessing(true);
    setBulkOrderResult(null);

    try {
      const res = await fetch('/api/orders/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: userProfile.uid,
          userEmail: userProfile.email,
          userName: userProfile.name,
          syncedBalance: userProfile.balance,
          quantity: bulkQuantity
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || 'Gagal memproses pesanan Bulk AM', 'error');
        setBulkProcessing(false);
        return;
      }

      setBulkOrderResult(data.order);
      if (data.order?.id) {
        appendUserOrderCache(userProfile.uid, userProfile.email, data.order);
        await setDoc(
          doc(db, 'orders', data.order.id),
          sanitizeForFirestore(data.order),
          { merge: true }
        ).catch((fsErr) => {
          console.warn('Firestore order sync warning:', fsErr);
        });
      }
      if (typeof data.currentBalance === 'number') {
        updateBalanceLocally(data.currentBalance);
        setDoc(
          doc(db, 'users', userProfile.uid),
          { balance: data.currentBalance, updatedAt: new Date().toISOString() },
          { merge: true }
        ).catch(() => {});
      } else {
        refreshUserProfile();
      }

      if (data.success) {
        showToast(data.message || 'Pesanan Bulk AM berhasil diproses!', 'success');
        setActiveTab('history');
      } else {
        showToast(data.message || 'Pesanan gagal diproses.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Terjadi kesalahan jaringan saat order.', 'error');
    } finally {
      setBulkProcessing(false);
    }
  };

  // Handle AM Verif Submission
  const handleVerifOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) {
      onOpenAuth();
      return;
    }

    if (!verifEmail || !verifEmail.includes('@')) {
      showToast('Masukkan alamat Gmail yang valid.', 'error');
      return;
    }

    if (!verifLink) {
      showToast('Masukkan link autentikasi verifikasi Alight Motion.', 'error');
      return;
    }

    if (!hasEnoughVerifBalance) {
      showToast('Saldo tidak cukup untuk verifikasi (300). Silakan deposit.', 'error');
      return;
    }

    setVerifProcessing(true);
    setVerifOrderResult(null);

    try {
      const res = await fetch('/api/orders/verif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: userProfile.uid,
          userEmail: userProfile.email,
          userName: userProfile.name,
          syncedBalance: userProfile.balance,
          email: verifEmail.trim(),
          link: verifLink.trim()
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || 'Gagal mengirim permintaan verifikasi.', 'error');
        setVerifProcessing(false);
        return;
      }

      setVerifOrderResult(data.order);
      if (data.order?.id) {
        appendUserOrderCache(userProfile.uid, userProfile.email, data.order);
        await setDoc(
          doc(db, 'orders', data.order.id),
          sanitizeForFirestore(data.order),
          { merge: true }
        ).catch((fsErr) => {
          console.warn('Firestore order sync warning:', fsErr);
        });
      }
      if (typeof data.currentBalance === 'number') {
        updateBalanceLocally(data.currentBalance);
        setDoc(
          doc(db, 'users', userProfile.uid),
          { balance: data.currentBalance, updatedAt: new Date().toISOString() },
          { merge: true }
        ).catch(() => {});
      } else {
        refreshUserProfile();
      }

      if (data.success) {
        showToast('Verifikasi akun AM berhasil terkonfirmasi!', 'success');
        setVerifLink('');
        setIsLinkSentToEmail(false);
      } else {
        showToast(data.message || 'Verifikasi gagal terkonfirmasi.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setVerifProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="md-card p-5 sm:p-6 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/25 text-[11px] font-semibold text-blue-300 mb-1.5">
              AM PREMIUM AZRYL
            </span>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-white">
              Order Layanan Alight Motion
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Pilih layanan di bawah ini untuk memulai pemesanan otomatis.
            </p>
          </div>
        </div>

        {/* Service Selector Cards — 2 Column Grid on Mobile & Desktop */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {[
            {
              id: 'bulk-am' as const,
              title: bulkProduct.name,
              subtitle: 'Inject akun otomatis',
              price: bulkProduct.price,
              badge: 'Instan'
            },
            {
              id: 'am-verif' as const,
              title: verifProduct.name,
              subtitle: 'Verifikasi link resmi',
              price: verifProduct.price,
              badge: 'Resmi'
            }
          ].map((svc) => {
            const isSelected = activeTab === svc.id;
            return (
              <button
                key={svc.id}
                type="button"
                onClick={() => {
                  setActiveTabLocal(svc.id);
                  setSelectedProductId(svc.id);
                }}
                className={`text-left p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'md-blue-gradient border-blue-300/35 text-white'
                    : 'bg-[#12141A] border-white/[0.08] text-slate-300 hover:border-blue-400/30 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      isSelected
                        ? 'bg-white/20 border-white/25 text-white'
                        : 'bg-blue-500/15 border-blue-400/25 text-blue-300'
                    }`}
                  >
                    {svc.badge}
                  </span>
                  <span className="font-mono font-bold text-xs sm:text-sm tabular-nums text-white">
                    Rp {svc.price.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="font-display font-bold text-sm sm:text-base text-white truncate">
                  {svc.title}
                </div>
                <div
                  className={`text-[11px] mt-0.5 truncate ${
                    isSelected ? 'text-blue-100/85' : 'text-slate-400'
                  }`}
                >
                  {svc.subtitle}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Store Closed Warning */}
      {isStoreClosed && (
        <div className="p-4 rounded-2xl bg-rose-500/12 border border-rose-400/25 text-rose-200 text-xs font-medium flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>Toko sedang tutup sementara oleh administrator. Pemesanan tidak dapat diproses saat ini.</span>
        </div>
      )}

      {/* =========================================================================
          PRODUK 1: BULK AM
         ========================================================================= */}
      {activeTab === 'bulk-am' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md-card rounded-3xl p-5 sm:p-6">
            {/* Product Details */}
            <div className="md:col-span-5 space-y-4">
              <div className="w-full aspect-[16/8] rounded-2xl overflow-hidden bg-[#12141A] border border-white/10 relative">
                <img
                  src={bulkProduct.image || 'https://cdn.corenexis.com/f/hUimw94N.webp'}
                  alt="Bulk AM Logo"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/product-banner.webp';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#101114]/75 via-transparent to-transparent" />
                <div className="absolute top-2.5 left-2.5 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#0EA5E9] p-1 border border-white/25">
                    <img
                      src="https://cdn.corenexis.com/f/eJVaVCyH.png"
                      alt="AM Logo"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/am-logo.png';
                      }}
                    />
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#1C1E24]/90 border border-white/15 text-[10px] font-semibold text-white">
                    Bulk AM Service
                  </span>
                </div>

                <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-emerald-500/90 text-[#052E16] text-[10px] font-bold">
                  Ready Stock
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <h2 className="text-xl font-bold font-display text-white">Bulk AM</h2>
                  <span className="text-2xl font-bold font-mono text-sky-300 tabular-nums">
                    Rp {bulkProduct.price.toLocaleString('id-ID')}{' '}
                    <span className="text-xs font-sans font-normal text-slate-400">/ akun</span>
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Layanan inject akun Alight Motion Bulk cepat, stabil, dan otomatis. Pilih jumlah akun (1 - 5 akun) dalam satu proses pemesanan.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#12141A] border border-white/[0.08] text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold text-blue-300">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Spesifikasi Layanan</span>
                </div>
                <div className="text-[11px] text-slate-300 space-y-1 pl-6">
                  <p>• Minimal order: 1 produk</p>
                  <p>• Maksimal order: 5 produk per transaksi</p>
                  <p>• Proses otomatis langsung dari server</p>
                  <p>• Refund otomatis jika terjadi kegagalan server</p>
                </div>
              </div>
            </div>

            {/* Order Form */}
            <div className="md:col-span-7 space-y-4 flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/[0.08] pt-5 md:pt-0 md:pl-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-200">
                      Jumlah Akun (1 - 5)
                    </label>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-300">
                      {bulkQuantity} Akun
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setBulkQuantity(Math.max(1, bulkQuantity - 1))}
                      disabled={bulkQuantity <= 1}
                      className="w-11 h-11 rounded-xl bg-[#12141A] hover:bg-blue-500/20 border border-white/10 text-white flex items-center justify-center disabled:opacity-40 cursor-pointer transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <div className="flex-1 grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setBulkQuantity(num)}
                          className={`h-11 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            bulkQuantity === num
                              ? 'bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white border-blue-300/30 shadow-[0_6px_16px_-4px_rgba(37,99,235,0.6)]'
                              : 'bg-[#12141A] text-slate-300 border-white/10 hover:border-blue-400/30 hover:text-white'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setBulkQuantity(Math.min(5, bulkQuantity + 1))}
                      disabled={bulkQuantity >= 5}
                      className="w-11 h-11 rounded-xl bg-[#12141A] hover:bg-blue-500/20 border border-white/10 text-white flex items-center justify-center disabled:opacity-40 cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Total Price Card */}
                <div className="p-4 rounded-2xl bg-[#12141A] border border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Harga Satuan</span>
                    <span className="font-mono text-slate-200">{bulkProduct.price.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Jumlah Dipesan</span>
                    <span className="font-mono text-slate-200">{bulkQuantity} Akun</span>
                  </div>
                  <div className="h-px bg-white/10 my-1" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Total Pembayaran</span>
                    <span className="text-xl font-bold font-mono text-sky-300 tabular-nums">
                      {bulkTotalPrice.toLocaleString()}
                    </span>
                  </div>

                  {userProfile && (
                    <div className="pt-2 text-[11px] flex items-center justify-between">
                      <span className="text-slate-400">Saldo Anda</span>
                      <span
                        className={`font-mono font-bold ${
                          hasEnoughBulkBalance ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {userProfile.balance.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {!hasEnoughBulkBalance && userProfile && (
                  <div className="p-3 rounded-xl bg-rose-500/12 border border-rose-400/25 text-rose-200 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Saldo Anda kurang {(bulkTotalPrice - userProfile.balance).toLocaleString()}.</span>
                    </div>
                    <button
                      onClick={() => setActiveTab('deposit')}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white font-semibold text-[11px] cursor-pointer shrink-0"
                    >
                      Deposit Sekarang
                    </button>
                  </div>
                )}
              </div>

              {/* Order Submit Button */}
              <div className="pt-2">
                {userProfile ? (
                  <button
                    onClick={() => setShowBulkConfirm(true)}
                    disabled={bulkProcessing || !hasEnoughBulkBalance || isStoreClosed}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white font-semibold text-xs nb-btn flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {bulkProcessing ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Sedang Memproses Permintaan API...</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        <span>Order Sekarang ({bulkTotalPrice.toLocaleString()})</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={onOpenAuth}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white font-semibold text-xs nb-btn flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Masuk untuk Memesan</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bulk Live Execution Result Box - ONLY email, inbox_link, validUntil */}
          {bulkOrderResult && (() => {
            const bulkAccounts = extractBulkAccounts(bulkOrderResult.apiResponse);
            const isSuccess = bulkOrderResult.status === 'Berhasil';
            return (
              <div
                className={`p-5 rounded-3xl border ${
                  isSuccess
                    ? 'bg-emerald-500/10 border-emerald-400/25'
                    : 'bg-rose-500/10 border-rose-400/25'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                        isSuccess
                          ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
                          : 'bg-rose-500/20 border-rose-400/30 text-rose-300'
                      }`}
                    >
                      {isSuccess ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">
                          Status Transaksi: {bulkOrderResult.status}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-[10px] font-semibold text-blue-200">
                          AZRYL
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        ID: <span className="font-mono font-semibold text-white">{bulkOrderResult.id}</span> · Jumlah:{' '}
                        <span className="font-mono font-semibold text-white">{bulkOrderResult.quantity} akun Bulk AM</span>
                      </p>
                      {bulkOrderResult.errorNote && (
                        <p className="text-xs text-rose-300 mt-1 font-medium">{bulkOrderResult.errorNote}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('history')}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white cursor-pointer"
                  >
                    Lihat Riwayat
                  </button>
                </div>

                {/* Display ONLY email, inbox_link, validUntil */}
                {bulkAccounts.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                    <span className="text-xs font-semibold text-blue-300 block">
                      Detail Akun Bulk AM · AZRYL ({bulkAccounts.length})
                    </span>

                    <div className="grid grid-cols-1 gap-3">
                      {bulkAccounts.map((acc, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-[#1C1E24] border border-white/[0.08] space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/25 text-[10px] font-semibold text-blue-300">
                              AKUN #{idx + 1} · AZRYL
                            </span>
                            {acc.validUntil && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-400/25 text-[11px] font-medium text-sky-200">
                                <Clock className="w-3 h-3" />
                                <span>Valid: {formatValidUntil(acc.validUntil)}</span>
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="p-3 rounded-xl bg-[#12141A] border border-white/[0.06] flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-[10px] text-slate-400">Email</div>
                                <div className="text-xs font-mono font-semibold text-white truncate">
                                  {acc.email || '-'}
                                </div>
                              </div>
                              {acc.email && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(acc.email, `prod-email-${idx}`)}
                                  className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-blue-500/25 border border-white/10 text-slate-200 shrink-0 cursor-pointer"
                                  title="Salin Email"
                                >
                                  {copiedKey === `prod-email-${idx}` ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>

                            <div className="p-3 rounded-xl bg-[#12141A] border border-white/[0.06] flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-[10px] text-slate-400">Inbox Link</div>
                                <div className="text-xs font-mono font-semibold text-sky-300 truncate">
                                  {acc.inbox_link || '-'}
                                </div>
                              </div>
                              {acc.inbox_link && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(acc.inbox_link, `prod-inbox-${idx}`)}
                                    className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-blue-500/25 border border-white/10 text-slate-200 cursor-pointer"
                                    title="Salin Link"
                                  >
                                    {copiedKey === `prod-inbox-${idx}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <a
                                    href={acc.inbox_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white text-[11px] font-semibold inline-flex items-center gap-1"
                                  >
                                    <span>Buka</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* =========================================================================
          PRODUK 2: AM VERIF
         ========================================================================= */}
      {activeTab === 'am-verif' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md-card rounded-3xl p-5 sm:p-6">
            {/* Product Details */}
            <div className="md:col-span-5 space-y-4">
              <div className="w-full aspect-[16/8] rounded-2xl overflow-hidden bg-[#12141A] border border-white/10 relative">
                <img
                  src={verifProduct.image || 'https://cdn.corenexis.com/f/hUimw94N.webp'}
                  alt="AM Verif Logo"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/product-banner.webp';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#101114]/75 via-transparent to-transparent" />
                <div className="absolute top-2.5 left-2.5 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0284C7] to-[#2563EB] p-1 border border-white/25">
                    <img
                      src="https://cdn.corenexis.com/f/eJVaVCyH.png"
                      alt="AM Logo"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/am-logo.png';
                      }}
                    />
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#1C1E24]/90 border border-white/15 text-[10px] font-semibold text-white">
                    AM Verif Service
                  </span>
                </div>

                <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-sky-400 text-[#082F49] text-[10px] font-bold">
                  Verifikasi Resmi
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <h2 className="text-xl font-bold font-display text-white">AM Verif</h2>
                  <span className="text-2xl font-bold font-mono text-sky-300 tabular-nums">
                    Rp {verifProduct.price.toLocaleString('id-ID')}{' '}
                    <span className="text-xs font-sans font-normal text-slate-400">/ akun</span>
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Layanan verifikasi resmi akun Alight Motion melalui link autentikasi. Selesaikan verifikasi yang sah secara aman tanpa kendala.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#12141A] border border-white/[0.08] text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold text-blue-300">
                  <Sparkles className="w-4 h-4" />
                  <span>Alur Pemesanan Resmi</span>
                </div>
                <ol className="text-[11px] text-slate-300 space-y-1.5 pl-4 list-decimal">
                  <li>Masukkan Gmail yang terdaftar di Alight Motion</li>
                  <li>Tekan tombol "Kirim Link ke Gmail"</li>
                  <li>Buka kotak masuk Gmail dan salin link autentikasi</li>
                  <li>Tempelkan link verifikasi pada kolom yang muncul</li>
                  <li>Tekan tombol "Kirim Verifikasi" untuk konfirmasi hasil akhir</li>
                </ol>
              </div>
            </div>

            {/* Verif Form */}
            <form
              onSubmit={handleVerifOrderSubmit}
              className="md:col-span-7 space-y-4 flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/[0.08] pt-5 md:pt-0 md:pl-6"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    1. Gmail Akun Alight Motion
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={verifEmail}
                      onChange={(e) => setVerifEmail(e.target.value)}
                      placeholder="user@gmail.com"
                      className="w-full pl-10 pr-4 py-3 nb-input rounded-xl text-xs font-medium placeholder-slate-500 disabled:opacity-60"
                      required
                      disabled={isLinkSentToEmail}
                    />
                  </div>
                </div>

                {/* Step 1: Kirim link ke Gmail */}
                {!isLinkSentToEmail ? (
                  <div className="p-4 rounded-2xl bg-[#12141A] border border-blue-400/20 space-y-3">
                    <div className="text-xs text-slate-200 flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white">Langkah 1: Kirim Link</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Klik tombol di bawah ini terlebih dahulu. Sistem akan mengirimkan link verifikasi ke Gmail Anda, setelah itu kolom link verifikasi akan muncul.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSendLinkToEmail}
                      disabled={isSendingLink || !verifEmail || isStoreClosed}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#2563EB] text-white font-semibold text-xs nb-btn flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {isSendingLink ? (
                        <>
                          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Mengirim Link ke {verifEmail || 'Gmail'}...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Kirim Link ke Gmail</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-emerald-500/12 border border-emerald-400/25 flex items-center justify-between text-xs text-emerald-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="truncate font-medium">
                          Link terkirim ke: <span className="font-mono text-white">{verifEmail}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsLinkSentToEmail(false)}
                        className="text-[11px] font-semibold text-blue-300 hover:text-blue-200 cursor-pointer shrink-0 ml-2"
                      >
                        Ganti Gmail
                      </button>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
                        <span>2. Link Autentikasi Verifikasi (dari Gmail)</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-300 font-mono">
                          alight-creative
                        </span>
                      </label>
                      <div className="relative">
                        <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <textarea
                          value={verifLink}
                          onChange={(e) => setVerifLink(e.target.value)}
                          placeholder="https://alight-creative.firebaseapp.com/__/auth/links?link=..."
                          rows={3}
                          className="w-full pl-10 pr-4 py-2.5 nb-input rounded-xl text-xs font-mono font-medium placeholder-slate-500 resize-none"
                          required
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Buka aplikasi Gmail Anda, salin link verifikasi Alight Motion, dan tempelkan di kolom ini.
                      </p>
                    </div>
                  </div>
                )}

                {/* Price & Balance Info */}
                <div className="p-4 rounded-2xl bg-[#12141A] border border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">Biaya Verifikasi</span>
                    <span className="text-xl font-bold font-mono text-sky-300 tabular-nums">
                      {verifProduct.price.toLocaleString()}
                    </span>
                  </div>

                  {userProfile && (
                    <div className="pt-2 border-t border-white/10 text-[11px] flex items-center justify-between">
                      <span className="text-slate-400">Saldo Anda</span>
                      <span
                        className={`font-mono font-bold ${
                          hasEnoughVerifBalance ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {userProfile.balance.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {!hasEnoughVerifBalance && userProfile && (
                  <div className="p-3 rounded-xl bg-rose-500/12 border border-rose-400/25 text-rose-200 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Saldo kurang {(verifProduct.price - userProfile.balance).toLocaleString()}.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('deposit')}
                      className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white font-semibold text-[11px] cursor-pointer"
                    >
                      Deposit
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                {userProfile ? (
                  <button
                    type="submit"
                    disabled={
                      verifProcessing ||
                      !isLinkSentToEmail ||
                      !verifLink ||
                      !hasEnoughVerifBalance ||
                      isStoreClosed
                    }
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white font-semibold text-xs nb-btn flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {verifProcessing ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Memverifikasi dengan Server API...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Kirim Verifikasi ({verifProduct.price.toLocaleString()})</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white font-semibold text-xs nb-btn flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Masuk untuk Memesan</span>
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Verif Result Feedback */}
          {verifOrderResult && (() => {
            const isSuccess = verifOrderResult.status === 'Berhasil';
            const verifMsg = extractVerifMessage(verifOrderResult);
            return (
              <div
                className={`p-5 rounded-3xl border ${
                  isSuccess
                    ? 'bg-emerald-500/10 border-emerald-400/25'
                    : 'bg-rose-500/10 border-rose-400/25'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                        isSuccess
                          ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
                          : 'bg-rose-500/20 border-rose-400/30 text-rose-300'
                      }`}
                    >
                      {isSuccess ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">
                          Verifikasi: {verifOrderResult.status}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-[10px] font-semibold text-blue-200">
                          AZRYL
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        ID: <span className="font-mono font-semibold text-white">{verifOrderResult.id}</span> · Akun:{' '}
                        <span className="font-mono font-semibold text-white">{verifOrderResult.email}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('history')}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white cursor-pointer"
                  >
                    Lihat Riwayat
                  </button>
                </div>

                {/* Display API Message */}
                <div className="mt-4 p-4 rounded-2xl bg-[#1C1E24] border border-white/[0.08] text-xs text-slate-100">
                  <div className="text-[10px] font-semibold text-blue-300 mb-1">
                    Message · AZRYL Server
                  </div>
                  <div className="font-medium leading-relaxed">{verifMsg}</div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Confirmation Modal for Bulk AM */}
      {showBulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#1C1E24] border border-white/12 rounded-3xl p-6 shadow-[0_24px_60px_rgba(0,0,0,0.85)] relative">
            <h3 className="text-base font-bold font-display text-white mb-1.5">
              Konfirmasi Pemesanan Bulk AM
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Periksa kembali rincian pemesanan Anda sebelum saldo dipotong.
            </p>

            <div className="p-4 rounded-2xl bg-[#12141A] border border-white/[0.08] text-xs space-y-2 mb-5">
              <div className="flex justify-between">
                <span className="text-slate-400">Layanan</span>
                <span className="font-semibold text-white">Bulk AM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Jumlah Akun</span>
                <span className="font-semibold text-white">{bulkQuantity} Akun</span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex justify-between font-bold">
                <span className="text-white">Total Harga</span>
                <span className="text-sky-300 font-mono text-sm tabular-nums">
                  {bulkTotalPrice.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowBulkConfirm(false)}
                className="py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleBulkOrderSubmit}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white text-xs font-semibold nb-btn cursor-pointer"
              >
                Konfirmasi Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
