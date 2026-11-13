import React, { useState } from 'react';
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
  const { userProfile, currentUser, logout, refreshUserProfile, resetPassword, changePassword } = useAuth();
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

  if (!userProfile) {
    return (
      <div className="max-w-md mx-auto text-center py-14 px-6 bg-white border-2 border-slate-950 rounded-2xl shadow-[5px_5px_0px_0px_#020617] space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FFE600] border-2 border-slate-950 flex items-center justify-center text-slate-950">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black font-display text-slate-950">Akun Saya</h2>
        <p className="text-xs font-medium text-slate-600">
          Masuk ke akun Anda untuk mengelola profil, melihat saldo, dan riwayat transaksi.
        </p>
        <button
          onClick={onOpenAuth}
          className="py-2.5 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs nb-btn cursor-pointer"
        >
          Masuk / Daftar
        </button>
      </div>
    );
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} disalin ke clipboard!`, 'info');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: userProfile.uid,
          email: userProfile.email,
          name: name.trim(),
          photoURL: userProfile.photoURL
        })
      });

      if (res.ok) {
        await refreshUserProfile();
        setIsEditing(false);
        showToast('Profil berhasil diperbarui!', 'success');
      }
    } catch (err) {
      showToast('Gagal memperbarui profil.', 'error');
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
    <div className="max-w-2xl mx-auto space-y-6 pb-24 md:pb-8">
      {/* Profile Card */}
      <div className="bg-[#FFE600] border-2 border-slate-950 rounded-2xl p-6 shadow-[5px_5px_0px_0px_#020617]">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar */}
          <div className="relative">
            {userProfile.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt={userProfile.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-950 shadow-[3px_3px_0px_0px_#020617] bg-white"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-white border-2 border-slate-950 shadow-[3px_3px_0px_0px_#020617] flex items-center justify-center font-display font-black text-2xl text-slate-950">
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-1.5 -right-1.5 px-2 py-0.5 rounded-lg bg-[#4ADE80] border-2 border-slate-950 text-slate-950 font-black text-[9px] uppercase tracking-wider">
              {userProfile.status}
            </span>
          </div>

          {/* User Information */}
          <div className="flex-1 text-center sm:text-left space-y-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
              <div className="min-w-0">
                <h1 className="text-xl font-black font-display text-slate-950 truncate">
                  {userProfile.name}
                </h1>
                <p className="text-xs font-bold text-slate-800 font-mono truncate">{userProfile.email}</p>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-1.5 shrink-0">
                <span
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 border-2 border-slate-950 ${
                    userProfile.role === 'admin'
                      ? 'bg-[#FB923C] text-slate-950'
                      : 'bg-white text-slate-950'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{userProfile.role === 'admin' ? 'ADMINISTRATOR' : 'MEMBER'}</span>
                </span>
              </div>
            </div>

            <div className="pt-3 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs font-bold text-slate-950">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Bergabung: {formattedDate}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" />
                <span>
                  Saldo:{' '}
                  <strong className="font-mono font-black tabular-nums">
                    {userProfile.balance.toLocaleString()}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Details & Settings */}
      <div className="bg-white border-2 border-slate-950 rounded-2xl p-6 shadow-[5px_5px_0px_0px_#020617] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b-2 border-slate-950">
          <h2 className="text-sm font-black font-display text-slate-950 uppercase tracking-wider">
            Detail Akun & Kredensial
          </h2>
          <button
            onClick={() => {
              setName(userProfile.name);
              setIsEditing(!isEditing);
            }}
            className="px-3 py-1 rounded-lg bg-[#E0F2FE] hover:bg-[#FFE600] border-2 border-slate-950 text-xs font-extrabold text-slate-950 flex items-center gap-1 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Batal' : 'Ubah Nama'}</span>
          </button>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <form
            onSubmit={handleUpdateProfile}
            className="p-4 rounded-xl bg-[#F0F4FF] border-2 border-slate-950 space-y-3"
          >
            <label className="block text-xs font-extrabold uppercase text-slate-950">
              Ubah Nama Tampilan
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-3 py-2 nb-input rounded-xl text-xs font-bold"
                required
              />
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-extrabold nb-btn flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan</span>
              </button>
            </div>
          </form>
        )}

        {/* Info Rows */}
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#EBF1FF] border-2 border-slate-950">
            <div className="flex items-center gap-2.5 min-w-0">
              <Key className="w-4 h-4 text-slate-950 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold uppercase text-slate-500 block">
                  UID Pengguna
                </span>
                <span className="font-mono font-bold text-slate-950 break-all">{userProfile.uid}</span>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(userProfile.uid, 'UID')}
              className="p-2 text-slate-950 rounded-lg bg-white hover:bg-[#FFE600] border border-slate-950 shrink-0 ml-2 cursor-pointer"
              title="Salin UID"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[#EBF1FF] border-2 border-slate-950">
            <div className="flex items-center gap-2.5 min-w-0">
              <Mail className="w-4 h-4 text-slate-950 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold uppercase text-slate-500 block">
                  Alamat Email
                </span>
                <span className="font-mono font-bold text-slate-950 break-all">{userProfile.email}</span>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(userProfile.email, 'Email')}
              className="p-2 text-slate-950 rounded-lg bg-white hover:bg-[#FFE600] border border-slate-950 shrink-0 ml-2 cursor-pointer"
              title="Salin Email"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Admin Shortcut if role is admin */}
        {userProfile.role === 'admin' && (
          <div className="mt-4 p-4 rounded-xl bg-[#FED7AA] border-2 border-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-black text-slate-950 block">Akses Panel Administrator</span>
              <span className="text-[11px] font-semibold text-slate-800">
                Kelola deposit, pengguna, produk, dan konfigurasi API server.
              </span>
            </div>
            <button
              onClick={() => setActiveTab('admin')}
              className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-[#2563EB] text-white font-extrabold text-xs nb-btn flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span>Buka Admin</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 border-t-2 border-slate-950 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setActiveTab('deposit')}
            className="py-2.5 px-4 rounded-xl bg-[#38BDF8] hover:bg-[#7DD3FC] text-slate-950 font-extrabold text-xs nb-btn cursor-pointer"
          >
            Deposit Saldo (QRIS)
          </button>

          <button
            onClick={() => logout()}
            className="py-2.5 px-4 rounded-xl bg-[#FFE4E6] hover:bg-[#FB7185] text-slate-950 font-extrabold text-xs nb-btn flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </div>

      {/* Keamanan & Reset Kata Sandi Firebase */}
      <div className="bg-white border-2 border-slate-950 rounded-2xl p-6 shadow-[5px_5px_0px_0px_#020617] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b-2 border-slate-950">
          <div>
            <h2 className="text-sm font-black font-display text-slate-950 uppercase tracking-wider">
              Keamanan & Kata Sandi (Firebase)
            </h2>
            <p className="text-[11px] font-medium text-slate-600 mt-0.5">
              Kirim tautan reset sandi resmi dari Firebase ke Gmail atau ubah sandi langsung.
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#E0F2FE] border-2 border-slate-950 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4 text-slate-950" />
          </div>
        </div>

        {/* Send Firebase Reset Link */}
        <div className="p-4 rounded-xl bg-[#EBF1FF] border-2 border-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <span className="text-xs font-black text-slate-950 block">Reset Sandi via Email Firebase</span>
            <span className="text-[11px] font-semibold text-slate-700 block truncate">
              Kirim tautan ubah sandi ke <span className="font-mono text-[#2563EB]">{userProfile.email}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={handleSendResetLink}
            disabled={sendingResetLink}
            className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs nb-btn flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sendingResetLink ? 'Mengirim...' : 'Kirim Link Reset Firebase'}</span>
          </button>
        </div>

        {resetLinkSent && (
          <div className="p-3.5 rounded-xl bg-[#DCFCE7] border-2 border-slate-950 text-[11px] font-bold text-slate-950">
            Link reset resmi Firebase sudah dikirim ke <strong>{userProfile.email}</strong>. Silakan cek kotak masuk atau folder Spam Gmail Anda.
          </div>
        )}

        {/* Direct Password Change Form (for email/password accounts) */}
        {hasPasswordProvider && (
          <form
            onSubmit={handleChangePassword}
            className="p-4 rounded-xl bg-[#F0F4FF] border-2 border-slate-950 space-y-3"
          >
            <div className="text-xs font-black uppercase text-slate-950">Ubah Kata Sandi Langsung</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Sandi lama"
                className="px-3 py-2 nb-input rounded-xl text-xs font-semibold placeholder-slate-400"
                required
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Sandi baru (min 6)"
                className="px-3 py-2 nb-input rounded-xl text-xs font-semibold placeholder-slate-400"
                required
              />
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Ulangi sandi baru"
                className="px-3 py-2 nb-input rounded-xl text-xs font-semibold placeholder-slate-400"
                required
              />
            </div>
            <button
              type="submit"
              disabled={changingPassword}
              className="px-4 py-2 rounded-xl bg-[#FFE600] hover:bg-[#FEF08A] text-slate-950 font-black text-xs nb-btn disabled:opacity-50 cursor-pointer"
            >
              {changingPassword ? 'Menyimpan...' : 'Ubah Kata Sandi'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
