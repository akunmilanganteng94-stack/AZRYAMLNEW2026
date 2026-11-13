import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from './Toast.tsx';
import { DepositTransaction } from '../types/index.ts';
import { db, doc, setDoc } from '../lib/firebase.ts';
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

  const quickNominals = [500, 1000, 2000, 5000, 10000, 25000];
  const qrisImageUrl = '/qris.png';
  const qrisBackupUrl =
    'https://cdn.phototourl.com/member/2026-11-10-5a092aa1-5330-4068-a112-233f093bfe0b.png';

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

      try {
        await setDoc(doc(db, 'deposits', depositRecord.id), depositRecord, { merge: true });
      } catch (fsErr) {
        console.warn('Firestore deposit sync warning:', fsErr);
      }

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border-2 border-slate-950 shadow-[4px_4px_0px_0px_#020617]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#FFE600] border border-slate-950 text-slate-950 uppercase tracking-widest">
              PEMBAYARAN QRIS
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#E0F2FE] border border-slate-950 text-slate-950">
              Min. 500
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-display text-slate-950 mt-1.5">
            Deposit Saldo Akun
          </h1>
          <p className="text-xs font-medium text-slate-600 mt-0.5">
            Isi saldo menggunakan QRIS (BCA, Mandiri, BRI, BNI, Dana, GoPay, OVO, ShopeePay, dll).
          </p>
        </div>

        {userProfile && (
          <div className="p-3 rounded-xl bg-[#FFE600] border-2 border-slate-950 shadow-[3px_3px_0px_0px_#020617] text-right shrink-0">
            <div className="text-[10px] font-extrabold uppercase text-slate-800">Saldo Saat Ini</div>
            <div className="font-mono font-black text-lg text-slate-950 tabular-nums">
              {userProfile.balance.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Deposit Service Closed Alert */}
      {!storeSettings?.depositOpen && (
        <div className="p-4 rounded-2xl bg-[#FFE4E6] border-2 border-slate-950 shadow-[3px_3px_0px_0px_#020617] text-slate-950 text-xs font-bold flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0" />
          <span>Layanan deposit sedang ditutup sementara oleh admin. Silakan coba kembali nanti.</span>
        </div>
      )}

      {/* Recent Submitted Notice (on initial screen, no QR shown) */}
      {step === 'input' && submittedDeposit && (
        <div className="p-4 rounded-2xl bg-[#FEF9C3] border-2 border-slate-950 shadow-[4px_4px_0px_0px_#020617] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FFE600] border-2 border-slate-950 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-slate-950" />
            </div>
            <div className="text-xs space-y-0.5">
              <div className="font-black text-slate-950">
                Konfirmasi Deposit Terkirim ke Admin ({submittedDeposit.id})
              </div>
              <p className="text-slate-800 text-[11px] font-semibold">
                Nominal <span className="font-mono font-black">{submittedDeposit.amount.toLocaleString()}</span> a.n.{' '}
                <span className="font-black">{submittedDeposit.senderName}</span> sedang menunggu konfirmasi/persetujuan admin.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className="px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-[11px] nb-btn cursor-pointer"
            >
              Cek Riwayat
            </button>
            <button
              type="button"
              onClick={() => setSubmittedDeposit(null)}
              className="p-1.5 rounded-xl bg-white hover:bg-[#FFE4E6] border-2 border-slate-950 text-slate-950 cursor-pointer"
              title="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: FORM INPUT */}
      {step === 'input' && (
        <div className="bg-white border-2 border-slate-950 rounded-2xl p-6 shadow-[5px_5px_0px_0px_#020617] space-y-6">
          <form onSubmit={handleProceedToPayment} className="space-y-5">
            {/* Nominal input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-950">
                  Nominal Deposit (Minimal 500)
                </label>
                <span className="text-xs font-black font-mono px-2 py-0.5 rounded bg-[#E0F2FE] border border-slate-950 text-slate-950 tabular-nums">
                  {numericAmount.toLocaleString()}
                </span>
              </div>

              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-black text-slate-700 text-xs">
                  Rp
                </div>
                <input
                  type="number"
                  min="500"
                  step="100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="500"
                  className="w-full pl-11 pr-4 py-3 nb-input rounded-xl font-mono font-black text-base"
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
                    className={`py-2 px-2 rounded-xl text-xs font-black border-2 border-slate-950 transition-all cursor-pointer tabular-nums font-mono ${
                      numericAmount === nom
                        ? 'bg-[#FFE600] text-slate-950 shadow-[2px_2px_0px_0px_#020617]'
                        : 'bg-[#F4F3EE] text-slate-800 hover:bg-white'
                    }`}
                  >
                    +{nom.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Sender Name */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-950 mb-2">
                Nama Pengirim (Sesuai Rekening / E-Wallet)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-600 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Contoh: Budi Santoso / Azryl"
                  className="w-full pl-11 pr-4 py-3 nb-input rounded-xl text-xs font-bold placeholder-slate-400"
                  required
                />
              </div>
              <p className="text-[11px] font-medium text-slate-600 mt-1.5">
                Wajib mencantumkan nama pengirim asli agar admin dapat memverifikasi mutasi bank/QRIS Anda dengan cepat.
              </p>
            </div>

            {/* Merchant Details Box */}
            <div className="p-4 rounded-2xl bg-[#E0F2FE] border-2 border-slate-950 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-800 font-bold">
                <span>Metode Pembayaran:</span>
                <span className="font-black text-slate-950">QRIS (Semua Bank & E-Wallet)</span>
              </div>
              <div className="flex items-center justify-between text-slate-800 font-bold">
                <span>Nama Merchant Resmi:</span>
                <span className="font-black text-slate-950">Toko Kelontong Zril Store</span>
              </div>
              <div className="flex items-center justify-between text-slate-800 font-bold">
                <span>Konversi Saldo:</span>
                <span className="font-black text-[#16A34A]">1:1 (Sesuai Nominal Transfer)</span>
              </div>
            </div>

            {/* Submit Button */}
            {userProfile ? (
              <button
                type="submit"
                disabled={!storeSettings?.depositOpen || numericAmount < 500 || !senderName.trim()}
                className="w-full py-3.5 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs nb-btn flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span>Lanjutkan ke Pembayaran QRIS</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="w-full py-3.5 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs nb-btn flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Masuk Akun untuk Deposit</span>
              </button>
            )}
          </form>
        </div>
      )}

      {/* STEP 2: SHOW QRIS & INSTRUCTIONS */}
      {step === 'payment' && (
        <div className="bg-white border-2 border-slate-950 rounded-2xl p-6 shadow-[5px_5px_0px_0px_#020617] space-y-6">
          <div className="flex items-center justify-between border-b-2 border-slate-950 pb-4">
            <div>
              <h2 className="text-base font-black font-display text-slate-950">
                Selesaikan Pembayaran QRIS
              </h2>
              <p className="text-xs font-medium text-slate-600 mt-0.5">
                Scan kode QRIS di bawah ini dengan aplikasi perbankan atau e-wallet Anda.
              </p>
            </div>
            <button
              onClick={() => setStep('input')}
              className="text-xs font-extrabold text-[#2563EB] hover:underline cursor-pointer"
            >
              Ubah Nominal
            </button>
          </div>

          {/* Deposit Summary Card */}
          <div className="p-4 rounded-2xl bg-[#F4F3EE] border-2 border-slate-950 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-600 font-bold text-[11px]">Total Transfer:</span>
              <div className="text-lg font-black font-mono text-[#2563EB] tabular-nums">
                Rp {numericAmount.toLocaleString('id-ID')}
              </div>
            </div>
            <div>
              <span className="text-slate-600 font-bold text-[11px]">Nama Pengirim:</span>
              <div className="font-black text-slate-950 truncate">{senderName}</div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-slate-600 font-bold text-[11px]">Nama Merchant:</span>
              <div className="font-black text-[#16A34A] truncate">Toko Kelontong Zril Store</div>
            </div>
          </div>

          {/* QRIS Display Container */}
          <div className="flex flex-col items-center justify-center p-6 bg-[#FFFDF5] rounded-2xl border-2 border-slate-950">
            <div className="max-w-[280px] w-full rounded-2xl overflow-hidden bg-white p-3 border-2 border-slate-950 shadow-[4px_4px_0px_0px_#020617]">
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
                className="px-4 py-2 rounded-xl bg-white hover:bg-[#FFE600] text-slate-950 font-extrabold text-xs nb-btn flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Simpan Gambar QRIS</span>
              </a>
            </div>
          </div>

          {/* Mandatory Instruction Note */}
          <div className="p-4 rounded-2xl bg-[#FEF9C3] border-2 border-slate-950 text-slate-950 text-xs space-y-2">
            <div className="flex items-center gap-2 font-black">
              <Info className="w-4 h-4 shrink-0" />
              <span>Instruksi Pembayaran Penting:</span>
            </div>
            <p className="leading-relaxed text-[11px] font-bold">
              "Silakan transfer terlebih dahulu sesuai nominal yang dimasukkan. Setelah pembayaran selesai, tekan tombol Sudah Bayar untuk mengirim konfirmasi kepada admin."
            </p>
            <div className="text-[10px] font-bold text-slate-700 pt-1.5 border-t-2 border-slate-950/20">
              *Catatan Keamanan: Saldo tidak bertambah secara otomatis saat tombol ditekan. Saldo akan otomatis bertambah setelah admin memverifikasi pembayaran Anda secara manual.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep('input')}
              className="py-3 px-4 rounded-xl bg-white hover:bg-[#F4F3EE] text-slate-950 font-extrabold text-xs nb-btn cursor-pointer"
            >
              Kembali
            </button>

            <button
              type="button"
              onClick={handleConfirmPaid}
              disabled={loading}
              className="py-3 px-4 rounded-xl bg-[#4ADE80] hover:bg-[#22C55E] text-slate-950 font-black text-xs nb-btn flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
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
