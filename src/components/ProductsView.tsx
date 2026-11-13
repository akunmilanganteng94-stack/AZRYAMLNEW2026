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

      const data = await res.json();
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
    <div className="space-y-6 max-w-4xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border-2 border-slate-950 shadow-[4px_4px_0px_0px_#020617]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-[#FFE600] border border-slate-950 text-[10px] font-black tracking-widest text-slate-950 uppercase">
              AZRYL OFFICIAL
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-display text-slate-950">
            Order Layanan AM
          </h1>
          <p className="text-xs font-medium text-slate-600 mt-0.5">
            Pilih jenis layanan Alight Motion: Bulk akun otomatis atau verifikasi link resmi by AZRYL.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1.5 bg-[#EBF1FF] rounded-xl border-2 border-slate-950 gap-1.5 shrink-0">
          <button
            onClick={() => {
              setActiveTabLocal('bulk-am');
              setSelectedProductId('bulk-am');
            }}
            className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
              activeTab === 'bulk-am'
                ? 'bg-[#FFE600] text-slate-950 border-2 border-slate-950 shadow-[2px_2px_0px_0px_#020617]'
                : 'text-slate-700 hover:text-slate-950 border-2 border-transparent'
            }`}
          >
            Bulk AM ({bulkProduct.price})
          </button>
          <button
            onClick={() => {
              setActiveTabLocal('am-verif');
              setSelectedProductId('am-verif');
            }}
            className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
              activeTab === 'am-verif'
                ? 'bg-[#38BDF8] text-slate-950 border-2 border-slate-950 shadow-[2px_2px_0px_0px_#020617]'
                : 'text-slate-700 hover:text-slate-950 border-2 border-transparent'
            }`}
          >
            AM Verif ({verifProduct.price})
          </button>
        </div>
      </div>

      {/* Store Closed Warning */}
      {!storeSettings?.storeOpen && (
        <div className="p-4 rounded-2xl bg-[#FFE4E6] border-2 border-slate-950 shadow-[3px_3px_0px_0px_#020617] text-slate-950 text-xs font-bold flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0" />
          <span>Toko sedang tutup sementara oleh administrator. Pemesanan tidak dapat diproses saat ini.</span>
        </div>
      )}

      {/* =========================================================================
          PRODUK 1: BULK AM (200 / Akun)
         ========================================================================= */}
      {activeTab === 'bulk-am' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-white border-2 border-slate-950 rounded-2xl p-5 sm:p-6 shadow-[5px_5px_0px_0px_#020617]">
            {/* Product Details & Horizontal Logo */}
            <div className="md:col-span-5 space-y-4">
              <div className="w-full aspect-[16/8] rounded-xl overflow-hidden bg-slate-100 border-2 border-slate-950 relative">
                <img
                  src={bulkProduct.image || 'https://cdn.corenexis.com/f/hUimw94N.webp'}
                  alt="Bulk AM Logo"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/product-banner.webp';
                  }}
                />

                <div className="absolute top-2.5 left-2.5 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#FFE600] p-1 border-2 border-slate-950 shadow-[2px_2px_0px_0px_#020617]">
                    <img
                      src="https://cdn.corenexis.com/f/eJVaVCyH.png"
                      alt="AM Logo"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/am-logo.png';
                      }}
                    />
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-white border-2 border-slate-950 text-[10px] font-black text-slate-950">
                    Bulk AM Service
                  </span>
                </div>

                <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-[#4ADE80] border-2 border-slate-950 text-[10px] font-black text-slate-950">
                  Ready Stock
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <h2 className="text-xl font-black font-display text-slate-950">Bulk AM</h2>
                  <span className="text-2xl font-black font-mono text-[#2563EB] tabular-nums">
                    {bulkProduct.price.toLocaleString()}{' '}
                    <span className="text-xs font-sans font-bold text-slate-600">/ akun</span>
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-700 mt-1.5 leading-relaxed">
                  Layanan inject akun Alight Motion Bulk cepat, stabil, dan otomatis. Pilih jumlah akun (1 - 5 akun) dalam satu proses pemesanan.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#E0F2FE] border-2 border-slate-950 text-xs text-slate-950 space-y-1.5">
                <div className="flex items-center gap-2 font-black">
                  <ShieldCheck className="w-4 h-4 text-slate-950" />
                  <span>Spesifikasi Layanan:</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-800 space-y-1 pl-6">
                  <p>• Minimal order: 1 produk</p>
                  <p>• Maksimal order: 5 produk per transaksi</p>
                  <p>• Proses otomatis langsung dari server</p>
                  <p>• Refund otomatis jika terjadi kegagalan server</p>
                </div>
              </div>
            </div>

            {/* Order Form (No Gmail Input) */}
            <div className="md:col-span-7 space-y-4 flex flex-col justify-between border-t-2 md:border-t-0 md:border-l-2 border-slate-950 pt-5 md:pt-0 md:pl-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-950">
                      Jumlah Akun (1 - 5)
                    </label>
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-[#FFE600] border border-slate-950 text-slate-950">
                      {bulkQuantity} Akun
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setBulkQuantity(Math.max(1, bulkQuantity - 1))}
                      disabled={bulkQuantity <= 1}
                      className="w-12 h-11 rounded-xl bg-white hover:bg-[#FFE600] border-2 border-slate-950 shadow-[2px_2px_0px_0px_#020617] text-slate-950 flex items-center justify-center disabled:opacity-40 cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <div className="flex-1 grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setBulkQuantity(num)}
                          className={`h-11 rounded-xl text-xs font-black border-2 border-slate-950 transition-all cursor-pointer ${
                            bulkQuantity === num
                              ? 'bg-[#FFE600] text-slate-950 shadow-[3px_3px_0px_0px_#020617]'
                              : 'bg-[#EBF1FF] text-slate-700 hover:bg-white hover:text-slate-950'
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
                      className="w-12 h-11 rounded-xl bg-white hover:bg-[#FFE600] border-2 border-slate-950 shadow-[2px_2px_0px_0px_#020617] text-slate-950 flex items-center justify-center disabled:opacity-40 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Total Price Card */}
                <div className="p-4 rounded-2xl bg-[#F0F4FF] border-2 border-slate-950 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Harga Satuan:</span>
                    <span className="font-mono">{bulkProduct.price.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Jumlah Dipesan:</span>
                    <span className="font-mono">{bulkQuantity} Akun</span>
                  </div>
                  <div className="h-0.5 bg-slate-950 my-1" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-950">Total Pembayaran:</span>
                    <span className="text-xl font-black font-mono text-[#2563EB] tabular-nums">
                      {bulkTotalPrice.toLocaleString()}
                    </span>
                  </div>

                  {userProfile && (
                    <div className="pt-2 text-[11px] font-bold flex items-center justify-between">
                      <span className="text-slate-600">Saldo Anda:</span>
                      <span
                        className={`font-mono font-black ${
                          hasEnoughBulkBalance ? 'text-[#16A34A]' : 'text-[#DC2626]'
                        }`}
                      >
                        {userProfile.balance.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {!hasEnoughBulkBalance && userProfile && (
                  <div className="p-3 rounded-xl bg-[#FFE4E6] border-2 border-slate-950 text-slate-950 text-xs font-bold flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
                      <span>Saldo Anda kurang {(bulkTotalPrice - userProfile.balance).toLocaleString()}.</span>
                    </div>
                    <button
                      onClick={() => setActiveTab('deposit')}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 text-white font-extrabold text-[11px] hover:bg-[#2563EB] cursor-pointer"
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
                    disabled={bulkProcessing || !hasEnoughBulkBalance || !storeSettings?.storeOpen}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs nb-btn flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
                    className="w-full py-3.5 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs nb-btn flex items-center justify-center gap-2 cursor-pointer"
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
                className={`p-5 rounded-2xl border-2 border-slate-950 shadow-[5px_5px_0px_0px_#020617] ${
                  isSuccess ? 'bg-[#DCFCE7]' : 'bg-[#FFE4E6]'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl border-2 border-slate-950 flex items-center justify-center shrink-0 ${
                        isSuccess ? 'bg-[#4ADE80]' : 'bg-[#FB7185]'
                      }`}
                    >
                      {isSuccess ? (
                        <CheckCircle2 className="w-5 h-5 text-slate-950" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-slate-950" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-950">
                          Status Transaksi: {bulkOrderResult.status}
                        </h3>
                        <span className="px-2 py-0.5 rounded bg-slate-950 text-[9px] font-black tracking-widest text-[#FFE600] uppercase">
                          AZRYL
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 mt-1">
                        ID: <span className="font-mono font-bold">{bulkOrderResult.id}</span> · Jumlah:{' '}
                        <span className="font-mono font-bold">{bulkOrderResult.quantity} akun Bulk AM</span>
                      </p>
                      {bulkOrderResult.errorNote && (
                        <p className="text-xs text-[#DC2626] mt-1 font-bold">{bulkOrderResult.errorNote}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('history')}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FFE600] border-2 border-slate-950 shadow-[2px_2px_0px_0px_#020617] text-xs font-extrabold text-slate-950 cursor-pointer"
                  >
                    Lihat Riwayat
                  </button>
                </div>

                {/* Display ONLY email, inbox_link, validUntil */}
                {bulkAccounts.length > 0 && (
                  <div className="mt-4 pt-4 border-t-2 border-slate-950 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-950">
                        Detail Akun Bulk AM · AZRYL ({bulkAccounts.length})
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {bulkAccounts.map((acc, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl bg-white border-2 border-slate-950 shadow-[3px_3px_0px_0px_#020617] space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg bg-[#FFE600] border border-slate-950 text-[10px] font-black text-slate-950">
                              AKUN #{idx + 1} · AZRYL
                            </span>
                            {acc.validUntil && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E0F2FE] border border-slate-950 text-[11px] font-bold text-slate-950">
                                <Clock className="w-3 h-3" />
                                <span>Valid: {formatValidUntil(acc.validUntil)}</span>
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="p-2.5 rounded-xl bg-[#EBF1FF] border-2 border-slate-950 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                                  Email
                                </div>
                                <div className="text-xs font-mono font-bold text-slate-950 truncate">
                                  {acc.email || '-'}
                                </div>
                              </div>
                              {acc.email && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(acc.email, `prod-email-${idx}`)}
                                  className="p-1.5 rounded-lg bg-white hover:bg-[#FFE600] border-2 border-slate-950 text-slate-950 shrink-0 cursor-pointer"
                                  title="Salin Email"
                                >
                                  {copiedKey === `prod-email-${idx}` ? (
                                    <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>

                            <div className="p-2.5 rounded-xl bg-[#EBF1FF] border-2 border-slate-950 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                                  Inbox Link
                                </div>
                                <div className="text-xs font-mono font-bold text-[#2563EB] truncate">
                                  {acc.inbox_link || '-'}
                                </div>
                              </div>
                              {acc.inbox_link && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(acc.inbox_link, `prod-inbox-${idx}`)}
                                    className="p-1.5 rounded-lg bg-white hover:bg-[#FFE600] border-2 border-slate-950 text-slate-950 cursor-pointer"
                                    title="Salin Link"
                                  >
                                    {copiedKey === `prod-inbox-${idx}` ? (
                                      <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <a
                                    href={acc.inbox_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-2 border-slate-950 text-[11px] font-extrabold inline-flex items-center gap-1"
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
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-white border-2 border-slate-950 rounded-2xl p-5 sm:p-6 shadow-[5px_5px_0px_0px_#020617]">
            {/* Product Details & Horizontal Logo */}
            <div className="md:col-span-5 space-y-4">
              <div className="w-full aspect-[16/8] rounded-xl overflow-hidden bg-slate-100 border-2 border-slate-950 relative">
                <img
                  src={verifProduct.image || 'https://cdn.corenexis.com/f/hUimw94N.webp'}
                  alt="AM Verif Logo"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/product-banner.webp';
                  }}
                />

                <div className="absolute top-2.5 left-2.5 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#FFE600] p-1 border-2 border-slate-950 shadow-[2px_2px_0px_0px_#020617]">
                    <img
                      src="https://cdn.corenexis.com/f/eJVaVCyH.png"
                      alt="AM Logo"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/am-logo.png';
                      }}
                    />
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-white border-2 border-slate-950 text-[10px] font-black text-slate-950">
                    AM Verif Service
                  </span>
                </div>

                <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-[#38BDF8] border-2 border-slate-950 text-[10px] font-black text-slate-950">
                  Verifikasi Resmi
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <h2 className="text-xl font-black font-display text-slate-950">AM Verif</h2>
                  <span className="text-2xl font-black font-mono text-[#2563EB] tabular-nums">
                    {verifProduct.price.toLocaleString()}{' '}
                    <span className="text-xs font-sans font-bold text-slate-600">/ akun</span>
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-700 mt-1.5 leading-relaxed">
                  Layanan verifikasi resmi akun Alight Motion melalui link autentikasi. Selesaikan verifikasi yang sah secara aman tanpa kendala.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#FEF9C3] border-2 border-slate-950 text-xs text-slate-950 space-y-2">
                <div className="flex items-center gap-2 font-black">
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Alur Pemesanan Resmi:</span>
                </div>
                <ol className="text-[11px] font-semibold text-slate-800 space-y-1.5 pl-4 list-decimal">
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
              className="md:col-span-7 space-y-4 flex flex-col justify-between border-t-2 md:border-t-0 md:border-l-2 border-slate-950 pt-5 md:pt-0 md:pl-6"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-950 mb-1.5">
                    1. Gmail Akun Alight Motion
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={verifEmail}
                      onChange={(e) => setVerifEmail(e.target.value)}
                      placeholder="user@gmail.com"
                      className="w-full pl-10 pr-4 py-3 nb-input rounded-xl text-xs font-bold placeholder-slate-400 disabled:bg-slate-100"
                      required
                      disabled={isLinkSentToEmail}
                    />
                  </div>
                </div>

                {/* Step 1: Kirim link ke Gmail */}
                {!isLinkSentToEmail ? (
                  <div className="p-4 rounded-2xl bg-[#E0F2FE] border-2 border-slate-950 space-y-3">
                    <div className="text-xs text-slate-950 flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-slate-950 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-black">Langkah 1: Kirim Link</span>
                        <p className="text-[11px] font-medium text-slate-700 mt-0.5">
                          Klik tombol di bawah ini terlebih dahulu. Sistem akan mengirimkan link verifikasi ke Gmail Anda, setelah itu kolom link verifikasi akan muncul.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSendLinkToEmail}
                      disabled={isSendingLink || !verifEmail || !storeSettings?.storeOpen}
                      className="w-full py-3 px-4 rounded-xl bg-[#FFE600] hover:bg-[#FEF08A] text-slate-950 font-black text-xs nb-btn flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {isSendingLink ? (
                        <>
                          <span className="inline-block w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
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
                    <div className="p-3.5 rounded-xl bg-[#DCFCE7] border-2 border-slate-950 flex items-center justify-between text-xs text-slate-950">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                        <div className="truncate font-bold">
                          Link terkirim ke: <span className="font-mono">{verifEmail}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsLinkSentToEmail(false)}
                        className="text-[11px] font-extrabold text-[#2563EB] hover:underline cursor-pointer shrink-0 ml-2"
                      >
                        Ganti Gmail
                      </button>
                    </div>

                    <div>
                      <label className="text-xs font-extrabold uppercase tracking-wider text-slate-950 mb-1.5 flex items-center justify-between">
                        <span>2. Link Autentikasi Verifikasi (dari Gmail)</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E0F2FE] border border-slate-950 font-mono">
                          alight-creative
                        </span>
                      </label>
                      <div className="relative">
                        <LinkIcon className="w-4 h-4 text-slate-600 absolute left-3.5 top-3" />
                        <textarea
                          value={verifLink}
                          onChange={(e) => setVerifLink(e.target.value)}
                          placeholder="https://alight-creative.firebaseapp.com/__/auth/links?link=..."
                          rows={3}
                          className="w-full pl-10 pr-4 py-2.5 nb-input rounded-xl text-xs font-mono font-semibold placeholder-slate-400 resize-none"
                          required
                        />
                      </div>
                      <p className="text-[10px] font-medium text-slate-600 mt-1">
                        Buka aplikasi Gmail Anda, salin link verifikasi Alight Motion, dan tempelkan di kolom ini.
                      </p>
                    </div>
                  </div>
                )}

                {/* Price & Balance Info */}
                <div className="p-4 rounded-2xl bg-[#F0F4FF] border-2 border-slate-950 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-950">Biaya Verifikasi:</span>
                    <span className="text-xl font-black font-mono text-[#2563EB] tabular-nums">
                      {verifProduct.price.toLocaleString()}
                    </span>
                  </div>

                  {userProfile && (
                    <div className="pt-2 border-t-2 border-slate-950 text-[11px] font-bold flex items-center justify-between">
                      <span className="text-slate-600">Saldo Anda:</span>
                      <span
                        className={`font-mono font-black ${
                          hasEnoughVerifBalance ? 'text-[#16A34A]' : 'text-[#DC2626]'
                        }`}
                      >
                        {userProfile.balance.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {!hasEnoughVerifBalance && userProfile && (
                  <div className="p-3 rounded-xl bg-[#FFE4E6] border-2 border-slate-950 text-slate-950 text-xs font-bold flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
                      <span>Saldo kurang {(verifProduct.price - userProfile.balance).toLocaleString()}.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('deposit')}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 text-white font-extrabold text-[11px] cursor-pointer"
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
                      !storeSettings?.storeOpen
                    }
                    className="w-full py-3.5 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs nb-btn flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
                    className="w-full py-3.5 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs nb-btn flex items-center justify-center gap-2 cursor-pointer"
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
                className={`p-5 rounded-2xl border-2 border-slate-950 shadow-[5px_5px_0px_0px_#020617] ${
                  isSuccess ? 'bg-[#DCFCE7]' : 'bg-[#FFE4E6]'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl border-2 border-slate-950 flex items-center justify-center shrink-0 ${
                        isSuccess ? 'bg-[#4ADE80]' : 'bg-[#FB7185]'
                      }`}
                    >
                      {isSuccess ? (
                        <CheckCircle2 className="w-5 h-5 text-slate-950" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-slate-950" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-950">
                          Verifikasi: {verifOrderResult.status}
                        </h3>
                        <span className="px-2 py-0.5 rounded bg-slate-950 text-[9px] font-black tracking-widest text-[#FFE600] uppercase">
                          AZRYL
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 mt-1">
                        ID: <span className="font-mono font-bold">{verifOrderResult.id}</span> · Akun:{' '}
                        <span className="font-mono font-bold">{verifOrderResult.email}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('history')}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FFE600] border-2 border-slate-950 shadow-[2px_2px_0px_0px_#020617] text-xs font-extrabold text-slate-950 cursor-pointer"
                  >
                    Lihat Riwayat
                  </button>
                </div>

                {/* Display API Message */}
                <div className="mt-4 p-3.5 rounded-xl bg-white border-2 border-slate-950 text-xs text-slate-950">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Message · AZRYL Server
                  </div>
                  <div className="font-bold leading-relaxed">{verifMsg}</div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Confirmation Modal for Bulk AM */}
      {showBulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border-2 border-slate-950 rounded-2xl p-6 shadow-[8px_8px_0px_0px_#020617] relative">
            <h3 className="text-base font-black font-display text-slate-950 mb-1.5">
              Konfirmasi Pemesanan Bulk AM
            </h3>
            <p className="text-xs font-medium text-slate-600 mb-4">
              Periksa kembali rincian pemesanan Anda sebelum saldo dipotong.
            </p>

            <div className="p-3.5 rounded-xl bg-[#EBF1FF] border-2 border-slate-950 text-xs space-y-2 mb-5">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-600">Layanan:</span>
                <span className="font-black text-slate-950">Bulk AM</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-600">Jumlah Akun:</span>
                <span className="font-black text-slate-950">{bulkQuantity} Akun</span>
              </div>
              <div className="h-0.5 bg-slate-950" />
              <div className="flex justify-between font-black">
                <span className="text-slate-950">Total Harga:</span>
                <span className="text-[#2563EB] font-mono text-sm tabular-nums">
                  {bulkTotalPrice.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowBulkConfirm(false)}
                className="py-2.5 px-3 rounded-xl bg-white hover:bg-[#EBF1FF] text-slate-950 text-xs font-extrabold nb-btn cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleBulkOrderSubmit}
                className="py-2.5 px-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-extrabold nb-btn cursor-pointer"
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
