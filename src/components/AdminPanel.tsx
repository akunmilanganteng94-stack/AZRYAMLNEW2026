import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from './Toast.tsx';
import { 
  UserProfile, 
  DepositTransaction, 
  OrderTransaction, 
  ProductItem, 
  StoreSettings, 
  AuditLog, 
  DashboardStats 
} from '../types/index.ts';
import { 
  ShieldCheck, 
  Users, 
  Wallet, 
  ShoppingBag, 
  TrendingUp, 
  Clock, 
  Settings, 
  Key, 
  CheckCircle2, 
  XCircle, 
  Edit, 
  Ban, 
  Unlock, 
  RefreshCw, 
  Send, 
  ToggleLeft, 
  ToggleRight,
  Sliders,
  FileText,
  AlertTriangle,
  Play
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const { userProfile, refreshUserProfile, changeUserRole } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'deposits' | 'users' | 'products' | 'api' | 'store' | 'audit'>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [deposits, setDeposits] = useState<DepositTransaction[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [orders, setOrders] = useState<OrderTransaction[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Deposit Action Modal State
  const [selectedDeposit, setSelectedDeposit] = useState<DepositTransaction | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [adminNote, setAdminNote] = useState<string>('');
  const [processingAction, setProcessingAction] = useState<boolean>(false);

  // Edit User Balance Modal State
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [newBalanceInput, setNewBalanceInput] = useState<string>('');
  const [balanceReason, setBalanceReason] = useState<string>('');

  // API Test State
  const [testApiType, setTestApiType] = useState<'bulk' | 'verif'>('bulk');
  const [testingApi, setTestingApi] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Headers for admin requests
  const adminHeaders = {
    'Content-Type': 'application/json',
    'x-admin-uid': userProfile?.uid || 'azryl_admin_owner',
    'x-admin-email': userProfile?.email || 'apriliansyahazril10@gmail.com'
  };

  const fetchAllAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, depRes, userRes, prodRes, ordRes, setRes, audRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: adminHeaders }),
        fetch('/api/admin/deposits', { headers: adminHeaders }),
        fetch('/api/admin/users', { headers: adminHeaders }),
        fetch('/api/products'),
        fetch('/api/admin/orders', { headers: adminHeaders }),
        fetch('/api/admin/settings', { headers: adminHeaders }),
        fetch('/api/admin/audit-logs', { headers: adminHeaders })
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (depRes.ok) setDeposits(await depRes.json());
      if (userRes.ok) setUsers(await userRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
      if (ordRes.ok) setOrders(await ordRes.json());
      if (setRes.ok) setSettings(await setRes.json());
      if (audRes.ok) setAuditLogs(await audRes.json());
    } catch (err) {
      console.error(err);
      showToast('Gagal memuat data admin.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAdminData();
  }, [userProfile?.uid]);

  // Handle Approve / Reject Deposit
  const handleDepositAction = async () => {
    if (!selectedDeposit) return;
    setProcessingAction(true);
    try {
      const res = await fetch('/api/admin/deposits/action', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          depositId: selectedDeposit.id,
          action: actionType,
          adminNote: adminNote.trim() || (actionType === 'approve' ? 'Disetujui oleh admin' : 'Ditolak oleh admin')
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Gagal memproses deposit', 'error');
        setProcessingAction(false);
        return;
      }

      showToast(data.message, 'success');
      setSelectedDeposit(null);
      setAdminNote('');
      fetchAllAdminData();
      refreshUserProfile();
    } catch (err) {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle Update User Balance
  const handleUpdateBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const numericBalance = parseInt(newBalanceInput, 10);
    if (isNaN(numericBalance) || numericBalance < 0) {
      showToast('Nominal saldo tidak valid.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/users/balance', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          uid: selectedUser.uid,
          newBalance: numericBalance,
          reason: balanceReason.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Gagal mengubah saldo', 'error');
        return;
      }

      showToast(`Saldo ${selectedUser.name} diubah menjadi ${numericBalance.toLocaleString()}`, 'success');
      setSelectedUser(null);
      setNewBalanceInput('');
      setBalanceReason('');
      fetchAllAdminData();
      refreshUserProfile();
    } catch (err) {
      showToast('Terjadi kesalahan.', 'error');
    }
  };

  // Handle User Status toggle (Ban / Unban)
  const handleToggleUserStatus = async (user: UserProfile) => {
    const nextStatus = user.status === 'active' ? 'banned' : 'active';
    try {
      const res = await fetch('/api/admin/users/status', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          uid: user.uid,
          status: nextStatus
        })
      });

      if (res.ok) {
        showToast(`Status pengguna diubah menjadi ${nextStatus}`, 'success');
        fetchAllAdminData();
      }
    } catch (err) {
      showToast('Gagal mengubah status pengguna', 'error');
    }
  };

  // Handle Product Update
  const handleUpdateProduct = async (product: ProductItem) => {
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify(product)
      });

      if (res.ok) {
        showToast(`Produk ${product.name} berhasil diperbarui!`, 'success');
        fetchAllAdminData();
      } else {
        showToast('Gagal memperbarui produk.', 'error');
      }
    } catch (err) {
      showToast('Terjadi kesalahan.', 'error');
    }
  };

  // Handle Settings Toggle (Store & Deposit Open/Close)
  const handleToggleSetting = async (key: 'storeOpen' | 'depositOpen', val: boolean) => {
    if (!settings) return;
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ [key]: val })
      });

      if (res.ok) {
        setSettings(prev => prev ? { ...prev, [key]: val } : null);
        showToast(`Pengaturan berhasil diubah: ${key} = ${val ? 'Buka' : 'Tutup'}`, 'success');
      }
    } catch (err) {
      showToast('Gagal mengubah pengaturan toko', 'error');
    }
  };

  // Handle Save API Config
  const handleSaveApiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings?.apiConfiguration) return;

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          apiConfiguration: settings.apiConfiguration
        })
      });

      if (res.ok) {
        showToast('Konfigurasi API berhasil disimpan dengan aman!', 'success');
        fetchAllAdminData();
      }
    } catch (err) {
      showToast('Gagal menyimpan konfigurasi API.', 'error');
    }
  };

  // Handle Test API Connection
  const handleTestApi = async (type: 'bulk' | 'verif') => {
    setTestingApi(true);
    setTestResult(null);

    const url = type === 'bulk' ? settings?.apiConfiguration.bulkApiUrl : settings?.apiConfiguration.verifApiUrl;
    const apiKey = type === 'bulk' ? settings?.apiConfiguration.bulkApiKey : settings?.apiConfiguration.verifApiKey;

    try {
      const res = await fetch('/api/admin/test-api', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ type, url, apiKey })
      });

      const data = await res.json();
      setTestResult(data);
      if (res.ok) {
        showToast(`Tes API ${type.toUpperCase()} selesai (${data.durationMs}ms)`, 'info');
      } else {
        showToast(`Tes API gagal: ${data.error}`, 'error');
      }
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
      showToast('Gagal menguji koneksi API.', 'error');
    } finally {
      setTestingApi(false);
    }
  };

  const pendingDeposits = deposits.filter(d => d.status === 'Menunggu Konfirmasi Admin');

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-950/40 via-[#0a1027] to-blue-950/40 p-5 rounded-3xl border border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Panel Administrator
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                ROOT ACCESS
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-white mt-0.5">
              AM PREMIUM Control Center
            </h1>
            <p className="text-xs text-slate-400">
              Kelola pesanan, persetujuan deposit, saldo pengguna, dan konfigurasi API server.
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchAllAdminData()}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:text-white flex items-center gap-1.5 text-xs font-semibold self-start sm:self-auto transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'dashboard', label: 'Ringkasan', icon: TrendingUp },
          { id: 'deposits', label: `Deposit (${pendingDeposits.length} pending)`, icon: Wallet, highlight: pendingDeposits.length > 0 },
          { id: 'users', label: `Pengguna (${users.length})`, icon: Users },
          { id: 'products', label: 'Produk & Harga', icon: ShoppingBag },
          { id: 'api', label: 'Pengaturan API', icon: Key },
          { id: 'store', label: 'Status Toko', icon: Sliders },
          { id: 'audit', label: 'Audit Log', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10'
                  : tab.highlight
                  ? 'bg-rose-950/40 text-rose-300 border-rose-500/40 hover:bg-rose-900/40'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          TAB 1: DASHBOARD OVERVIEW
         ========================================================================= */}
      {activeTab === 'dashboard' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-[#080d1e] border border-blue-500/20 space-y-1">
              <span className="text-xs text-slate-400">Total Pengguna</span>
              <div className="text-2xl font-bold font-display text-white">
                {stats.totalUsers} <span className="text-xs font-normal text-slate-500">Akun</span>
              </div>
              <div className="text-[10px] text-cyan-400">Terdaftar di sistem</div>
            </div>

            <div className="p-5 rounded-3xl bg-[#080d1e] border border-blue-500/20 space-y-1">
              <span className="text-xs text-slate-400">Total Deposit Berhasil</span>
              <div className="text-2xl font-bold font-display text-emerald-400">
                {stats.totalDeposit.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-400">Rp {stats.totalDeposit.toLocaleString('id-ID')} masuk</div>
            </div>

            <div className="p-5 rounded-3xl bg-[#080d1e] border border-blue-500/20 space-y-1">
              <span className="text-xs text-slate-400">Total Pendapatan (Order)</span>
              <div className="text-2xl font-bold font-display text-cyan-400">
                {stats.totalRevenue.toLocaleString()}
              </div>
              <div className="text-[10px] text-cyan-400">{stats.successfulOrders} akun sukses terinject</div>
            </div>

            <div className="p-5 rounded-3xl bg-[#080d1e] border border-blue-500/20 space-y-1">
              <span className="text-xs text-slate-400">Total Transaksi</span>
              <div className="text-2xl font-bold font-display text-white">
                {stats.totalTransactions} <span className="text-xs font-normal text-slate-500">Order & Depo</span>
              </div>
              <div className="text-[10px] text-slate-400">Semua aktivitas</div>
            </div>

            <div className="p-5 rounded-3xl bg-[#080d1e] border border-rose-500/30 bg-rose-950/20 space-y-1">
              <span className="text-xs text-slate-400">Deposit Menunggu Konfirmasi</span>
              <div className="text-2xl font-bold font-display text-amber-400">
                {stats.pendingDeposits} <span className="text-xs font-normal text-slate-500">Permintaan</span>
              </div>
              <button
                onClick={() => setActiveTab('deposits')}
                className="text-[10px] text-amber-400 underline font-semibold"
              >
                Tinjau sekarang
              </button>
            </div>

            <div className="p-5 rounded-3xl bg-[#080d1e] border border-blue-500/20 space-y-1">
              <span className="text-xs text-slate-400">Status Operasional</span>
              <div className="text-xl font-bold font-display text-white flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${settings?.storeOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                <span>{settings?.storeOpen ? 'Toko Buka' : 'Toko Tutup'}</span>
              </div>
              <div className="text-[10px] text-slate-400">
                Deposit: {settings?.depositOpen ? 'Buka' : 'Tutup'}
              </div>
            </div>
          </div>

          {/* Pending Deposits Priority Alert */}
          {pendingDeposits.length > 0 && (
            <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Ada {pendingDeposits.length} Permintaan Deposit Menunggu Persetujuan
                  </h3>
                  <p className="text-xs text-amber-200/80">
                    Periksa mutasi QRIS Anda dan klik "Setujui" untuk menambahkan saldo pengguna.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('deposits')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-500/20 shrink-0"
              >
                Buka Manajemen Deposit
              </button>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: MANAJEMEN DEPOSIT
         ========================================================================= */}
      {activeTab === 'deposits' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold font-display text-white">
              Daftar Permintaan Deposit ({deposits.length})
            </h2>
            <span className="text-xs text-amber-400 font-semibold">
              {pendingDeposits.length} Menunggu Verifikasi
            </span>
          </div>

          {deposits.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#080d1e] border border-slate-800 text-xs text-slate-400">
              Belum ada permintaan deposit.
            </div>
          ) : (
            <div className="space-y-3">
              {deposits.map((dep) => {
                const isPending = dep.status === 'Menunggu Konfirmasi Admin';
                const isApproved = dep.status === 'Berhasil';
                const isRejected = dep.status === 'Ditolak';

                return (
                  <div
                    key={dep.id}
                    className={`rounded-2xl border p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all ${
                      isPending 
                        ? 'bg-amber-950/20 border-amber-500/30' 
                        : isApproved 
                        ? 'bg-[#080d1e] border-emerald-500/20' 
                        : 'bg-[#080d1e] border-slate-800'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-cyan-300 font-bold text-xs">{dep.id}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          isPending 
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                            : isApproved 
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                            : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                        }`}>
                          {dep.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300">
                        Nama Pengirim: <strong className="text-white">{dep.senderName}</strong> · Email: <span className="font-mono text-slate-400">{dep.userEmail}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Diajukan: {new Date(dep.createdAt).toLocaleString('id-ID')}
                        {dep.approvedAt && ` · Diproses: ${new Date(dep.approvedAt).toLocaleString('id-ID')}`}
                      </div>
                      {dep.adminNote && (
                        <div className="text-[11px] text-slate-400 italic">
                          Catatan: "{dep.adminNote}"
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
                      <div className="text-left lg:text-right">
                        <div className="text-lg font-extrabold font-display text-cyan-400">
                          +{dep.amount.toLocaleString()}
                        </div>
                        <span className="text-[10px] text-slate-500">Rp {dep.amount.toLocaleString('id-ID')}</span>
                      </div>

                      {isPending && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedDeposit(dep);
                              setActionType('approve');
                              setAdminNote('Pembayaran QRIS telah diverifikasi.');
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-600/20 transition-all"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Setujui</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedDeposit(dep);
                              setActionType('reject');
                              setAdminNote('Mutasi tidak ditemukan / nominal salah.');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-1 transition-all"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: MANAJEMEN USER
         ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold font-display text-white">
              Daftar Pengguna Terdaftar ({users.length})
            </h2>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-blue-500/20 bg-[#080d1e]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3.5 font-semibold">Pengguna / Email</th>
                  <th className="p-3.5 font-semibold">UID</th>
                  <th className="p-3.5 font-semibold">Saldo (P)</th>
                  <th className="p-3.5 font-semibold">Role</th>
                  <th className="p-3.5 font-semibold">Status</th>
                  <th className="p-3.5 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {users.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3.5">
                      <div className="font-semibold text-white">{u.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-400">
                      {u.uid.slice(0, 14)}...
                    </td>
                    <td className="p-3.5">
                      <span className="font-extrabold font-display text-cyan-400 text-sm">
                        {u.balance.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <button
                        onClick={async () => {
                          const newRole = u.role === 'admin' ? 'user' : 'admin';
                          await changeUserRole(u.uid, newRole);
                          showToast(`Role ${u.name} diubah menjadi ${newRole.toUpperCase()} (Tersinkron ke Firestore)`, 'success');
                          fetchAllAdminData();
                        }}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                          u.role === 'admin' ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30' : 'bg-blue-500/20 border-blue-500/40 text-cyan-300 hover:bg-blue-500/30'
                        }`}
                        title="Klik untuk ubah role (user/admin) di Firestore"
                      >
                        {u.role.toUpperCase()} ⟳
                      </button>
                    </td>
                    <td className="p-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        u.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {u.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setNewBalanceInput(u.balance.toString());
                          setBalanceReason('');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600 text-cyan-300 hover:text-white font-semibold text-[11px] transition-all"
                      >
                        Edit Saldo
                      </button>

                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                            u.status === 'active'
                              ? 'bg-rose-950/40 hover:bg-rose-600 text-rose-300 hover:text-white'
                              : 'bg-emerald-950/40 hover:bg-emerald-600 text-emerald-300 hover:text-white'
                          }`}
                        >
                          {u.status === 'active' ? 'Tangguhkan' : 'Aktifkan'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: MANAJEMEN PRODUK & HARGA
         ========================================================================= */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold font-display text-white">
              Manajemen Produk & Harga
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {products.map((prod) => (
              <div
                key={prod.id}
                className="rounded-3xl bg-[#080d1e] border border-blue-500/20 p-5 space-y-4 shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold font-display text-white">{prod.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      prod.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {prod.active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                </div>

                {/* Preview Image */}
                <div className="w-full aspect-[16/8] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
                  <img 
                    src={prod.image} 
                    alt={prod.name} 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/product-banner.webp';
                    }}
                  />
                </div>

                {/* Edit Form */}
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Harga (P):</label>
                    <input
                      type="number"
                      value={prod.price}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, price: val } : p));
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">URL Logo / Gambar Horizontal:</label>
                    <input
                      type="text"
                      value={prod.image}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, image: val } : p));
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-white font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Deskripsi Singkat:</label>
                    <textarea
                      value={prod.description}
                      rows={2}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, description: val } : p));
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-white resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={prod.active}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, active: val } : p));
                        }}
                        className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span>Tampilkan & Aktifkan Produk</span>
                    </label>

                    <button
                      onClick={() => handleUpdateProduct(prod)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-600/20"
                    >
                      Simpan Produk
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: PENGATURAN API
         ========================================================================= */}
      {activeTab === 'api' && settings && (
        <div className="space-y-6">
          <div className="bg-[#080d1e] border border-blue-500/20 rounded-3xl p-6 shadow-xl space-y-6">
            <div>
              <h2 className="text-base font-bold font-display text-white">
                Konfigurasi API Eksternal
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                API key disimpan aman di backend Node.js dan tidak pernah diekspos ke frontend pengguna.
              </p>
            </div>

            <form onSubmit={handleSaveApiConfig} className="space-y-5">
              {/* BULK API CONFIG */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-cyan-300">1. Konfigurasi API Bulk AM</h3>
                  <button
                    type="button"
                    onClick={() => handleTestApi('bulk')}
                    disabled={testingApi}
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-semibold rounded-lg flex items-center gap-1.5 transition-all"
                  >
                    <Play className="w-3 h-3 text-cyan-400" />
                    <span>Tes Koneksi Bulk</span>
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Endpoint POST URL:</label>
                  <input
                    type="text"
                    value={settings.apiConfiguration?.bulkApiUrl || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings(prev => prev ? {
                        ...prev,
                        apiConfiguration: { ...prev.apiConfiguration, bulkApiUrl: val }
                      } : null);
                    }}
                    placeholder="https://am.dapjisync.my.id/api/send"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Header x-apikey:</label>
                  <input
                    type="text"
                    value={settings.apiConfiguration?.bulkApiKey || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings(prev => prev ? {
                        ...prev,
                        apiConfiguration: { ...prev.apiConfiguration, bulkApiKey: val }
                      } : null);
                    }}
                    placeholder="API_KEY_BULK"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-white font-mono"
                    required
                  />
                </div>
              </div>

              {/* VERIF API CONFIG */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-cyan-300">2. Konfigurasi API AM Verif</h3>
                  <button
                    type="button"
                    onClick={() => handleTestApi('verif')}
                    disabled={testingApi}
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-semibold rounded-lg flex items-center gap-1.5 transition-all"
                  >
                    <Play className="w-3 h-3 text-cyan-400" />
                    <span>Tes Koneksi Verif</span>
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Endpoint POST URL:</label>
                  <input
                    type="text"
                    value={settings.apiConfiguration?.verifApiUrl || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings(prev => prev ? {
                        ...prev,
                        apiConfiguration: { ...prev.apiConfiguration, verifApiUrl: val }
                      } : null);
                    }}
                    placeholder="https://am.dapjisync.my.id/api/verif"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Header x-apikey:</label>
                  <input
                    type="text"
                    value={settings.apiConfiguration?.verifApiKey || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings(prev => prev ? {
                        ...prev,
                        apiConfiguration: { ...prev.apiConfiguration, verifApiKey: val }
                      } : null);
                    }}
                    placeholder="API_KEY_VERIF"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-white font-mono"
                    required
                  />
                </div>
              </div>

              {/* Test Result Display */}
              {testResult && (
                <div className="p-3.5 rounded-2xl bg-black/50 border border-slate-800 text-xs font-mono">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>Hasil Tes Koneksi:</span>
                    <span>Durasi: {testResult.durationMs}ms</span>
                  </div>
                  <pre className="text-cyan-300 text-[11px] overflow-x-auto">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98]"
              >
                Simpan Semua Konfigurasi API
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: STATUS TOKO & KONTROL
         ========================================================================= */}
      {activeTab === 'store' && settings && (
        <div className="bg-[#080d1e] border border-blue-500/20 rounded-3xl p-6 shadow-xl space-y-6">
          <div>
            <h2 className="text-base font-bold font-display text-white">
              Pengaturan Toko & Layanan
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Kontrol status operasional pemesanan dan deposit saldo secara langsung.
            </p>
          </div>

          <div className="space-y-4">
            {/* Store Open/Close */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">Status Toko (Pemesanan Layanan)</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    settings.storeOpen ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {settings.storeOpen ? 'BUKA' : 'TUTUP'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Jika toko ditutup, pelanggan tidak dapat melakukan order Bulk AM maupun AM Verif.
                </p>
              </div>

              <button
                onClick={() => handleToggleSetting('storeOpen', !settings.storeOpen)}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                  settings.storeOpen
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {settings.storeOpen ? 'Tutup Toko' : 'Buka Toko'}
              </button>
            </div>

            {/* Deposit Open/Close */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">Layanan Deposit Saldo QRIS</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    settings.depositOpen ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {settings.depositOpen ? 'BUKA' : 'TUTUP'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Jika ditutup, pelanggan tidak dapat mengirim permohonan deposit saldo baru.
                </p>
              </div>

              <button
                onClick={() => handleToggleSetting('depositOpen', !settings.depositOpen)}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                  settings.depositOpen
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {settings.depositOpen ? 'Tutup Deposit' : 'Buka Deposit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 7: AUDIT LOGS
         ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold font-display text-white">
              Jejak Audit Aktivitas Administrator ({auditLogs.length})
            </h2>
          </div>

          <div className="space-y-2.5">
            {auditLogs.length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-[#080d1e] text-slate-500 text-xs">
                Belum ada aktivitas audit yang tercatat.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-2xl bg-[#080d1e] border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-amber-400 font-bold">{log.action}</span>
                      <span className="text-[10px] text-slate-400">oleh {log.adminEmail}</span>
                    </div>
                    <div className="text-slate-300">{log.details}</div>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono shrink-0">
                    {new Date(log.timestamp).toLocaleString('id-ID')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: APPROVE / REJECT DEPOSIT */}
      {selectedDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-[#090e21] border border-blue-500/30 rounded-3xl p-6 shadow-2xl relative">
            <h3 className="text-base font-bold font-display text-white mb-2">
              {actionType === 'approve' ? 'Setujui Permintaan Deposit' : 'Tolak Permintaan Deposit'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              ID Deposit: <span className="font-mono text-cyan-300">{selectedDeposit.id}</span>
            </p>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1.5 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Pengirim:</span>
                <span className="text-white font-semibold">{selectedDeposit.senderName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email Akun:</span>
                <span className="text-white font-mono">{selectedDeposit.userEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nominal:</span>
                <span className="text-emerald-400 font-bold text-sm">+{selectedDeposit.amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2 mb-5">
              <label className="block text-xs font-medium text-slate-300">Catatan Admin:</label>
              <input
                type="text"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={actionType === 'approve' ? 'Disetujui oleh admin' : 'Contoh: Mutasi QRIS tidak sesuai'}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedDeposit(null)}
                className="py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleDepositAction}
                disabled={processingAction}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs text-white transition-all ${
                  actionType === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {processingAction ? 'Memproses...' : actionType === 'approve' ? 'Konfirmasi Setujui' : 'Konfirmasi Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER BALANCE */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-[#090e21] border border-blue-500/30 rounded-3xl p-6 shadow-2xl relative">
            <h3 className="text-base font-bold font-display text-white mb-1">
              Sesuaikan Saldo Pengguna
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Target: <span className="font-semibold text-white">{selectedUser.name}</span> ({selectedUser.email})
            </p>

            <form onSubmit={handleUpdateBalance} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Saldo Baru:
                </label>
                <input
                  type="number"
                  min="0"
                  value={newBalanceInput}
                  onChange={(e) => setNewBalanceInput(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-sm font-bold text-cyan-300"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Alasan Perubahan (Audit Trail):
                </label>
                <input
                  type="text"
                  value={balanceReason}
                  onChange={(e) => setBalanceReason(e.target.value)}
                  placeholder="Contoh: Bonus promo / Koreksi saldo"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                >
                  Simpan Saldo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
