import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from './Toast.tsx';
import { DepositTransaction } from '../types/index.ts';
import { db, doc, setDoc } from '../lib/firebase.ts';
import {
  sanitizeForFirestore,
  appendUserDepositCache
} from '../utils/transactionSync.ts';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  User,
  Info,
  ArrowRight,
  X
} from 'lucide-react';

interface DepositViewProps {
  setActiveTab: (tab: string) => void;
  onOpenAuth: () => void;
}

export const DepositView: React.FC<DepositViewProps> = ({ setActiveTab, onOpenAuth }) => {
  const { userProfile, storeSettings } = useAuth();
  const { showToast } = useToast();

  const [amount, setAmount] = useState<string>('1000');
  const [senderName, setSenderName] = useState<string>('');
  const [step, setStep] = useState<'input' | 'payment'>('input');
  const [loading, setLoading] = useState<boolean>(false);
  const [submittedDeposit, setSubmittedDeposit] = useState<DepositTransaction | null>(null);

  const pendingQrisKey = `am_pending_qris_${userProfile?.uid || 'guest'}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(pendingQrisKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.step === 'payment' && parsed.amount && parsed.senderName) {
          setAmount(String(parsed.amount));
          setSenderName(String(parsed.senderName));
          setStep('payment');
        }
      }
    } catch {
      // Ignore storage parse error
    }
  }, [pendingQrisKey]);

  const clearPendingQris = () => {
    try {
      localStorage.removeItem(pendingQrisKey);
    } catch {
      // Ignore storage error
    }
  };

  const quickNominals = [500, 1000, 2000, 5000, 10000, 25000];
  const qrisImageUrl = '/qris.png';
  const qrisBackupUrl =
    'https://cdn.phototourl.com/member/2026-11-10-5a092aa1-5330-4068-a112-233f093bfe0b.png';

  const numericAmount = parseInt(amount, 10) || 0;
  const isDepositClosed = storeSettings !== null && storeSettings.depositOpen === false;

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) {
      onOpenAuth();
      return;
    }

    if (numericAmount < 500) {
      showToast('Minimal nominal deposit adalah 500.', 'error');
      return;
    }

    if (!senderName.trim()) {
      showToast('Masukkan nama pengirim rekening/e-wallet Anda.', 'error');
      return;
    }

    try {
      localStorage.setItem(
        pendingQrisKey,
        JSON.stringify({
          step: 'payment',
          amount: numericAmount.toString(),
          senderName: senderName.trim(),
          createdAt: new Date().toISOString()
        })
      );
    } catch {
      // Ignore storage error
    }

    setStep('payment');
  };

  const handleConfirmPaid = async () => {
    if (!userProfile) {
      onOpenAuth();
      return;
    }

    if (numericAmount < 500) {
      showToast('Minimal nominal deposit adalah 500.', 'error');
      return;
    }

    if (!senderName.trim()) {
      showToast('Masukkan nama pengirim rekening/e-wallet Anda.', 'error');
      return;
    }

    setLoading(true);
    const trimmedSender = senderName.trim();
    const normalizedEmail = (userProfile.email || `${userProfile.uid}@am-premium.local`).toLowerCase().trim();

    const finalizeSuccess = async (depositRecord: DepositTransaction) => {
      appendUserDepositCache(userProfile.uid, normalizedEmail, depositRecord);

      try {
        await setDoc(
          doc(db, 'deposits', depositRecord.id),
          sanitizeForFirestore(depositRecord),
          { merge: true }
        );
      } catch (fsErr) {
        console.warn('Firestore deposit sync warning:', fsErr);
      }

      clearPendingQris();
      setSubmittedDeposit(depositRecord);
      setStep('input');
      setAmount('1000');
      setSenderName('');
      showToast('Konfirmasi pembayaran telah dikirim ke Panel Admin untuk ditinjau.', 'success');
    };

    try {
      const res = await fetch('/api/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: userProfile.uid,
          userEmail: normalizedEmail,
          userName: userProfile.name,
          amount: numericAmount,
          senderName: trimmedSender,
          syncedBalance: userProfile.balance
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status >= 400 && res.status < 500 && res.status !== 404) {
          showToast(data.error || 'Gagal mengirim konfirmasi deposit.', 'error');
          return;
        }
        throw new Error(data.error || `Server error (${res.status})`);
      }

      const depositRecord: DepositTransaction = data.deposit || {
        id: 'DEP-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900),
        uid: userProfile.uid,
        userEmail: normalizedEmail,
        amount: numericAmount,
        senderName: trimmedSender,
        status: 'Menunggu Konfirmasi Admin',
        createdAt: new Date().toISOString()
      };

      await finalizeSuccess(depositRecord);
    } catch (err: any) {
      console.warn('API deposit fallback to Firestore/local cache:', err);
      if (isDepositClosed) {
        showToast('Layanan deposit sedang ditutup sementara oleh admin.', 'error');
        return;
      }

      const fallbackRecord: DepositTransaction = {
        id: 'DEP-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900),
        uid: userProfile.uid,
        userEmail: normalizedEmail,
        amount: numericAmount,
        senderName: trimmedSender,
        status: 'Menunggu Konfirmasi Admin',
        createdAt: new Date().toISOString()
      };

      await finalizeSuccess(fallbackRecord);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 md-card p-5 sm:p-6 rounded-3xl">
        <div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-300 font-semibold">
              Pembayaran QRIS
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400 font-medium">Minimal 500</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-white mt-2">
            Deposit Saldo Akun
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Isi saldo menggunakan QRIS (BCA, Mandiri, BRI, BNI, Dana, GoPay, OVO, ShopeePay, dll).
          </p>
        </div>

        {userProfile && (
          <div className="p-3.5 rounded-2xl md-blue-gradient border border-blue-300/25 text-right shrink-0">
            <div className="text-[11px] font-medium text-blue-100">Saldo Saat Ini</div>
            <div className="font-mono font-bold text-lg text-white tabular-nums">
              {userProfile.balance.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Deposit Service Closed Alert */}
      {isDepositClosed && (
        <div className="p-4 rounded-2xl bg-rose-500/12 border border-rose-400/25 text-rose-200 text-xs font-medium flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>Layanan deposit sedang ditutup sementara oleh admin. Silakan coba kembali nanti.</span>
        </div>
      )}

      {/* Recent Submitted Notice */}
      {step === 'input' && submittedDeposit && (
        <div className="p-4 rounded-2xl bg-blue-500/12 border border-blue-400/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 text-blue-300">
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-xs space-y-0.5">
              <div className="font-bold text-white">
                Konfirmasi Deposit Terkirim ({submittedDeposit.id})
              </div>
              <p className="text-slate-300 text-[11px]">
                Nominal <span className="font-mono font-bold text-white">{submittedDeposit.amount.toLocaleString()}</span> a.n.{' '}
                <span className="font-semibold text-white">{submittedDeposit.senderName}</span> menunggu persetujuan admin.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white font-semibold text-[11px] nb-btn cursor-pointer"
            >
              Cek Riwayat
            </button>
            <button
              type="button"
              onClick={() => setSubmittedDeposit(null)}
              className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-300 cursor-pointer"
              title="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: FORM INPUT */}
      {step === 'input' && (
        <div className="md-card rounded-3xl p-5 sm:p-6 space-y-6">
          <form onSubmit={handleProceedToPayment} className="space-y-5">
            {/* Nominal input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-200">
                  Nominal Deposit (Minimal 500)
                </label>
                <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-300 tabular-nums">
                  {numericAmount.toLocaleString()}
                </span>
              </div>

              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                  Rp
                </div>
                <input
                  type="number"
                  min="500"
                  step="100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="500"
                  className="w-full pl-11 pr-4 py-3 nb-input rounded-xl font-mono font-bold text-base"
                  required
                />
              </div>

              {/* Quick Nominal Chips */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
                {quickNominals.map((nom) => (
                  <button
                    key={nom}
                    type="button"
                    onClick={() => setAmount(nom.toString())}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer tabular-nums font-mono ${
                      numericAmount === nom
                        ? 'bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white border-blue-300/30 shadow-[0_6px_16px_-4px_rgba(37,99,235,0.6)]'
                        : 'bg-[#12141A] text-slate-300 border-white/10 hover:border-blue-400/30 hover:text-white'
                    }`}
                  >
                    +{nom.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Sender Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-2">
                Nama Pengirim (Sesuai Rekening / E-Wallet)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Contoh: Budi Santoso / Azryl"
                  className="w-full pl-11 pr-4 py-3 nb-input rounded-xl text-xs font-medium placeholder-slate-500"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Cantumkan nama pengirim asli agar admin dapat memverifikasi mutasi QRIS Anda dengan cepat.
              </p>
            </div>

            {/* Merchant Details Box */}
            <div className="p-4 rounded-2xl bg-[#12141A] border border-white/[0.08] space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Metode Pembayaran</span>
                <span className="font-semibold text-white">QRIS (Semua Bank & E-Wallet)</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Nama Merchant Resmi</span>
                <span className="font-semibold text-white">Toko Kelontong Zril Store</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Konversi Saldo</span>
                <span className="font-semibold text-emerald-400">1:1 (Sesuai Nominal Transfer)</span>
              </div>
            </div>

            {/* Submit Button */}
            {userProfile ? (
              <button
                type="submit"
                disabled={isDepositClosed || numericAmount < 500 || !senderName.trim()}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] text-white font-semibold text-xs nb-btn flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span>Lanjutkan ke Pembayaran QRIS</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white font-semibold text-xs nb-btn flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Masuk Akun untuk Deposit</span>
              </button>
            )}
          </form>
        </div>
      )}

      {/* STEP 2: SHOW QRIS & INSTRUCTIONS */}
      {step === 'payment' && (
        <div className="md-card rounded-3xl p-5 sm:p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div>
              <h2 className="text-base font-bold font-display text-white">
                Selesaikan Pembayaran QRIS
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Scan kode QRIS di bawah ini dengan aplikasi perbankan atau e-wallet Anda.
              </p>
            </div>
            <button
              onClick={() => {
                clearPendingQris();
                setStep('input');
              }}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 cursor-pointer"
            >
              Ubah Nominal
            </button>
          </div>

          {/* Deposit Summary Card */}
          <div className="p-4 rounded-2xl bg-[#12141A] border border-white/[0.08] grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 text-[11px]">Total Transfer</span>
              <div className="text-lg font-bold font-mono text-sky-300 tabular-nums">
                Rp {numericAmount.toLocaleString('id-ID')}
              </div>
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">Nama Pengirim</span>
              <div className="font-semibold text-white truncate">{senderName}</div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-slate-400 text-[11px]">Nama Merchant</span>
              <div className="font-semibold text-emerald-400 truncate">Toko Kelontong Zril Store</div>
            </div>
          </div>

          {/* QRIS Display Container */}
          <div className="flex flex-col items-center justify-center p-6 bg-[#12141A] rounded-2xl border border-white/[0.08]">
            <div className="max-w-[260px] w-full rounded-2xl overflow-hidden bg-white p-3 shadow-[0_14px_34px_rgba(0,0,0,0.65)]">
              <img
                src={qrisImageUrl}
                alt="QRIS Toko Kelontong Zril Store"
                className="w-full h-auto object-contain rounded-xl"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = qrisBackupUrl;
                }}
              />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <a
                href={qrisImageUrl}
                download="QRIS_AM_PREMIUM_ZrilStore.png"
                className="px-4 py-2 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/15 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Simpan Gambar QRIS</span>
              </a>
            </div>
          </div>

          {/* Mandatory Instruction Note */}
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-400/25 text-slate-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-300">
              <Info className="w-4 h-4 shrink-0" />
              <span>Instruksi Pembayaran Penting</span>
            </div>
            <p className="leading-relaxed text-[11px] text-slate-300">
              "Silakan transfer terlebih dahulu sesuai nominal yang dimasukkan. Setelah pembayaran selesai, tekan tombol Sudah Bayar untuk mengirim konfirmasi kepada admin."
            </p>
            <div className="text-[11px] text-slate-400 pt-1.5 border-t border-white/10">
              Saldo akan otomatis bertambah setelah admin memverifikasi mutasi pembayaran Anda.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                clearPendingQris();
                setStep('input');
              }}
              className="py-3 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 text-slate-200 font-semibold text-xs cursor-pointer transition-colors"
            >
              Kembali
            </button>

            <button
              type="button"
              onClick={handleConfirmPaid}
              disabled={loading}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] hover:from-[#1D4ED8] hover:to-[#0284C7] text-white font-bold text-xs nb-btn flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Mengirim Konfirmasi...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sudah Bayar</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
