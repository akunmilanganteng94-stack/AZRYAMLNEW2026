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
      <div className="max-w-md mx-auto text-center py-16 px-4 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-cyan-400">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-display text-white">Akun Saya</h2>
        <p className="text-xs text-slate-400">
          Masuk ke akun Anda untuk mengelola profil, melihat saldo, dan riwayat transaksi.
        </p>
        <button
          onClick={onOpenAuth}
          className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/20"
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
    ? new Date(userProfile.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Hari ini';

  const hasPasswordProvider = Boolean(
    currentUser?.providerData?.some((p) => p.providerId === 'password')
  );

  const handleSendResetLink = async () => {
    setSendingResetLink(true);
    try {
      await resetPassword(userProfile.email);
      setResetLinkSent(true);
      showToast(`Link reset sandi resmi dari Firebase telah dikirim ke ${userProfile.email}. Cek Inbox / Spam Gmail Anda!`, 'success');
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
      <div className="bg-[#080d1e] border border-blue-500/20 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar */}
          <div className="relative">
            {userProfile.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt={userProfile.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-500/30 shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 p-0.5 shadow-lg shadow-blue-600/20">
                <div className="w-full h-full bg-[#0a1027] rounded-[14px] flex items-center justify-center font-display font-extrabold text-2xl text-cyan-300">
                  {userProfile.name.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-extrabold text-[9px] uppercase tracking-wider">
              {userProfile.status}
            </span>
          </div>

          {/* User Information */}
          <div className="flex-1 text-center sm:text-left space-y-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
              <div>
                <h1 className="text-xl font-bold font-display text-white">
                  {userProfile.name}
                </h1>
                <p className="text-xs text-cyan-300 font-mono">{userProfile.email}</p>
              </div>

              {/* Role Badge */}
              <div className="flex items-center justify-center sm:justify-start gap-1.5">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 border ${
                  userProfile.role === 'admin'
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-blue-500/20 border-blue-500/40 text-cyan-300'
                }`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{userProfile.role === 'admin' ? 'ADMINISTRATOR' : 'MEMBER'}</span>
                </span>
              </div>
            </div>

            <div className="pt-3 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Bergabung: {formattedDate}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-cyan-400" />
                <span>Saldo: <strong className="text-white font-mono">{userProfile.balance.toLocaleString()}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Details & Settings */}
      <div className="bg-[#080d1e] border border-blue-500/15 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="text-sm font-bold font-display text-white">Detail Akun & Kredensial</h2>
          <button
            onClick={() => {
              setName(userProfile.name);
              setIsEditing(!isEditing);
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Batal' : 'Ubah Nama'}</span>
          </button>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <form onSubmit={handleUpdateProfile} className="p-4 rounded-2xl bg-slate-950 border border-blue-500/30 space-y-3">
            <label className="block text-xs font-medium text-slate-300">Ubah Nama Tampilan</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                required
              />
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan</span>
              </button>
            </div>
          </form>
        )}

        {/* Info Rows */}
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <Key className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-[10px] text-slate-500 block">UID Pengguna</span>
                <span className="font-mono text-slate-300 break-all">{userProfile.uid}</span>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(userProfile.uid, 'UID')}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              title="Salin UID"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-[10px] text-slate-500 block">Alamat Email</span>
                <span className="text-slate-300">{userProfile.email}</span>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(userProfile.email, 'Email')}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              title="Salin Email"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Admin Shortcut if role is admin */}
        {userProfile.role === 'admin' && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-300 block">Akses Panel Administrator</span>
              <span className="text-[11px] text-amber-200/80">
                Kelola deposit, pengguna, produk, dan konfigurasi API server.
              </span>
            </div>
            <button
              onClick={() => setActiveTab('admin')}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-1 shadow-md shadow-amber-500/20"
            >
              <span>Buka Admin</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => setActiveTab('deposit')}
            className="py-2.5 px-4 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-cyan-300 font-semibold text-xs transition-all cursor-pointer"
          >
            Deposit Saldo (QRIS)
          </button>

          <button
            onClick={() => logout()}
            className="py-2.5 px-4 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </div>

      {/* Keamanan & Reset Kata Sandi Firebase */}
      <div className="bg-[#080d1e] border border-blue-500/15 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold font-display text-white">Keamanan & Kata Sandi (Firebase)</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Kirim tautan reset sandi resmi dari Firebase ke Gmail atau ubah sandi langsung.
            </p>
          </div>
          <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
        </div>

        {/* Send Firebase Reset Link */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-white block">Reset Sandi via Email Firebase</span>
            <span className="text-[11px] text-slate-400 block">
              Kirim tautan ubah sandi ke <span className="font-mono text-cyan-300">{userProfile.email}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={handleSendResetLink}
            disabled={sendingResetLink}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shrink-0 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sendingResetLink ? 'Mengirim...' : 'Kirim Link Reset Firebase'}</span>
          </button>
        </div>

        {resetLinkSent && (
          <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-200">
            Link reset resmi Firebase sudah dikirim ke <strong>{userProfile.email}</strong>. Silakan cek kotak masuk atau folder Spam Gmail Anda.
          </div>
        )}

        {/* Direct Password Change Form (for email/password accounts) */}
        {hasPasswordProvider && (
          <form onSubmit={handleChangePassword} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-white">Ubah Kata Sandi Langsung</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Sandi lama"
                className="px-3 py-2 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                required
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Sandi baru (min 6)"
                className="px-3 py-2 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                required
              />
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Ulangi sandi baru"
                className="px-3 py-2 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={changingPassword}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {changingPassword ? 'Menyimpan...' : 'Ubah Kata Sandi'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
