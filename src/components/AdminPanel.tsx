import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from './Toast.tsx';
import { db, collection, doc, onSnapshot, setDoc, increment } from '../lib/firebase.ts';
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
  Play,
  Download,
  PlusCircle,
  Eye,
  EyeOff,
  Search,
  Lock,
  ArrowRight,
  Sparkles,
  Database
} from 'lucide-react';

interface AdminPanelProps {
  setActiveTab?: (tab: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ setActiveTab: setParentActiveTab }) => {
  const { userProfile, refreshUserProfile, changeUserRole } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'deposits' | 'users' | 'orders' | 'products' | 'api' | 'store' | 'audit'>('dashboard');
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

  // Create User Modal State
  const [showCreateUserModal, setShowCreateUserModal] = useState<boolean>(false);
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');
  const [newUserBalance, setNewUserBalance] = useState<string>('0');
  const [creatingUser, setCreatingUser] = useState<boolean>(false);

  // API Settings & Test State
  const [showApiKeys, setShowApiKeys] = useState<boolean>(false);
  const [testApiType, setTestApiType] = useState<'bulk' | 'verif'>('bulk');
  const [testingApi, setTestingApi] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Filters & Search
  const [depositFilter, setDepositFilter] = useState<string>('all');
  const [depositSearch, setDepositSearch] = useState<string>('');
  const [userSearch, setUserSearch] = useState<string>('');
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState<string>('');

  const isAdmin = userProfile?.role === 'admin' || userProfile?.email?.toLowerCase().trim() === 'apriliansyahazril10@gmail.com';

  // Headers for admin requests
  const adminHeaders = {
    'Content-Type': 'application/json',
    'x-admin-uid': userProfile?.uid || 'azryl_root_owner',
    'x-admin-email': userProfile?.email || 'apriliansyahazril10@gmail.com'
  };

  const mergeDeposits = (apiList: DepositTransaction[], fsList: DepositTransaction[]) => {
    const map = new Map<string, DepositTransaction>();
    [...apiList, ...fsList].forEach((dep) => {
      if (!dep || !dep.id) return;
      const existing = map.get(dep.id);
      if (!existing) {
        map.set(dep.id, dep);
      } else {
        // Prefer already-processed status over pending
        const existingPending = existing.status === 'Menunggu Konfirmasi Admin';
        const nextPending = dep.status === 'Menunggu Konfirmasi Admin';
        if (existingPending && !nextPending) {
          map.set(dep.id, dep);
        }
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const [apiDeposits, setApiDeposits] = useState<DepositTransaction[]>([]);
  const [fsDeposits, setFsDeposits] = useState<DepositTransaction[]>([]);
  const [apiUsers, setApiUsers] = useState<UserProfile[]>([]);
  const [fsUsers, setFsUsers] = useState<UserProfile[]>([]);
  const [hasLoadedFsUsers, setHasLoadedFsUsers] = useState<boolean>(false);

  useEffect(() => {
    setDeposits(mergeDeposits(apiDeposits, fsDeposits));
  }, [apiDeposits, fsDeposits]);

  // Use Firestore users as the primary source of truth so user list strictly matches Firebase
  useEffect(() => {
    const sourceList = hasLoadedFsUsers ? fsUsers : apiUsers;
    const normalized = sourceList
      .filter((u) => u && u.uid)
      .map((u) => ({
        uid: u.uid,
        name: u.name || u.email?.split('@')[0] || 'Member AM',
        email: u.email || '',
        photoURL: u.photoURL || '',
        balance: typeof u.balance === 'number' ? u.balance : 0,
        role: (u.role === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
        createdAt: u.createdAt || new Date().toISOString(),
        status: (u.status === 'banned' ? 'banned' : 'active') as 'active' | 'banned'
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setUsers(normalized);
  }, [apiUsers, fsUsers, hasLoadedFsUsers]);

  const fetchAllAdminData = async (silent = false) => {
    if (!silent) setLoading(true);
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
      if (depRes.ok) setApiDeposits(await depRes.json());
      if (userRes.ok) setApiUsers(await userRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
      if (ordRes.ok) setOrders(await ordRes.json());
      if (setRes.ok) setSettings(await setRes.json());
      if (audRes.ok) setAuditLogs(await audRes.json());
    } catch (err) {
      console.error(err);
      if (!silent) showToast('Gagal memuat data admin.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchAllAdminData();

    // Real-time Firestore listener for users so Admin Panel matches Firebase users 1:1
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as UserProfile;
          if (data && (data.uid || docSnap.id)) {
            list.push({
              ...data,
              uid: data.uid || docSnap.id,
              balance: typeof data.balance === 'number' ? data.balance : 0,
              role: data.role === 'admin' ? 'admin' : 'user',
              status: data.status === 'banned' ? 'banned' : 'active'
            });
          }
        });
        setFsUsers(list);
        setHasLoadedFsUsers(true);
      },
      () => {}
    );

    // Real-time Firestore listener for deposits so "Sudah Bayar" appears instantly in Admin Panel
    const unsubDeposits = onSnapshot(
      collection(db, 'deposits'),
      (snapshot) => {
        const list: DepositTransaction[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as DepositTransaction;
          if (data && data.id) list.push(data);
        });
        setFsDeposits(list);
      },
      () => {}
    );

    // Polling backup every 5 seconds for server state
    const interval = setInterval(() => {
      fetchAllAdminData(true);
    }, 5000);

    return () => {
      unsubUsers();
      unsubDeposits();
      clearInterval(interval);
    };
  }, [userProfile?.uid, userProfile?.role, isAdmin]);

  // Handle Approve / Reject Deposit
  const handleDepositAction = async () => {
    if (!selectedDeposit) return;
    setProcessingAction(true);
    const finalNote = adminNote.trim() || (actionType === 'approve' ? 'Disetujui oleh admin' : 'Ditolak oleh admin');
    try {
      const res = await fetch('/api/admin/deposits/action', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          depositId: selectedDeposit.id,
          action: actionType,
          adminNote: finalNote,
          depositData: selectedDeposit
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Gagal memproses deposit', 'error');
        setProcessingAction(false);
        return;
      }

      // Sync approved/rejected deposit and user balance to Firestore immediately
      const updatedDeposit: DepositTransaction = data.deposit || {
        ...selectedDeposit,
        status: actionType === 'approve' ? 'Berhasil' : 'Ditolak',
        approvedAt: new Date().toISOString(),
        adminNote: finalNote
      };

      try {
        await setDoc(doc(db, 'deposits', selectedDeposit.id), updatedDeposit, { merge: true });
        if (actionType === 'approve' && selectedDeposit.uid) {
          await setDoc(
            doc(db, 'users', selectedDeposit.uid),
            {
              balance: increment(selectedDeposit.amount),
              updatedAt: new Date().toISOString()
            },
            { merge: true }
          );
        }
      } catch (fsErr) {
        console.warn('Firestore admin action sync warning:', fsErr);
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

  // Handle Simulate Incoming Deposit (Creates realistic test pending QRIS)
  const handleSimulateDeposit = async () => {
    try {
      const randomAmounts = [5000, 10000, 15000, 25000, 50000];
      const randomAmount = randomAmounts[Math.floor(Math.random() * randomAmounts.length)];
      const names = ['Faisal R.', 'Dika Pratama', 'Alight Editor', 'Zril Customer', 'Rendy Visual'];
      const randomName = names[Math.floor(Math.random() * names.length)];

      const res = await fetch('/api/admin/deposits/simulate', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          amount: randomAmount,
          senderName: randomName,
          email: `${randomName.toLowerCase().replace(/[\s.]+/g, '')}@gmail.com`
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Simulasi deposit baru senilai ${randomAmount.toLocaleString()} masuk!`, 'success');
        fetchAllAdminData();
        setActiveTab('deposits');
      }
    } catch (err) {
      showToast('Gagal membuat simulasi deposit.', 'error');
    }
  };

  // Handle Seed Sample Data
  const handleSeedSampleData = async () => {
    try {
      const res = await fetch('/api/admin/seed-sample-data', {
        method: 'POST',
        headers: adminHeaders
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Data transaksi dan pengguna contoh berhasil dimuat!', 'success');
        fetchAllAdminData();
      }
    } catch (err) {
      showToast('Gagal memuat data contoh.', 'error');
    }
  };

  // Handle Update User Balance (Updates Firestore directly + Backend Server)
  const handleUpdateBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const numericBalance = parseInt(newBalanceInput, 10);
    if (isNaN(numericBalance) || numericBalance < 0) {
      showToast('Nominal saldo tidak valid.', 'error');
      return;
    }

    const reasonText = balanceReason.trim() || 'Penyesuaian saldo manual oleh admin';

    try {
      // 1. Update Firestore user document directly
      await setDoc(
        doc(db, 'users', selectedUser.uid),
        {
          uid: selectedUser.uid,
          email: selectedUser.email,
          name: selectedUser.name,
          role: selectedUser.role,
          status: selectedUser.status,
          balance: numericBalance,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );

      // 2. Update backend server (hydrating user if needed)
      const res = await fetch('/api/admin/users/balance', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          uid: selectedUser.uid,
          newBalance: numericBalance,
          reason: reasonText,
          userData: selectedUser
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Gagal mengubah saldo di server', 'error');
        return;
      }

      // 3. Optimistically update local list immediately
      setUsers(prev => prev.map(u => u.uid === selectedUser.uid ? { ...u, balance: numericBalance } : u));
      showToast(`Saldo ${selectedUser.name} berhasil diubah menjadi ${numericBalance.toLocaleString()}`, 'success');
      setSelectedUser(null);
      setNewBalanceInput('');
      setBalanceReason('');
      fetchAllAdminData(true);
      refreshUserProfile();
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan saat menyimpan saldo.', 'error');
    }
  };

  // Handle Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserEmail.includes('@')) {
      showToast('Masukkan email valid.', 'error');
      return;
    }

    setCreatingUser(true);
    try {
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          email: newUserEmail.trim(),
          name: newUserName.trim() || newUserEmail.split('@')[0],
          role: newUserRole,
          initialBalance: parseInt(newUserBalance, 10) || 0
        })
      });

      const data = await res.json();
      if (res.ok) {
        // Sync new user to Firestore as well
        try {
          await setDoc(doc(db, 'users', data.user.uid), data.user, { merge: true });
        } catch {
          // ignore
        }
        showToast(`User ${data.user.name} berhasil ditambahkan!`, 'success');
        setShowCreateUserModal(false);
        setNewUserEmail('');
        setNewUserName('');
        setNewUserBalance('0');
        fetchAllAdminData();
      } else {
        showToast(data.error || 'Gagal membuat user baru.', 'error');
      }
    } catch (err) {
      showToast('Terjadi kesalahan.', 'error');
    } finally {
      setCreatingUser(false);
    }
  };

  // Handle User Status toggle (Ban / Unban)
  const handleToggleUserStatus = async (user: UserProfile) => {
    const nextStatus = user.status === 'active' ? 'banned' : 'active';
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          email: user.email,
          name: user.name,
          role: user.role,
          balance: user.balance,
          status: nextStatus,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );

      const res = await fetch('/api/admin/users/status', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          uid: user.uid,
          status: nextStatus,
          userData: user
        })
      });

      if (res.ok) {
        showToast(`Status pengguna diubah menjadi ${nextStatus.toUpperCase()}`, 'success');
        fetchAllAdminData(true);
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
  const handleToggleSetting = async (key: 'storeOpen' | 'depositOpen' | 'maintenanceMode', val: boolean) => {
    if (!settings) return;
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ [key]: val })
      });

      if (res.ok) {
        setSettings(prev => prev ? { ...prev, [key]: val } : null);
        showToast(`Pengaturan diubah: ${key} = ${val ? 'Aktif' : 'Nonaktif'}`, 'success');
      }
    } catch (err) {
      showToast('Gagal mengubah pengaturan', 'error');
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
        showToast('Konfigurasi API berhasil disimpan!', 'success');
        fetchAllAdminData();
      }
    } catch (err) {
      showToast('Gagal menyimpan konfigurasi API.', 'error');
    }
  };

  // Handle Test API Connection
  const handleTestApi = async (type: 'bulk' | 'send' | 'verif') => {
    setTestingApi(true);
    setTestResult(null);

    const url =
      type === 'bulk'
        ? settings?.apiConfiguration?.bulkApiUrl
        : type === 'send'
          ? settings?.apiConfiguration?.sendApiUrl
          : settings?.apiConfiguration?.verifApiUrl;
    const apiKey =
      type === 'bulk'
        ? settings?.apiConfiguration?.bulkApiKey
        : type === 'send'
          ? settings?.apiConfiguration?.sendApiKey
          : settings?.apiConfiguration?.verifApiKey;

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

  // Handle Export CSV
  const handleExportCSV = () => {
    const rows = [
      ['Tipe', 'ID', 'Pengguna/Email', 'Nominal/Harga', 'Status', 'Tanggal'],
      ...deposits.map(d => ['DEPOSIT', d.id, d.userEmail, d.amount.toString(), d.status, d.createdAt]),
      ...orders.map(o => ['ORDER', o.id, o.email, o.totalPrice.toString(), o.status, o.createdAt])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AM_PREMIUM_REPORT_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Laporan transaksi berhasil diunduh (CSV)!', 'success');
  };

  // Handle Clear Audit Logs
  const handleClearAuditLogs = async () => {
    if (!confirm('Apakah Anda yakin ingin mengosongkan semua audit log?')) return;
    try {
      const res = await fetch('/api/admin/audit-logs/clear', {
        method: 'POST',
        headers: adminHeaders
      });
      if (res.ok) {
        setAuditLogs([]);
        showToast('Audit log berhasil dibersihkan.', 'success');
      }
    } catch (err) {
      showToast('Gagal membersihkan log.', 'error');
    }
  };

  // Handle Manual Order Status Change
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: 'Berhasil' | 'Gagal' | 'Sedang diproses') => {
    try {
      const res = await fetch('/api/admin/orders/status', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ orderId, status: nextStatus })
      });
      if (res.ok) {
        showToast(`Status order ${orderId} diubah menjadi ${nextStatus}`, 'success');
        fetchAllAdminData();
      }
    } catch (err) {
      showToast('Gagal mengubah status order', 'error');
    }
  };

  // =========================================================================
  // VIEW: RESTRICTED ADMIN ACCESS (If user is not recognized as admin)
  // =========================================================================
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 sm:p-8 rounded-3xl bg-[#080d1e] border border-amber-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="text-center space-y-3 mb-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold font-display text-white">
            Akses Terbatas
          </h2>
          <p className="text-xs text-slate-400">
            Halaman ini khusus untuk akun dengan role Administrator. Silakan masuk menggunakan akun Admin Anda terlebih dahulu.
          </p>
        </div>

        <div className="space-y-3">
          {setParentActiveTab && (
            <button
              onClick={() => setParentActiveTab('home')}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all cursor-pointer"
            >
              Kembali ke Beranda
            </button>
          )}
        </div>
      </div>
    );
  }

  // Filtered lists
  const pendingDeposits = deposits.filter(d => d.status === 'Menunggu Konfirmasi Admin');
  
  const filteredDeposits = deposits.filter(d => {
    const matchFilter = depositFilter === 'all' ? true : d.status === depositFilter;
    const matchSearch = !depositSearch 
      ? true 
      : d.id.toLowerCase().includes(depositSearch.toLowerCase()) ||
        d.userEmail.toLowerCase().includes(depositSearch.toLowerCase()) ||
        d.senderName.toLowerCase().includes(depositSearch.toLowerCase());
    return matchFilter && matchSearch;
  });

  const filteredUsers = users.filter(u => {
    return !userSearch 
      ? true 
      : u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.uid.toLowerCase().includes(userSearch.toLowerCase());
  });

  const filteredOrders = orders.filter(o => {
    const matchFilter = orderFilter === 'all' ? true : o.status === orderFilter;
    const matchSearch = !orderSearch
      ? true
      : o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.email.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.productName.toLowerCase().includes(orderSearch.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="space-y-6 pb-24 md:pb-8 max-w-7xl mx-auto">
      {/* Top Banner & Control Ribbon */}
      <div className="bg-gradient-to-r from-amber-950/40 via-[#0a1027] to-blue-950/40 p-5 sm:p-6 rounded-3xl border border-amber-500/20 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                Pusat kendali operasional, mutasi deposit QRIS, akun pengguna, harga layanan, dan integrasi API server.
              </p>
            </div>
          </div>

          {/* Quick Action Ribbon */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSimulateDeposit}
              className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Buat simulasi deposit QRIS masuk untuk ditinjau"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulasi Deposit</span>
            </button>

            <button
              onClick={handleSeedSampleData}
              className="px-3 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Isi data contoh pengguna & transaksi jika sistem kosong"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>Isi Data Contoh</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Download rekap transaksi format CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => fetchAllAdminData()}
              className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'dashboard', label: 'Ringkasan', icon: TrendingUp },
          { id: 'deposits', label: `Deposit (${pendingDeposits.length} pending)`, icon: Wallet, highlight: pendingDeposits.length > 0 },
          { id: 'users', label: `Pengguna (${users.length})`, icon: Users },
          { id: 'orders', label: `Semua Order (${orders.length})`, icon: ShoppingBag },
          { id: 'products', label: 'Produk & Harga', icon: Edit },
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
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
              <span className="text-xs text-slate-400">Total Pengguna (Firebase)</span>
              <div className="text-2xl font-bold font-display text-white">
                {users.length} <span className="text-xs font-normal text-slate-500">Akun</span>
              </div>
              <div className="text-[10px] text-cyan-400">Tersinkronisasi dengan Firestore</div>
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
              <div className="text-[10px] text-cyan-400">{stats.successfulOrders} pesanan selesai</div>
            </div>

            <div className="p-5 rounded-3xl bg-[#080d1e] border border-blue-500/20 space-y-1">
              <span className="text-xs text-slate-400">Total Transaksi</span>
              <div className="text-2xl font-bold font-display text-white">
                {stats.totalTransactions} <span className="text-xs font-normal text-slate-500">Aktivitas</span>
              </div>
              <div className="text-[10px] text-slate-400">Order & Deposit</div>
            </div>

            <div className="p-5 rounded-3xl bg-[#080d1e] border border-rose-500/30 bg-rose-950/20 space-y-1">
              <span className="text-xs text-slate-400">Deposit Menunggu Konfirmasi</span>
              <div className="text-2xl font-bold font-display text-amber-400">
                {pendingDeposits.length} <span className="text-xs font-normal text-slate-500">Permintaan</span>
              </div>
              <button
                onClick={() => setActiveTab('deposits')}
                className="text-[10px] text-amber-400 underline font-semibold cursor-pointer"
              >
                Tinjau sekarang
              </button>
            </div>

            <div className="p-5 rounded-3xl bg-[#080d1e] border border-blue-500/20 space-y-1">
              <span className="text-xs text-slate-400">Status Operasional Toko</span>
              <div className="text-xl font-bold font-display text-white flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${settings?.storeOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                <span>{settings?.storeOpen ? 'Toko Buka' : 'Toko Tutup'}</span>
              </div>
              <div className="text-[10px] text-slate-400">
                Deposit QRIS: {settings?.depositOpen ? 'Buka' : 'Tutup'}
              </div>
            </div>
          </div>

          {/* Pending Alert Banner */}
          {pendingDeposits.length > 0 && (
            <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Ada {pendingDeposits.length} Permintaan Deposit Menunggu Persetujuan
                  </h3>
                  <p className="text-xs text-amber-200/80">
                    Cek mutasi QRIS Anda dan klik "Setujui" untuk menambahkan saldo pengguna secara otomatis.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('deposits')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-500/20 shrink-0 cursor-pointer"
              >
                Buka Manajemen Deposit
              </button>
            </div>
          )}

          {/* Quick Action Switches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-[#080d1e] border border-blue-500/20 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Status Penerimaan Pesanan</h4>
                <p className="text-xs text-slate-400">Matikan jika stok akun sedang habis atau server maintenance.</p>
              </div>
              <button
                onClick={() => handleToggleSetting('storeOpen', !settings?.storeOpen)}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  settings?.storeOpen
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                }`}
              >
                {settings?.storeOpen ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                <span>{settings?.storeOpen ? 'Toko Buka' : 'Toko Tutup'}</span>
              </button>
            </div>

            <div className="p-5 rounded-3xl bg-[#080d1e] border border-blue-500/20 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Status Deposit QRIS</h4>
                <p className="text-xs text-slate-400">Kendalikan akses pembayaran QRIS Toko Kelontong Zril Store.</p>
              </div>
              <button
                onClick={() => handleToggleSetting('depositOpen', !settings?.depositOpen)}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  settings?.depositOpen
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                }`}
              >
                {settings?.depositOpen ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                <span>{settings?.depositOpen ? 'Deposit Buka' : 'Deposit Tutup'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: MANAJEMEN DEPOSIT
         ========================================================================= */}
      {activeTab === 'deposits' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold font-display text-white">
                Daftar Permintaan Deposit ({deposits.length})
              </h2>
              <p className="text-xs text-slate-400">Verifikasi mutasi QRIS Zril Store dan setujui untuk top-up saldo pengguna.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSimulateDeposit}
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Simulasi Deposit Baru</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={depositSearch}
                onChange={(e) => setDepositSearch(e.target.value)}
                placeholder="Cari ID Deposit, Email, atau Nama Pengirim..."
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {['all', 'Menunggu Konfirmasi Admin', 'Berhasil', 'Ditolak'].map((st) => (
                <button
                  key={st}
                  onClick={() => setDepositFilter(st)}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    depositFilter === st ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st === 'all' ? 'Semua' : st === 'Menunggu Konfirmasi Admin' ? 'Pending' : st}
                </button>
              ))}
            </div>
          </div>

          {filteredDeposits.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#080d1e] border border-slate-800 text-xs text-slate-400 space-y-3">
              <p>Belum ada permintaan deposit yang sesuai filter.</p>
              <button
                onClick={handleSimulateDeposit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Buat Simulasi Deposit Pertama</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDeposits.map((dep) => {
                const isPending = dep.status === 'Menunggu Konfirmasi Admin';
                const isApproved = dep.status === 'Berhasil';

                return (
                  <div
                    key={dep.id}
                    className={`rounded-2xl border p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all ${
                      isPending 
                        ? 'bg-amber-950/20 border-amber-500/40 shadow-md shadow-amber-950/20' 
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
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse' 
                            : isApproved 
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                            : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                        }`}>
                          {dep.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300">
                        Nama Pengirim: <strong className="text-white">{dep.senderName}</strong> · Email: <span className="font-mono text-cyan-300">{dep.userEmail}</span>
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
                              setAdminNote('Pembayaran QRIS Toko Kelontong Zril Store terkonfirmasi.');
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Setujui</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedDeposit(dep);
                              setActionType('reject');
                              setAdminNote('Mutasi tidak ditemukan di mutasi QRIS.');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold font-display text-white">
                Daftar Pengguna Terdaftar ({users.length})
              </h2>
              <p className="text-xs text-slate-400">Ubah role (User/Admin) tersinkronisasi langsung ke Firestore console.</p>
            </div>

            <button
              onClick={() => setShowCreateUserModal(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-600/20"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Tambah User Baru</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Cari Pengguna berdasarkan Nama, Email, atau UID..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="overflow-x-auto rounded-3xl border border-blue-500/20 bg-[#080d1e]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3.5 font-semibold">Pengguna / Email</th>
                  <th className="p-3.5 font-semibold">UID</th>
                  <th className="p-3.5 font-semibold">Saldo</th>
                  <th className="p-3.5 font-semibold">Role (Firestore)</th>
                  <th className="p-3.5 font-semibold">Status</th>
                  <th className="p-3.5 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {filteredUsers.map((u) => (
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
                          await changeUserRole(u.uid, newRole, u);
                          showToast(`Role ${u.name} diubah menjadi ${newRole.toUpperCase()} (Tersinkron ke Firestore)`, 'success');
                          fetchAllAdminData(true);
                        }}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
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
                        className="px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600 text-cyan-300 hover:text-white font-semibold text-[11px] transition-all cursor-pointer"
                      >
                        Edit Saldo
                      </button>

                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
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
          TAB 4: SEMUA ORDER TRANSAKSI
         ========================================================================= */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold font-display text-white">
                Daftar Semua Pesanan ({orders.length})
              </h2>
              <p className="text-xs text-slate-400">Seluruh transaksi pembelian layanan Bulk AM dan verifikasi link.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Cari ID Pesanan, Akun, atau Nama Produk..."
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {['all', 'Berhasil', 'Sedang diproses', 'Gagal'].map((st) => (
                <button
                  key={st}
                  onClick={() => setOrderFilter(st)}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    orderFilter === st ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st === 'all' ? 'Semua' : st}
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#080d1e] border border-slate-800 text-xs text-slate-400">
              Belum ada pesanan yang sesuai filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-4 rounded-2xl bg-[#080d1e] border border-blue-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-cyan-300 font-bold text-xs">{ord.id}</span>
                      <span className="text-xs font-semibold text-white">({ord.productName})</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        ord.status === 'Berhasil'
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : ord.status === 'Gagal'
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                          : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      }`}>
                        {ord.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300">
                      Rincian: <span className="font-mono text-cyan-200">{ord.email}</span> · Jumlah: {ord.quantity} unit
                    </div>

                    <div className="text-[11px] text-slate-500">
                      Waktu Order: {new Date(ord.createdAt).toLocaleString('id-ID')}
                      {ord.errorNote && <span className="text-amber-300 ml-2">Note: {ord.errorNote}</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                    <div className="font-display font-extrabold text-white text-sm">
                      {ord.totalPrice.toLocaleString()}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleUpdateOrderStatus(ord.id, ord.status === 'Berhasil' ? 'Gagal' : 'Berhasil')}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] text-slate-300 hover:text-white cursor-pointer"
                        title="Ubah status manual"
                      >
                        Ubah Status
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 5: MANAJEMEN PRODUK & HARGA
         ========================================================================= */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold font-display text-white">
                Manajemen Produk & Harga
              </h2>
              <p className="text-xs text-slate-400">Ubah tarif harga dasar akun Bulk AM dan biaya verifikasi link.</p>
            </div>
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
                <div className="w-full aspect-[16/8] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 relative">
                  <img 
                    src={prod.image || 'https://cdn.corenexis.com/f/hUimw94N.webp'} 
                    alt={prod.name} 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/product-banner.webp';
                    }}
                  />
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-bold text-cyan-300 border border-white/10">
                    Tarif Sekarang: {prod.price.toLocaleString()}
                  </div>
                </div>

                {/* Edit Form */}
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Harga Satuan (Angka Murni):</label>
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
                    <label className="block text-[11px] text-slate-400 mb-1">URL Banner Horizontal Produk:</label>
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
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-600/20 cursor-pointer"
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
          TAB 6: PENGATURAN API
         ========================================================================= */}
      {activeTab === 'api' && settings && (
        <div className="space-y-6">
          <div className="bg-[#080d1e] border border-blue-500/20 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold font-display text-white">
                  Konfigurasi API Eksternal AM
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Endpoint server backend dapjisync terenkripsi dan terlindungi di sisi server.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowApiKeys(!showApiKeys)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 self-start cursor-pointer"
              >
                {showApiKeys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showApiKeys ? 'Sembunyikan Key' : 'Tampilkan Key'}</span>
              </button>
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
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Play className="w-3 h-3 text-cyan-400" />
                    <span>Tes Ping Bulk</span>
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
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Header x-apikey:</label>
                  <input
                    type={showApiKeys ? "text" : "password"}
                    value={settings.apiConfiguration?.bulkApiKey || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings(prev => prev ? {
                        ...prev,
                        apiConfiguration: { ...prev.apiConfiguration, bulkApiKey: val }
                      } : null);
                    }}
                    placeholder="Masukkan API Key Bulk..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* SEND GMAIL API CONFIG */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-cyan-300">2. Konfigurasi API Send Gmail (Verif)</h3>
                  <button
                    type="button"
                    onClick={() => handleTestApi('send')}
                    disabled={testingApi}
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Play className="w-3 h-3 text-cyan-400" />
                    <span>Tes Ping Send</span>
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Endpoint POST URL:</label>
                  <input
                    type="text"
                    value={settings.apiConfiguration?.sendApiUrl || 'https://am.dapjisync.my.id/api/send'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings(prev => prev ? {
                        ...prev,
                        apiConfiguration: { ...prev.apiConfiguration, sendApiUrl: val }
                      } : null);
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Header x-apikey:</label>
                  <input
                    type={showApiKeys ? "text" : "password"}
                    value={settings.apiConfiguration?.sendApiKey || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings(prev => prev ? {
                        ...prev,
                        apiConfiguration: { ...prev.apiConfiguration, sendApiKey: val }
                      } : null);
                    }}
                    placeholder="Masukkan API Key Send Gmail..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* VERIF API CONFIG */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-cyan-300">3. Konfigurasi API Verif Gmail</h3>
                  <button
                    type="button"
                    onClick={() => handleTestApi('verif')}
                    disabled={testingApi}
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Play className="w-3 h-3 text-cyan-400" />
                    <span>Tes Ping Verif</span>
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
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Header x-apikey:</label>
                  <input
                    type={showApiKeys ? "text" : "password"}
                    value={settings.apiConfiguration?.verifApiKey || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings(prev => prev ? {
                        ...prev,
                        apiConfiguration: { ...prev.apiConfiguration, verifApiKey: val }
                      } : null);
                    }}
                    placeholder="Masukkan API Key Verif..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>

              {testResult && (
                <div className={`p-4 rounded-2xl border text-xs font-mono ${
                  testResult.success ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                }`}>
                  <div className="font-bold mb-1">Hasil Pengujian Ping:</div>
                  <div>Status Code: {testResult.statusCode || 'N/A'}</div>
                  <div>Latency: {testResult.durationMs ? `${testResult.durationMs}ms` : 'Timeout / Error'}</div>
                  {testResult.error && <div>Pesan Error: {testResult.error}</div>}
                </div>
              )}

              <button
                type="submit"
                className="py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
              >
                Simpan Seluruh Konfigurasi API
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 7: STATUS TOKO & QRIS
         ========================================================================= */}
      {activeTab === 'store' && settings && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-[#080d1e] border border-blue-500/20 space-y-4">
              <h3 className="text-base font-bold font-display text-white">
                Kontrol Saklar Operasional
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white block">Penerimaan Pesanan</span>
                    <span className="text-[11px] text-slate-400">Izinkan pengguna melakukan pembelian Bulk AM & Verif.</span>
                  </div>
                  <button
                    onClick={() => handleToggleSetting('storeOpen', !settings.storeOpen)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${
                      settings.storeOpen ? 'bg-emerald-600 text-white' : 'bg-rose-900 text-rose-200'
                    }`}
                  >
                    {settings.storeOpen ? 'Buka' : 'Tutup'}
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white block">Pengajuan Deposit QRIS</span>
                    <span className="text-[11px] text-slate-400">Izinkan pengguna melakukan transfer & deposit saldo.</span>
                  </div>
                  <button
                    onClick={() => handleToggleSetting('depositOpen', !settings.depositOpen)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${
                      settings.depositOpen ? 'bg-emerald-600 text-white' : 'bg-rose-900 text-rose-200'
                    }`}
                  >
                    {settings.depositOpen ? 'Buka' : 'Tutup'}
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white block">Mode Pemeliharaan (Maintenance)</span>
                    <span className="text-[11px] text-slate-400">Tampilkan pengumuman pemeliharaan server.</span>
                  </div>
                  <button
                    onClick={() => handleToggleSetting('maintenanceMode', !settings.maintenanceMode)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${
                      settings.maintenanceMode ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {settings.maintenanceMode ? 'Aktif' : 'Nonaktif'}
                  </button>
                </div>
              </div>
            </div>

            {/* Merchant QRIS Preview */}
            <div className="p-6 rounded-3xl bg-[#080d1e] border border-blue-500/20 space-y-4">
              <h3 className="text-base font-bold font-display text-white">
                Merchant QRIS Aktif
              </h3>

              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-2xl bg-white p-1.5 overflow-hidden shrink-0 shadow-lg">
                  <img
                    src="https://cdn.phototourl.com/member/2026-11-10-5a092aa1-5330-4068-a112-233f093bfe0b.png"
                    alt="QRIS Merchant"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="space-y-1 text-xs">
                  <div className="text-slate-400">Nama Merchant:</div>
                  <div className="font-bold text-white text-sm">Toko Kelontong Zril Store</div>
                  <div className="text-slate-400 pt-1">Minimal Deposit:</div>
                  <div className="font-bold text-cyan-300">500</div>
                  <div className="text-[10px] text-emerald-400">✓ Bebas biaya admin & instan konfirmasi</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 8: AUDIT LOG
         ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold font-display text-white">
                Catatan Aktivitas Admin (Audit Trail)
              </h2>
              <p className="text-xs text-slate-400">Rekap riwayat persetujuan deposit, perubahan saldo, status role, dan pengaturan.</p>
            </div>

            <button
              onClick={handleClearAuditLogs}
              className="px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900 border border-rose-500/30 text-xs text-rose-300 transition-all cursor-pointer"
            >
              Bersihkan Log
            </button>
          </div>

          <div className="rounded-3xl border border-blue-500/20 bg-[#080d1e] divide-y divide-slate-800/80 max-h-[500px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Belum ada aktivitas admin tercatat.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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

      {/* =========================================================================
          MODAL: APPROVE / REJECT DEPOSIT
         ========================================================================= */}
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
                className="py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDepositAction}
                disabled={processingAction}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs text-white transition-all cursor-pointer ${
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

      {/* =========================================================================
          MODAL: EDIT USER BALANCE
         ========================================================================= */}
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
                <div className="flex items-center justify-between text-xs mb-1">
                  <label className="font-medium text-slate-300">Saldo Baru:</label>
                  <span className="text-[11px] text-slate-400">
                    Saat ini: <strong className="text-cyan-300">{selectedUser.balance.toLocaleString()}</strong>
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  value={newBalanceInput}
                  onChange={(e) => setNewBalanceInput(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-sm font-bold text-cyan-300"
                  required
                />

                {/* Quick Add / Reset Buttons */}
                <div className="grid grid-cols-5 gap-1.5 mt-2">
                  {[500, 1000, 5000, 10000].map((addVal) => (
                    <button
                      key={addVal}
                      type="button"
                      onClick={() => {
                        const cur = parseInt(newBalanceInput, 10) || 0;
                        setNewBalanceInput((cur + addVal).toString());
                      }}
                      className="py-1 px-1.5 rounded-lg bg-slate-900 hover:bg-blue-600/30 border border-slate-800 hover:border-blue-500/40 text-[10px] font-semibold text-cyan-300 cursor-pointer"
                    >
                      +{addVal >= 1000 ? `${addVal / 1000}k` : addVal}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setNewBalanceInput('0')}
                    className="py-1 px-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-600/40 border border-rose-500/30 text-[10px] font-semibold text-rose-300 cursor-pointer"
                  >
                    Set 0
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Alasan Perubahan (Opsional):
                </label>
                <input
                  type="text"
                  value={balanceReason}
                  onChange={(e) => setBalanceReason(e.target.value)}
                  placeholder="Contoh: Top-up manual / Koreksi saldo"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer"
                >
                  Simpan Saldo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CREATE NEW USER
         ========================================================================= */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-[#090e21] border border-blue-500/30 rounded-3xl p-6 shadow-2xl relative">
            <h3 className="text-base font-bold font-display text-white mb-1">
              Tambah Pengguna Baru
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Buat akun pengguna secara manual ke sistem database.
            </p>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Alamat Email:</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="user@gmail.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-white"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Nama Pengguna:</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Nama Lengkap / Editor"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Role Akun:</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-white"
                >
                  <option value="user">User Biasa</option>
                  <option value="admin">Administrator (Root)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Saldo Awal:</label>
                <input
                  type="number"
                  min="0"
                  value={newUserBalance}
                  onChange={(e) => setNewUserBalance(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-white font-bold text-cyan-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
                >
                  {creatingUser ? 'Menyimpan...' : 'Simpan User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
