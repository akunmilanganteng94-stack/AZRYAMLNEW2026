import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from './Toast.tsx';
import {
  User,
  Mail,
  Key,
  Calendar,
  Wallet,
  ShieldCheck,
  LogOut,
  Edit3,
  Check,
  Copy,
  ExternalLink,
  Lock,
  Send
} from 'lucide-react';

interface AccountViewProps {
  onOpenAuth: () => void;
  setActiveTab: (tab: string) => void;
}

export const AccountView: React.FC<AccountViewProps> = ({ onOpenAuth, setActiveTab }) => {
  const {
    userProfile,
    currentUser,
    logout,
    updateDisplayName,
    resetPassword,
    changePassword
  } = useAuth();
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(userProfile?.name || '');
  const [saving, setSaving] = useState(false);
  const [sendingResetLink, setSendingResetLink] = useState(false);
  const [resetLinkSent, setResetLinkSent] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (userProfile?.name && !isEditing) {
      setName(userProfile.name);
    }
  }, [userProfile?.name, isEditing]);

  if (!userProfile) {
    return (
      <div className="max-w-md mx-auto text-center py-14 px-6 md-card rounded-3xl space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#0EA5E9] border border-blue-300/25 flex items-center justify-center text-white shadow-[0_10px_24px_-6px_rgba(37,99,235,0.6)]">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-display text-white">Akun Saya</h2>
        <p className="text-xs text-slate-400">
          Masuk ke akun Anda untuk mengelola profil, melihat saldo, dan riwayat transaksi.
        </p>
        <button
          onClick={onOpenAuth}
          className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white font-semibold text-xs nb-btn cursor-pointer"
        >
          Masuk / Daftar
        </button>
      </div>
    );
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    showToast(`${label} disalin ke clipboard!`, 'info');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('Nama tampilan tidak boleh kosong.', 'error');
      return;
    }

    setSaving(true);
    try {
      await updateDisplayName(trimmed);
      setIsEditing(false);
      showToast('Nama profil berhasil diperbarui & tersinkronisasi!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Gagal memperbarui nama profil.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const formattedDate = userProfile.createdAt
    ? new Date(userProfile.createdAt).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Hari ini';

  const hasPasswordProvider = Boolean(
    currentUser?.providerData?.some((p) => p.providerId === 'password')
  );

  const handleSendResetLink = async () => {
    setSendingResetLink(true);
    try {
      await resetPassword(userProfile.email);
      setResetLinkSent(true);
      showToast(
        `Link reset sandi resmi dari Firebase telah dikirim ke ${userProfile.email}. Cek Inbox / Spam Gmail Anda!`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Gagal mengirim link reset sandi Firebase.', 'error');
    } finally {
      setSendingResetLink(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast('Masukkan kata sandi lama Anda.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Kata sandi baru minimal 6 karakter.', 'error');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast('Konfirmasi kata sandi baru tidak cocok.', 'error');
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      showToast('Kata sandi akun Firebase Anda berhasil diubah!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal mengubah kata sandi.', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Hero Blue Gradient Card */}
      <div className="md-blue-gradient border border-blue-300/25 rounded-3xl p-6 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-sky-300/20 blur-3xl" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative">
          {/* Avatar */}
          <div className="relative">
            {userProfile.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt={userProfile.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30 shadow-[0_10px_25px_rgba(0,0,0,0.35)] bg-[#101114]"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-md border-2 border-white/30 shadow-[0_10px_25px_rgba(0,0,0,0.35)] flex items-center justify-center font-display font-bold text-2xl text-white">
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-1.5 -right-1.5 px-2 py-0.5 rounded-full bg-emerald-400 text-[#052E16] font-bold text-[10px] uppercase tracking-wider shadow">
              {userProfile.status}
            </span>
          </div>

          {/* User Information */}
          <div className="flex-1 text-center sm:text-left space-y-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
              <div className="min-w-0">
                <h1 className="text-xl font-bold font-display text-white truncate">
                  {userProfile.name}
                </h1>
                <p className="text-xs text-blue-100/85 font-mono truncate">{userProfile.email}</p>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-1.5 shrink-0">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 bg-white/15 border border-white/25 text-white backdrop-blur-sm">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{userProfile.role === 'admin' ? 'Administrator' : 'Member'}</span>
                </span>
              </div>
            </div>

            <div className="pt-3 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-blue-50">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-200" />
                <span>Bergabung: {formattedDate}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-sky-200" />
                <span>
                  Saldo:{' '}
                  <strong className="font-mono font-bold tabular-nums text-white">
                    {userProfile.balance.toLocaleString()}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Details & Name Editing */}
      <div className="md-card rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <h2 className="text-sm font-bold font-display text-white">
            Detail Akun & Profil
          </h2>
          <button
            onClick={() => {
              setName(userProfile.name);
              setIsEditing(!isEditing);
            }}
            className="px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-400/25 text-xs font-semibold text-blue-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Batal' : 'Ubah Nama'}</span>
          </button>
        </div>

        {/* Edit Name Form */}
        {isEditing && (
          <form
            onSubmit={handleUpdateProfile}
            className="p-4 rounded-2xl bg-[#12141A] border border-blue-400/25 space-y-3"
          >
            <label className="block text-xs font-semibold text-slate-200">
              Ubah Nama Tampilan (Sinkron Desktop & Mobile)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama tampilan baru"
                className="flex-1 px-3.5 py-2.5 nb-input rounded-xl text-xs font-medium"
                required
              />
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2.5 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white rounded-xl text-xs font-semibold nb-btn flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{saving ? 'Menyimpan...' : 'Simpan Nama'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Info Rows */}
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#12141A] border border-white/[0.06]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-400/20 flex items-center justify-center text-blue-300 shrink-0">
                <Key className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-slate-400 block">UID Pengguna</span>
                <span className="font-mono font-semibold text-slate-100 break-all">{userProfile.uid}</span>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(userProfile.uid, 'UID')}
              className="p-2 text-slate-300 hover:text-white rounded-xl bg-white/[0.05] hover:bg-blue-500/20 border border-white/10 shrink-0 ml-2 transition-colors cursor-pointer"
              title="Salin UID"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#12141A] border border-white/[0.06]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-400/20 flex items-center justify-center text-blue-300 shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-slate-400 block">Alamat Email</span>
                <span className="font-mono font-semibold text-slate-100 break-all">{userProfile.email}</span>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(userProfile.email, 'Email')}
              className="p-2 text-slate-300 hover:text-white rounded-xl bg-white/[0.05] hover:bg-blue-500/20 border border-white/10 shrink-0 ml-2 transition-colors cursor-pointer"
              title="Salin Email"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Admin Shortcut if role is admin */}
        {userProfile.role === 'admin' && (
          <div className="mt-4 p-4 rounded-2xl bg-blue-500/12 border border-blue-400/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-white block">Akses Panel Administrator</span>
              <span className="text-[11px] text-slate-300">
                Kelola deposit, pengguna, produk, dan konfigurasi API server.
              </span>
            </div>
            <button
              onClick={() => setActiveTab('admin')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white font-semibold text-xs nb-btn flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <span>Buka Admin</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setActiveTab('deposit')}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white font-semibold text-xs nb-btn cursor-pointer"
          >
            Deposit Saldo (QRIS)
          </button>

          <button
            onClick={() => logout()}
            className="py-2.5 px-4 rounded-xl bg-rose-500/12 hover:bg-rose-500/22 text-rose-300 border border-rose-500/25 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </div>

      {/* Keamanan & Reset Kata Sandi Firebase */}
      <div className="md-card rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div>
            <h2 className="text-sm font-bold font-display text-white">
              Keamanan & Kata Sandi
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Kirim tautan reset sandi resmi dari Firebase ke Gmail atau ubah sandi langsung.
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-400/25 flex items-center justify-center shrink-0 text-blue-300">
            <Lock className="w-4 h-4" />
          </div>
        </div>

        {/* Send Firebase Reset Link */}
        <div className="p-4 rounded-2xl bg-[#12141A] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <span className="text-xs font-semibold text-white block">Reset Sandi via Email Firebase</span>
            <span className="text-[11px] text-slate-400 block truncate">
              Kirim tautan ubah sandi ke <span className="font-mono text-blue-300">{userProfile.email}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={handleSendResetLink}
            disabled={sendingResetLink}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white font-semibold text-xs nb-btn flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sendingResetLink ? 'Mengirim...' : 'Kirim Link Reset'}</span>
          </button>
        </div>

        {resetLinkSent && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/12 border border-emerald-400/25 text-[11px] text-emerald-100">
            Link reset resmi Firebase sudah dikirim ke <strong>{userProfile.email}</strong>. Silakan cek kotak masuk atau folder Spam Gmail Anda.
          </div>
        )}

        {/* Direct Password Change Form */}
        {hasPasswordProvider && (
          <form
            onSubmit={handleChangePassword}
            className="p-4 rounded-2xl bg-[#12141A] border border-white/[0.06] space-y-3"
          >
            <div className="text-xs font-semibold text-white">Ubah Kata Sandi Langsung</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Sandi lama"
                className="px-3 py-2 nb-input rounded-xl text-xs font-medium placeholder-slate-500"
                required
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Sandi baru (min 6)"
                className="px-3 py-2 nb-input rounded-xl text-xs font-medium placeholder-slate-500"
                required
              />
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Ulangi sandi baru"
                className="px-3 py-2 nb-input rounded-xl text-xs font-medium placeholder-slate-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={changingPassword}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white font-semibold text-xs nb-btn disabled:opacity-50 cursor-pointer"
            >
              {changingPassword ? 'Menyimpan...' : 'Ubah Kata Sandi'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
