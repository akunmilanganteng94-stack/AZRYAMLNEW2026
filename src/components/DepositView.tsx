import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from './Toast.tsx';
import { DepositTransaction } from '../types/index.ts';
import { db, doc, setDoc } from '../lib/firebase.ts';
import { 
  Wallet, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Download, 
  ExternalLink,
  ShieldCheck,
  User,
  Info,
  Sparkles,
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

  const quickNominals = [500, 1000, 2000, 5000, 10000, 25000];
  const qrisImageUrl = '/qris.png';
  const qrisBackupUrl = 'https://cdn.phototourl.com/member/2026-11-10-5a092aa1-5330-4068-a112-233f093bfe0b.png';

  const numericAmount = parseInt(amount, 10) || 0;

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

    setStep('payment');
  };

  const handleConfirmPaid = async () => {
    if (!userProfile) {
      onOpenAuth();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: userProfile.uid,
          userEmail: userProfile.email,
          userName: userProfile.name,
          amount: numericAmount,
          senderName: senderName.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Gagal mengirim konfirmasi deposit.', 'error');
        setLoading(false);
        return;
      }

      const depositRecord: DepositTransaction = data.deposit;

      // Sinkronkan ke Firestore secara real-time agar langsung tampil di Panel Admin
      try {
        await setDoc(doc(db, 'deposits', depositRecord.id), depositRecord, { merge: true });
      } catch (fsErr) {
        console.warn('Firestore deposit sync warning:', fsErr);
      }

      // Hilangkan QRIS dan kembalikan tampilan langsung ke formulir semula
      setSubmittedDeposit(depositRecord);
      setStep('input');
      setAmount('1000');
      setSenderName('');
      showToast('Konfirmasi pembayaran telah dikirim ke Panel Admin untuk ditinjau.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-slate-950/40 p-4 sm:p-5 rounded-3xl border border-blue-500/15">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              Pembayaran Instan QRIS
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-cyan-300 border border-blue-500/20">
              Min. 500
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-white mt-0.5">
            Deposit Saldo Akun
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Isi saldo menggunakan QRIS (BCA, Mandiri, BRI, BNI, Dana, GoPay, OVO, ShopeePay, dll).
          </p>
        </div>

        {userProfile && (
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-blue-500/20 text-right">
            <div className="text-[10px] text-slate-400">Saldo Saat Ini</div>
            <div className="font-display font-extrabold text-lg text-cyan-300">
              {userProfile.balance.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Deposit Service Closed Alert */}
      {!storeSettings?.depositOpen && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>Layanan deposit sedang ditutup sementara oleh admin. Silakan coba kembali nanti.</span>
        </div>
      )}

      {/* Recent Submitted Notice (on initial screen, no QR shown) */}
      {step === 'input' && submittedDeposit && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="text-xs space-y-0.5">
              <div className="font-bold text-amber-300">
                Konfirmasi Deposit Terkirim ke Admin ({submittedDeposit.id})
              </div>
              <p className="text-slate-300 text-[11px]">
                Nominal <span className="font-bold text-white">{submittedDeposit.amount.toLocaleString()}</span> a.n. <span className="font-semibold text-white">{submittedDeposit.senderName}</span> sedang menunggu konfirmasi/persetujuan admin.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] transition-all"
            >
              Cek Riwayat
            </button>
            <button
              type="button"
              onClick={() => setSubmittedDeposit(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              title="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: FORM INPUT */}
      {step === 'input' && (
        <div className="bg-[#080d1e] border border-blue-500/20 rounded-3xl p-6 shadow-xl space-y-6">
          <form onSubmit={handleProceedToPayment} className="space-y-5">
            {/* Nominal input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-200">
                  Nominal Deposit (Minimal 500)
                </label>
                <span className="text-xs font-extrabold font-display text-cyan-400">
                  {numericAmount.toLocaleString()}
                </span>
              </div>

              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 font-display font-bold text-slate-400 text-xs">
                  Rp
                </div>
                <input
                  type="number"
                  min="500"
                  step="100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="500"
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/90 border border-slate-800 focus:border-cyan-500 rounded-2xl text-white font-display font-bold text-base focus:outline-none transition-all"
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
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                      numericAmount === nom
                        ? 'bg-blue-600 text-white border border-cyan-400 shadow-md shadow-blue-600/30'
                        : 'bg-slate-900/60 text-slate-300 border border-slate-800 hover:text-white hover:border-slate-700'
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
                <User className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Contoh: Budi Santoso / Azryl"
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/90 border border-slate-800 focus:border-cyan-500 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Wajib mencantumkan nama pengirim asli agar admin dapat memverifikasi mutasi bank/QRIS Anda dengan cepat.
              </p>
            </div>

            {/* Merchant Details Box */}
            <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/20 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Metode Pembayaran:</span>
                <span className="font-semibold text-cyan-300">QRIS (Semua Bank & E-Wallet)</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Nama Merchant Resmi:</span>
                <span className="font-semibold text-white">Toko Kelontong Zril Store</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Konversi Saldo:</span>
                <span className="font-semibold text-emerald-400">1:1 (Sesuai Nominal Transfer)</span>
              </div>
            </div>

            {/* Submit Button */}
            {userProfile ? (
              <button
                type="submit"
                disabled={!storeSettings?.depositOpen || numericAmount < 500 || !senderName.trim()}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.98]"
              >
                <span>Lanjutkan ke Pembayaran QRIS</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all"
              >
                <span>Masuk Akun untuk Deposit</span>
              </button>
            )}
          </form>
        </div>
      )}

      {/* STEP 2: SHOW QRIS & INSTRUCTIONS */}
      {step === 'payment' && (
        <div className="bg-[#080d1e] border border-blue-500/20 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold font-display text-white">
                Selesaikan Pembayaran QRIS
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Scan kode QRIS di bawah ini dengan aplikasi perbankan atau e-wallet Anda.
              </p>
            </div>
            <button
              onClick={() => setStep('input')}
              className="text-xs text-cyan-400 hover:underline"
            >
              Ubah Nominal
            </button>
          </div>

          {/* Deposit Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 text-[11px]">Total Transfer:</span>
              <div className="text-lg font-extrabold font-display text-cyan-400">
                Rp {numericAmount.toLocaleString('id-ID')}
              </div>
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">Nama Pengirim:</span>
              <div className="font-semibold text-white truncate">{senderName}</div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-slate-400 text-[11px]">Nama Merchant:</span>
              <div className="font-semibold text-emerald-400 truncate">Toko Kelontong Zril Store</div>
            </div>
          </div>

          {/* QRIS Display Container */}
          <div className="flex flex-col items-center justify-center p-6 bg-slate-950 rounded-2xl border border-blue-500/20 shadow-inner">
            <div className="max-w-[280px] w-full rounded-2xl overflow-hidden bg-white p-3 shadow-2xl relative">
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
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs text-slate-200 flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Simpan Gambar QRIS</span>
              </a>
            </div>
          </div>

          {/* Mandatory Instruction Note */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <Info className="w-4 h-4 shrink-0" />
              <span>Instruksi Pembayaran Penting:</span>
            </div>
            <p className="leading-relaxed text-[11px] text-amber-100/90 font-medium">
              "Silakan transfer terlebih dahulu sesuai nominal yang dimasukkan. Setelah pembayaran selesai, tekan tombol Sudah Bayar untuk mengirim konfirmasi kepada admin."
            </p>
            <div className="text-[10px] text-amber-300/80 pt-1 border-t border-amber-500/20">
              *Catatan Keamanan: Saldo tidak bertambah secara otomatis saat tombol ditekan. Saldo akan otomatis bertambah setelah admin memverifikasi pembayaran Anda secara manual.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep('input')}
              className="py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-xs transition-all"
            >
              Kembali
            </button>

            <button
              type="button"
              onClick={handleConfirmPaid}
              disabled={loading}
              className="py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
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
