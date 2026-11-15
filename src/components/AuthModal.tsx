import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from './Toast.tsx';
import { X, Mail, Lock, User, ArrowRight, CheckCircle2, KeyRound } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  resetOobCode?: string | null;
  onClearResetCode?: () => void;
}

const AM_LOGO_URL = 'https://cdn.corenexis.com/f/eJVaVCyH.png';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  resetOobCode,
  onClearResetCode
}) => {
  const {
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    resetPassword,
    verifyResetCode,
    confirmResetPassword
  } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'confirmReset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSentEmail, setResetSentEmail] = useState<string | null>(null);
  const [resetTargetEmail, setResetTargetEmail] = useState<string | null>(null);
  const [verifyingCode, setVerifyingCode] = useState(false);

  useEffect(() => {
    if (resetOobCode && isOpen) {
      setMode('confirmReset');
      setVerifyingCode(true);
      verifyResetCode(resetOobCode)
        .then((targetEmail) => {
          setResetTargetEmail(targetEmail);
        })
        .catch((err: any) => {
          showToast(err.message || 'Link reset sandi tidak valid atau kedaluwarsa.', 'error');
          setMode('forgot');
          onClearResetCode?.();
        })
        .finally(() => {
          setVerifyingCode(false);
        });
    }
  }, [resetOobCode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'confirmReset') {
      if (!resetOobCode) return;
      if (!password || password.length < 6) {
        showToast('Kata sandi baru minimal 6 karakter.', 'error');
        return;
      }
      if (password !== confirmPassword) {
        showToast('Konfirmasi kata sandi baru tidak cocok.', 'error');
        return;
      }

      setLoading(true);
      try {
        await confirmResetPassword(resetOobCode, password);
        showToast('Kata sandi berhasil diubah di Firebase! Silakan login dengan sandi baru.', 'success');
        if (resetTargetEmail) setEmail(resetTargetEmail);
        setPassword('');
        setConfirmPassword('');
        onClearResetCode?.();
        setMode('login');
      } catch (err: any) {
        showToast(err.message || 'Gagal mengubah kata sandi.', 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email) {
      showToast('Masukkan alamat email Anda.', 'error');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        if (!password) {
          showToast('Masukkan password akun Anda.', 'error');
          setLoading(false);
          return;
        }
        await loginWithEmail(email, password);
        showToast('Berhasil masuk ke akun!', 'success');
        onClose();
      } else if (mode === 'register') {
        if (!password || password.length < 6) {
          showToast('Password minimal 6 karakter.', 'error');
          setLoading(false);
          return;
        }
        await registerWithEmail(email, password, name);
        showToast('Registrasi berhasil! Selamat datang di AM PREMIUM AZRYL.', 'success');
        onClose();
      } else if (mode === 'forgot') {
        await resetPassword(email);
        setResetSentEmail(email.trim());
        showToast(`Link reset sandi resmi dari Firebase dikirim ke ${email.trim()}. Cek Inbox / Spam Gmail Anda!`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Terjadi kesalahan autentikasi.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      showToast('Berhasil login dengan akun Google!', 'success');
      onClose();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Gagal login via Google.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-[#1C1E24] border border-white/12 rounded-2xl p-6 shadow-[0_24px_60px_rgba(0,0,0,0.85),0_0_40px_-14px_rgba(37,99,235,0.4)] relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Blue Ambient Glow */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-48 h-48 rounded-full bg-blue-600/20 blur-3xl" />

        {/* Close Button */}
        <button
          onClick={() => {
            setResetSentEmail(null);
            onClearResetCode?.();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 text-slate-300 hover:text-white rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6 relative">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1D4ED8] to-[#0EA5E9] border border-blue-300/30 p-2 shadow-[0_10px_24px_-6px_rgba(37,99,235,0.65)] mb-3">
            <img
              src={AM_LOGO_URL}
              alt="AM PREMIUM AZRYL"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/am-logo.png';
              }}
            />
          </div>
          <h2 className="text-xl font-bold font-display text-white">
            {mode === 'login' && 'Masuk ke AM PREMIUM AZRYL'}
            {mode === 'register' && 'Buat Akun Baru'}
            {mode === 'forgot' && 'Reset Kata Sandi'}
            {mode === 'confirmReset' && 'Buat Kata Sandi Baru'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login' && 'Akses saldo dan transaksi layanan Alight Motion'}
            {mode === 'register' && 'Daftar sekarang untuk mulai berbelanja'}
            {mode === 'forgot' && 'Link reset sandi resmi akan dikirim oleh Firebase Auth ke Gmail Anda'}
            {mode === 'confirmReset' &&
              (resetTargetEmail
                ? `Atur ulang kata sandi untuk akun ${resetTargetEmail}`
                : 'Memverifikasi kode reset sandi Firebase...')}
          </p>
        </div>

        {/* Success banner when Firebase reset link sent */}
        {mode === 'forgot' && resetSentEmail && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/12 border border-emerald-400/25 text-xs text-emerald-100 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-emerald-200">Link Reset Terkirim dari Firebase!</div>
              <p className="text-[11px] leading-relaxed text-emerald-100/80">
                Email berisi link ubah sandi telah dikirim ke{' '}
                <span className="font-mono font-semibold text-white underline">{resetSentEmail}</span>. Cek kotak masuk atau folder Spam, klik linknya, lalu masukkan kata sandi baru Anda.
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        {mode === 'confirmReset' && verifyingCode ? (
          <div className="py-8 text-center space-y-2">
            <span className="inline-block w-6 h-6 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            <p className="text-xs font-medium text-slate-300">Memvalidasi tautan reset dari Firebase...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 relative">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Azryl"
                    className="w-full pl-10 pr-4 py-2.5 nb-input rounded-xl text-xs font-medium placeholder-slate-500"
                    required
                  />
                </div>
              </div>
            )}

            {mode !== 'confirmReset' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 nb-input rounded-xl text-xs font-medium placeholder-slate-500"
                    required
                  />
                </div>
              </div>
            )}

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {mode === 'confirmReset' ? 'Kata Sandi Baru' : 'Password'}
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setResetSentEmail(null);
                        setMode('forgot');
                      }}
                      className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 cursor-pointer"
                    >
                      Lupa password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-10 pr-4 py-2.5 nb-input rounded-xl text-xs font-medium placeholder-slate-500"
                    required
                  />
                </div>
              </div>
            )}

            {mode === 'confirmReset' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Konfirmasi Kata Sandi Baru
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full pl-10 pr-4 py-2.5 nb-input rounded-xl text-xs font-medium placeholder-slate-500"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] text-white font-semibold text-xs nb-btn flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'login' && 'Masuk Akun'}
                    {mode === 'register' && 'Daftar Sekarang'}
                    {mode === 'forgot' && (resetSentEmail ? 'Kirim Ulang Link Reset' : 'Kirim Link Reset Firebase')}
                    {mode === 'confirmReset' && 'Simpan Kata Sandi Baru'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {mode !== 'confirmReset' && (
          <>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[11px] text-slate-400 font-medium">atau masuk dengan</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 text-slate-100 text-xs font-semibold transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Lanjutkan dengan Google</span>
            </button>
          </>
        )}

        <div className="mt-5 text-center text-xs text-slate-400">
          {mode === 'login' ? (
            <p>
              Belum punya akun?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-blue-400 font-semibold hover:text-blue-300 cursor-pointer"
              >
                Daftar sekarang
              </button>
            </p>
          ) : (
            <p>
              Sudah punya akun?{' '}
              <button
                type="button"
                onClick={() => {
                  setResetSentEmail(null);
                  onClearResetCode?.();
                  setMode('login');
                }}
                className="text-blue-400 font-semibold hover:text-blue-300 cursor-pointer"
              >
                Kembali ke login
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
