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
  ShoppingBag, 
  Minus, 
  Plus, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Send, 
  Link as LinkIcon, 
  Mail, 
  ArrowRight,
  RefreshCw,
  Wallet,
  Clock,
  Sparkles,
  Copy,
  Check,
  ExternalLink
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

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedKey(key);
    showToast('Berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedKey(prev => (prev === key ? null : prev)), 2000);
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
      showToast(`Link verifikasi telah dikirim ke ${verifEmail}! Buka Gmail dan tempelkan link di kolom yang muncul.`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan jaringan saat mengirim link ke Gmail.', 'error');
    } finally {
      setIsSendingLink(false);
    }
  };

  // Fetch products
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

  const bulkProduct = products.find(p => p.id === 'bulk-am') || {
    id: 'bulk-am',
    name: 'Bulk AM',
    price: 200,
    image: PRODUCT_BANNER_IMG,
    description: 'Layanan inject akun Alight Motion Bulk cepat, stabil, dan otomatis (1 - 5 akun).',
    active: true
  };

  const verifProduct = products.find(p => p.id === 'am-verif') || {
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

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Gagal memproses pesanan Bulk AM', 'error');
        setBulkProcessing(false);
        return;
      }

      setBulkOrderResult(data.order);
      if (data.order?.id) {
        setDoc(doc(db, 'orders', data.order.id), data.order, { merge: true }).catch(() => {});
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

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Gagal mengirim permintaan verifikasi.', 'error');
        setVerifProcessing(false);
        return;
      }

      setVerifOrderResult(data.order);
      if (data.order?.id) {
        setDoc(doc(db, 'orders', data.order.id), data.order, { merge: true }).catch(() => {});
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
    <div className="space-y-6 max-w-4xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-950/50 via-[#0b1330] to-slate-950/60 p-4 sm:p-5 rounded-3xl border border-cyan-500/20 shadow-lg shadow-blue-950/30">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-400/30 text-[10px] font-extrabold tracking-widest text-cyan-300 uppercase">
              AZRYL OFFICIAL
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-white">
            Order Layanan AM
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pilih jenis layanan Alight Motion: Bulk akun otomatis atau verifikasi link resmi by AZRYL.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-950/80 rounded-2xl border border-blue-500/20">
          <button
            onClick={() => {
              setActiveTabLocal('bulk-am');
              setSelectedProductId('bulk-am');
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'bulk-am'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Bulk AM (200)
          </button>
          <button
            onClick={() => {
              setActiveTabLocal('am-verif');
              setSelectedProductId('am-verif');
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'am-verif'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            AM Verif (300)
          </button>
        </div>
      </div>

      {/* Store Closed Warning */}
      {!storeSettings?.storeOpen && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>Toko sedang tutup sementara oleh administrator. Pemesanan tidak dapat diproses saat ini.</span>
        </div>
      )}

      {/* =========================================================================
          PRODUK 1: BULK AM (200 / Akun)
         ========================================================================= */}
      {activeTab === 'bulk-am' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-[#080d1e] border border-blue-500/20 rounded-3xl p-5 sm:p-6 shadow-xl">
            {/* Product Details & Horizontal Logo */}
            <div className="md:col-span-5 space-y-4">
              {/* Horizontal Rectangular Logo - Long Banner */}
              <div className="w-full aspect-[16/8] rounded-2xl overflow-hidden bg-slate-950 border border-blue-500/30 relative shadow-inner">
                <img
                  src={bulkProduct.image || 'https://cdn.corenexis.com/f/hUimw94N.webp'}
                  alt="Bulk AM Logo"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/product-banner.webp';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20 pointer-events-none" />

                <div className="absolute top-2.5 left-2.5 flex items-center gap-2">
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
                    Bulk AM Service
                  </span>
                </div>

                <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-emerald-950/80 backdrop-blur-md border border-emerald-500/30 text-[10px] font-semibold text-emerald-300">
                  Ready Stock
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <h2 className="text-xl font-bold font-display text-white">Bulk AM</h2>
                  <span className="text-2xl font-extrabold font-display text-cyan-400">
                    {bulkProduct.price.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ akun</span>
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Layanan inject akun Alight Motion Bulk cepat, stabil, dan otomatis. Pilih jumlah akun (1 - 5 akun) dalam satu proses pemesanan.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/15 text-xs text-slate-300 space-y-1.5">
                <div className="flex items-center gap-2 text-cyan-300 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>Spesifikasi Layanan:</span>
                </div>
                <div className="text-[11px] text-slate-400 space-y-1 pl-6 list-disc">
                  <p>• Minimal order: 1 produk</p>
                  <p>• Maksimal order: 5 produk per transaksi</p>
                  <p>• Proses otomatis langsung dari server</p>
                  <p>• Refund otomatis jika terjadi kegagalan server</p>
                </div>
              </div>
            </div>

            {/* Order Form */}
            <div className="md:col-span-7 space-y-4 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-800/80 pt-5 md:pt-0 md:pl-6">
              <div className="space-y-4">

                {/* Quantity Selector (1 - 5) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Jumlah Akun (1 - 5)
                    </label>
                    <span className="text-xs font-semibold text-cyan-400">
                      {bulkQuantity} Akun
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setBulkQuantity(Math.max(1, bulkQuantity - 1))}
                      disabled={bulkQuantity <= 1}
                      className="w-12 h-11 rounded-xl bg-slate-900 border border-slate-700 text-white flex items-center justify-center hover:bg-slate-800 disabled:opacity-40 transition-all active:scale-95"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <div className="flex-1 grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setBulkQuantity(num)}
                          className={`h-11 rounded-xl text-xs font-bold transition-all ${
                            bulkQuantity === num
                              ? 'bg-blue-600 text-white border border-cyan-400 shadow-md shadow-blue-600/30'
                              : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-white'
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
                      className="w-12 h-11 rounded-xl bg-slate-900 border border-slate-700 text-white flex items-center justify-center hover:bg-slate-800 disabled:opacity-40 transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Total Price & Balance Validation Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 to-slate-900/60 border border-blue-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Harga Satuan:</span>
                    <span>{bulkProduct.price.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Jumlah Dipesan:</span>
                    <span>{bulkQuantity} Akun</span>
                  </div>
                  <div className="h-px bg-slate-800 my-1" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Total Pembayaran:</span>
                    <span className="text-xl font-extrabold font-display text-cyan-300">
                      {bulkTotalPrice.toLocaleString()}
                    </span>
                  </div>

                  {userProfile && (
                    <div className="pt-2 text-[11px] flex items-center justify-between">
                      <span className="text-slate-400">Saldo Anda:</span>
                      <span className={`font-semibold ${hasEnoughBulkBalance ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {userProfile.balance.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {!hasEnoughBulkBalance && userProfile && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Saldo Anda kurang {(bulkTotalPrice - userProfile.balance).toLocaleString()}.</span>
                    </div>
                    <button
                      onClick={() => setActiveTab('deposit')}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-semibold text-[11px] hover:bg-rose-500 transition-all"
                    >
                      Deposit Sekarang
                    </button>
                  </div>
                )}
              </div>

              {/* Order Submit Button */}
              <div className="pt-4">
                {userProfile ? (
                  <button
                    onClick={() => {
                      setShowBulkConfirm(true);
                    }}
                    disabled={bulkProcessing || !hasEnoughBulkBalance || !storeSettings?.storeOpen}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.98]"
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
                    className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <span>Masuk untuk Memesan</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bulk Live Execution Result Box */}
          {bulkOrderResult && (() => {
            const bulkAccounts = extractBulkAccounts(bulkOrderResult.apiResponse);
            const isSuccess = bulkOrderResult.status === 'Berhasil';
            return (
              <div className={`p-5 rounded-3xl border shadow-xl relative overflow-hidden ${
                isSuccess
                  ? 'bg-gradient-to-br from-[#07162c] via-[#091229] to-[#061822] border-cyan-500/30'
                  : 'bg-rose-950/30 border-rose-500/30'
              }`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {isSuccess ? (
                      <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-2xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-5 h-5 text-rose-400" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">
                          Status Transaksi: {bulkOrderResult.status}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-cyan-400/30 text-[9px] font-extrabold tracking-widest text-cyan-300 uppercase">
                          AZRYL
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        ID: <span className="font-mono text-cyan-300">{bulkOrderResult.id}</span> · Jumlah: <span className="font-mono">{bulkOrderResult.quantity} akun Bulk AM</span>
                      </p>
                      {bulkOrderResult.errorNote && (
                        <p className="text-xs text-amber-300 mt-1 font-medium">{bulkOrderResult.errorNote}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('history')}
                    className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-xs text-cyan-200 hover:text-white hover:border-cyan-400 transition-all cursor-pointer"
                  >
                    Lihat Riwayat
                  </button>
                </div>

                {/* Display ONLY email, inbox_link, validUntil */}
                {bulkAccounts.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-cyan-500/15 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                        Detail Akun Bulk AM · AZRYL ({bulkAccounts.length})
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {bulkAccounts.map((acc, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-slate-950/80 border border-blue-500/25 hover:border-cyan-400/40 transition-all space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg bg-blue-600/20 border border-blue-400/30 text-[10px] font-bold text-cyan-300">
                              AKUN #{idx + 1} · AZRYL
                            </span>
                            {acc.validUntil && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-400/25 text-[11px] font-medium text-amber-300">
                                <Clock className="w-3 h-3" />
                                <span>Valid: {formatValidUntil(acc.validUntil)}</span>
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="p-2.5 rounded-xl bg-black/50 border border-slate-800 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Email</div>
                                <div className="text-xs font-mono font-semibold text-white truncate">
                                  {acc.email || '-'}
                                </div>
                              </div>
                              {acc.email && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(acc.email, `prod-email-${idx}`)}
                                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-blue-600/30 border border-slate-700 text-cyan-300 shrink-0 cursor-pointer"
                                  title="Salin Email"
                                >
                                  {copiedKey === `prod-email-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </div>

                            <div className="p-2.5 rounded-xl bg-black/50 border border-slate-800 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Inbox Link</div>
                                <div className="text-xs font-mono text-cyan-300 truncate">
                                  {acc.inbox_link || '-'}
                                </div>
                              </div>
                              {acc.inbox_link && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(acc.inbox_link, `prod-inbox-${idx}`)}
                                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-blue-600/30 border border-slate-700 text-slate-300 cursor-pointer"
                                    title="Salin Link"
                                  >
                                    {copiedKey === `prod-inbox-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                  <a
                                    href={acc.inbox_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-[11px] font-bold inline-flex items-center gap-1"
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
          PRODUK 2: AM VERIF (300 / Akun)
         ========================================================================= */}
      {activeTab === 'am-verif' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-[#080d1e] border border-blue-500/20 rounded-3xl p-5 sm:p-6 shadow-xl">
            {/* Product Details & Horizontal Logo */}
            <div className="md:col-span-5 space-y-4">
              {/* Horizontal Rectangular Logo - Long Banner */}
              <div className="w-full aspect-[16/8] rounded-2xl overflow-hidden bg-slate-950 border border-cyan-500/30 relative shadow-inner">
                <img
                  src={verifProduct.image || 'https://cdn.corenexis.com/f/hUimw94N.webp'}
                  alt="AM Verif Logo"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/product-banner.webp';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20 pointer-events-none" />

                <div className="absolute top-2.5 left-2.5 flex items-center gap-2">
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
                    AM Verif Service
                  </span>
                </div>

                <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-emerald-950/80 backdrop-blur-md border border-emerald-500/30 text-[10px] font-semibold text-emerald-300">
                  Verifikasi Resmi
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <h2 className="text-xl font-bold font-display text-white">AM Verif</h2>
                  <span className="text-2xl font-extrabold font-display text-cyan-400">
                    {verifProduct.price.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ akun</span>
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Layanan verifikasi resmi akun Alight Motion melalui link autentikasi. Selesaikan verifikasi yang sah secara aman tanpa kendala.
                </p>
              </div>

              {/* Verification Steps Guide */}
              <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/15 text-xs text-slate-300 space-y-2">
                <div className="flex items-center gap-2 text-cyan-300 font-semibold">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Alur Pemesanan Resmi:</span>
                </div>
                <ol className="text-[11px] text-slate-400 space-y-1.5 pl-4 list-decimal">
                  <li>Masukkan Gmail yang terdaftar di Alight Motion</li>
                  <li>Tekan tombol "Kirim Link ke Gmail"</li>
                  <li>Buka kotak masuk Gmail dan salin link autentikasi</li>
                  <li>Tempelkan link verifikasi pada kolom yang muncul</li>
                  <li>Tekan tombol "Kirim Verifikasi" untuk konfirmasi hasil akhir</li>
                </ol>
              </div>
            </div>

            {/* Verif Form */}
            <form onSubmit={handleVerifOrderSubmit} className="md:col-span-7 space-y-4 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-800/80 pt-5 md:pt-0 md:pl-6">
              <div className="space-y-4">
                {/* Target Gmail */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    1. Gmail Akun Alight Motion
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={verifEmail}
                      onChange={(e) => setVerifEmail(e.target.value)}
                      placeholder="user@gmail.com"
                      className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
                      required
                      disabled={isLinkSentToEmail}
                    />
                  </div>
                </div>

                {/* Step 1: Kirim link ke Gmail (jika link belum dikirim) */}
                {!isLinkSentToEmail ? (
                  <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/20 space-y-3">
                    <div className="text-xs text-slate-300 flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-white">Langkah 1: Kirim Link</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Klik tombol di bawah ini terlebih dahulu. Sistem akan mengirimkan link verifikasi ke Gmail Anda, setelah itu kolom link verifikasi akan muncul.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSendLinkToEmail}
                      disabled={isSendingLink || !verifEmail || !storeSettings?.storeOpen}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.98] cursor-pointer"
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
                  /* Step 2: Kolom link verifikasi muncul SETELAH link dikirim ke Gmail */
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <span className="font-semibold text-white">Link terkirim ke:</span> {verifEmail}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsLinkSentToEmail(false)}
                        className="text-[11px] text-cyan-300 hover:text-cyan-200 underline cursor-pointer"
                      >
                        Ganti Gmail
                      </button>
                    </div>

                    {/* Link Verifikasi Textarea */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                        <span>2. Link Autentikasi Verifikasi (dari Gmail)</span>
                        <span className="text-[10px] text-cyan-400 font-mono">alight-creative</span>
                      </label>
                      <div className="relative">
                        <LinkIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <textarea
                          value={verifLink}
                          onChange={(e) => setVerifLink(e.target.value)}
                          placeholder="https://alight-creative.firebaseapp.com/__/auth/links?link=..."
                          rows={3}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all resize-none font-mono"
                          required
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Buka aplikasi Gmail Anda, salin link verifikasi Alight Motion, dan tempelkan di kolom ini.
                      </p>
                    </div>
                  </div>
                )}

                {/* Price & Balance Info */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 to-slate-900/60 border border-blue-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Biaya Verifikasi:</span>
                    <span className="text-xl font-extrabold font-display text-cyan-300">
                      {verifProduct.price.toLocaleString()}
                    </span>
                  </div>

                  {userProfile && (
                    <div className="pt-2 border-t border-slate-800 text-[11px] flex items-center justify-between">
                      <span className="text-slate-400">Saldo Anda:</span>
                      <span className={`font-semibold ${hasEnoughVerifBalance ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {userProfile.balance.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {!hasEnoughVerifBalance && userProfile && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Saldo kurang {(verifProduct.price - userProfile.balance).toLocaleString()}.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('deposit')}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-semibold text-[11px]"
                    >
                      Deposit
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                {userProfile ? (
                  <button
                    type="submit"
                    disabled={verifProcessing || !isLinkSentToEmail || !verifLink || !hasEnoughVerifBalance || !storeSettings?.storeOpen}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.98]"
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
                    className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all"
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
              <div className={`p-5 rounded-3xl border shadow-xl ${
                isSuccess
                  ? 'bg-gradient-to-br from-[#07162c] via-[#091229] to-[#061822] border-cyan-500/30'
                  : 'bg-rose-950/30 border-rose-500/30'
              }`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {isSuccess ? (
                      <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-2xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-5 h-5 text-rose-400" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">
                          Verifikasi: {verifOrderResult.status}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-cyan-400/30 text-[9px] font-extrabold tracking-widest text-cyan-300 uppercase">
                          AZRYL
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        ID: <span className="font-mono text-cyan-300">{verifOrderResult.id}</span> · Akun: <span className="font-mono">{verifOrderResult.email}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('history')}
                    className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-xs text-cyan-200 hover:text-white cursor-pointer"
                  >
                    Lihat Riwayat
                  </button>
                </div>

                {/* Display API Message */}
                <div className={`mt-4 p-3.5 rounded-2xl border text-xs ${
                  isSuccess
                    ? 'bg-emerald-950/30 border-emerald-500/25 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
                }`}>
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-75 mb-1">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-[#090e21] border border-blue-500/30 rounded-3xl p-6 shadow-2xl relative">
            <h3 className="text-base font-bold font-display text-white mb-2">
              Konfirmasi Pemesanan Bulk AM
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Periksa kembali rincian pemesanan Anda sebelum saldo dipotong.
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-2 mb-5">
              <div className="flex justify-between">
                <span className="text-slate-400">Layanan:</span>
                <span className="font-semibold text-white">Bulk AM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Jumlah Akun:</span>
                <span className="font-semibold text-white">{bulkQuantity} Akun</span>
              </div>
              <div className="h-px bg-slate-800" />
              <div className="flex justify-between font-bold">
                <span className="text-slate-200">Total Harga:</span>
                <span className="text-cyan-400 text-sm">{bulkTotalPrice.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowBulkConfirm(false)}
                className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleBulkOrderSubmit}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all"
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
