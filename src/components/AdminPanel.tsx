import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from './Toast.tsx';
import { db, collection, doc, onSnapshot, setDoc, increment } from '../lib/firebase.ts';
import {
  sanitizeForFirestore,
  mergeOrders as mergeOrderLists,
  mergeDeposits as mergeDepositLists
} from '../utils/transactionSync.ts';
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
  Settings,
  Key,
  CheckCircle2,
  XCircle,
  Edit,
  RefreshCw,
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
  Sparkles,
  Database,
  Copy,
  Check,
  Terminal
} from 'lucide-react';

interface AdminPanelProps {
  setActiveTab?: (tab: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ setActiveTab: setParentActiveTab }) => {
  const { userProfile, storeSettings, refreshUserProfile, changeUserRole } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'deposits' | 'users' | 'orders' | 'products' | 'api' | 'store' | 'audit'
  >('dashboard');
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalTransactions: 0,
    totalDeposit: 0,
    totalRevenue: 0,
    successfulOrders: 0,
    pendingDeposits: 0
  });
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

  // API Settings & Documentation UI State
  const [showApiKeys, setShowApiKeys] = useState<boolean>(false);
  const [testingApi, setTestingApi] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [copiedCurlKey, setCopiedCurlKey] = useState<string | null>(null);

  // Filters & Search
  const [depositFilter, setDepositFilter] = useState<string>('all');
  const [depositSearch, setDepositSearch] = useState<string>('');
  const [userSearch, setUserSearch] = useState<string>('');
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState<string>('');

  const isAdmin =
    userProfile?.role === 'admin' ||
    userProfile?.email?.toLowerCase().trim() === 'apriliansyahazril10@gmail.com';

  const adminHeaders = {
    'Content-Type': 'application/json',
    'x-admin-uid': userProfile?.uid || 'azryl_root_owner',
    'x-admin-email': userProfile?.email || 'apriliansyahazril10@gmail.com'
  };

  const [apiDeposits, setApiDeposits] = useState<DepositTransaction[]>([]);
  const [fsDeposits, setFsDeposits] = useState<DepositTransaction[]>([]);
  const [apiOrders, setApiOrders] = useState<OrderTransaction[]>([]);
  const [fsOrders, setFsOrders] = useState<OrderTransaction[]>([]);
  const [apiUsers, setApiUsers] = useState<UserProfile[]>([]);
  const [fsUsers, setFsUsers] = useState<UserProfile[]>([]);
  const [hasLoadedFsUsers, setHasLoadedFsUsers] = useState<boolean>(false);

  useEffect(() => {
    setDeposits(mergeDepositLists(apiDeposits, fsDeposits));
  }, [apiDeposits, fsDeposits]);

  useEffect(() => {
    setOrders(mergeOrderLists(apiOrders, fsOrders));
  }, [apiOrders, fsOrders]);

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
      const results = await Promise.allSettled([
        fetch('/api/admin/stats', { headers: adminHeaders }),
        fetch('/api/admin/deposits', { headers: adminHeaders }),
        fetch('/api/admin/users', { headers: adminHeaders }),
        fetch('/api/products'),
        fetch('/api/admin/orders', { headers: adminHeaders }),
        fetch('/api/admin/settings', { headers: adminHeaders }),
        fetch('/api/admin/audit-logs', { headers: adminHeaders })
      ]);

      const getJsonIfOk = async (idx: number) => {
        const result = results[idx];
        if (result.status === 'fulfilled' && result.value.ok) {
          return result.value.json();
        }
        return null;
      };

      const [statsData, depData, userData, prodData, ordData, setData, audData] = await Promise.all([
        getJsonIfOk(0),
        getJsonIfOk(1),
        getJsonIfOk(2),
        getJsonIfOk(3),
        getJsonIfOk(4),
        getJsonIfOk(5),
        getJsonIfOk(6)
      ]);

      if (statsData) setStats(statsData);
      if (depData) setApiDeposits(depData);
      if (userData) setApiUsers(userData);
      if (prodData) setProducts(prodData);
      if (ordData) setApiOrders(ordData);
      if (setData) setSettings(setData);
      if (audData) setAuditLogs(audData);
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

    const unsubDeposits = onSnapshot(
      collection(db, 'deposits'),
      (snapshot) => {
        const list: DepositTransaction[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as DepositTransaction;
          if (data && (data.id || docSnap.id)) {
            list.push({ ...data, id: data.id || docSnap.id });
          }
        });
        setFsDeposits(list);
      },
      () => {}
    );

    const unsubOrders = onSnapshot(
      collection(db, 'orders'),
      (snapshot) => {
        const list: OrderTransaction[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as OrderTransaction;
          if (data && (data.id || docSnap.id)) {
            list.push({ ...data, id: data.id || docSnap.id });
          }
        });
        setFsOrders(list);
      },
      () => {}
    );

    const interval = setInterval(() => {
      fetchAllAdminData(true);
    }, 5000);

    return () => {
      unsubUsers();
      unsubDeposits();
      unsubOrders();
      clearInterval(interval);
    };
  }, [userProfile?.uid, userProfile?.role, isAdmin]);

  const handleDepositAction = async () => {
    if (!selectedDeposit) return;
    setProcessingAction(true);
    const depositToProcess = selectedDeposit;
    const currentAction = actionType;
    const finalNote =
      adminNote.trim() ||
      (currentAction === 'approve' ? 'Disetujui oleh admin' : 'Ditolak oleh admin');

    const normalizedDepositEmail = (depositToProcess.userEmail || '').toLowerCase().trim();
    const targetUser = users.find(
      (u) =>
        u.uid === depositToProcess.uid ||
        (normalizedDepositEmail && u.email?.toLowerCase().trim() === normalizedDepositEmail)
    );
    const targetUid = targetUser?.uid || depositToProcess.uid;
    const baseBalance = typeof targetUser?.balance === 'number' ? targetUser.balance : undefined;

    const applyLocalAndFirestore = async (
      updatedDeposit: DepositTransaction,
      newBalanceFromServer?: number,
      alreadyProcessed?: boolean
    ) => {
      try {
        await setDoc(
          doc(db, 'deposits', depositToProcess.id),
          sanitizeForFirestore(updatedDeposit),
          { merge: true }
        );
      } catch (fsErr) {
        console.warn('Firestore deposit status sync warning:', fsErr);
      }

      const computedFinalBalance =
        typeof newBalanceFromServer === 'number'
          ? newBalanceFromServer
          : currentAction === 'approve' && baseBalance !== undefined
          ? baseBalance + Number(depositToProcess.amount || 0)
          : undefined;

      if (currentAction === 'approve' && targetUid && !alreadyProcessed) {
        try {
          if (computedFinalBalance !== undefined) {
            await setDoc(
              doc(db, 'users', targetUid),
              sanitizeForFirestore({
                uid: targetUid,
                email: (targetUser?.email || depositToProcess.userEmail || '').toLowerCase().trim(),
                name: targetUser?.name || depositToProcess.senderName || 'Member AM',
                role: targetUser?.role || 'user',
                status: targetUser?.status || 'active',
                balance: computedFinalBalance,
                updatedAt: new Date().toISOString()
              }),
              { merge: true }
            );
          } else {
            await setDoc(
              doc(db, 'users', targetUid),
              {
                balance: increment(Number(depositToProcess.amount || 0)),
                updatedAt: new Date().toISOString()
              },
              { merge: true }
            );
          }
        } catch (fsUserErr) {
          console.warn('Firestore user balance sync warning:', fsUserErr);
        }
      }

      setApiDeposits((prev) => {
        const exists = prev.some((d) => d.id === updatedDeposit.id);
        return exists
          ? prev.map((d) => (d.id === updatedDeposit.id ? updatedDeposit : d))
          : [updatedDeposit, ...prev];
      });
      setFsDeposits((prev) => {
        const exists = prev.some((d) => d.id === updatedDeposit.id);
        return exists
          ? prev.map((d) => (d.id === updatedDeposit.id ? updatedDeposit : d))
          : [updatedDeposit, ...prev];
      });

      if (currentAction === 'approve' && targetUid && !alreadyProcessed && computedFinalBalance !== undefined) {
        setApiUsers((prev) =>
          prev.map((u) => (u.uid === targetUid ? { ...u, balance: computedFinalBalance } : u))
        );
        setFsUsers((prev) =>
          prev.map((u) => (u.uid === targetUid ? { ...u, balance: computedFinalBalance } : u))
        );
      }

      setSelectedDeposit(null);
      setAdminNote('');
      fetchAllAdminData(true);
      refreshUserProfile();
    };

    const callDepositActionApi = () =>
      fetch('/api/admin/deposits/action', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          depositId: depositToProcess.id,
          action: currentAction,
          adminNote: finalNote,
          depositData: depositToProcess,
          currentBalance: baseBalance
        })
      });

    try {
      let res = await callDepositActionApi();

      if (res.status === 403 && isAdmin && userProfile) {
        await fetch('/api/user/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: userProfile.uid,
            email: userProfile.email,
            name: userProfile.name,
            photoURL: userProfile.photoURL || '',
            balance: userProfile.balance,
            role: 'admin',
            status: userProfile.status || 'active'
          })
        }).catch(() => {});
        res = await callDepositActionApi();
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status >= 400 && res.status < 500 && res.status !== 404) {
          showToast(data.error || 'Gagal memproses deposit.', 'error');
          return;
        }
        throw new Error(data.error || `Server error (${res.status})`);
      }

      const updatedDeposit: DepositTransaction = data.deposit || {
        ...depositToProcess,
        status: currentAction === 'approve' ? 'Berhasil' : 'Ditolak',
        approvedAt: new Date().toISOString(),
        adminNote: finalNote
      };

      await applyLocalAndFirestore(updatedDeposit, data.newBalance, Boolean(data.alreadyProcessed));
      showToast(
        data.message ||
          (currentAction === 'approve'
            ? 'Deposit berhasil disetujui & saldo ditambahkan.'
            : 'Deposit berhasil ditolak.'),
        'success'
      );
    } catch (err) {
      console.warn('Admin deposit action fallback to direct Firestore sync:', err);
      const fallbackDeposit: DepositTransaction = {
        ...depositToProcess,
        status: currentAction === 'approve' ? 'Berhasil' : 'Ditolak',
        approvedAt: new Date().toISOString(),
        adminNote: finalNote
      };
      const alreadySameStatus = depositToProcess.status === fallbackDeposit.status;
      await applyLocalAndFirestore(fallbackDeposit, undefined, alreadySameStatus);
      showToast(
        currentAction === 'approve'
          ? 'Deposit disetujui & saldo pengguna diperbarui via Firestore.'
          : 'Deposit berhasil ditolak via Firestore.',
        'success'
      );
    } finally {
      setProcessingAction(false);
    }
  };

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

      if (res.ok) {
        showToast(`Simulasi deposit baru senilai ${randomAmount.toLocaleString()} masuk!`, 'success');
        fetchAllAdminData();
        setActiveTab('deposits');
      }
    } catch (err) {
      showToast('Gagal membuat simulasi deposit.', 'error');
    }
  };

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

      setUsers((prev) =>
        prev.map((u) => (u.uid === selectedUser.uid ? { ...u, balance: numericBalance } : u))
      );
      showToast(
        `Saldo ${selectedUser.name} berhasil diubah menjadi ${numericBalance.toLocaleString()}`,
        'success'
      );
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
        try {
          await setDoc(doc(db, 'users', data.user.uid), sanitizeForFirestore(data.user), { merge: true });
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

  const handleToggleSetting = async (
    key: 'storeOpen' | 'depositOpen' | 'maintenanceMode',
    val: boolean
  ) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ [key]: val })
      });

      if (res.ok) {
        const resData = await res.json().catch(() => ({}));
        setSettings((prev) =>
          resData.settings || (prev ? { ...prev, [key]: val } : null)
        );
        showToast(`Pengaturan diubah: ${key} = ${val ? 'Aktif' : 'Nonaktif'}`, 'success');
      }
    } catch (err) {
      showToast('Gagal mengubah pengaturan', 'error');
    }
  };

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

  const handleCopyCurl = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedCurlKey(key);
    showToast('Contoh cURL disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedCurlKey((prev) => (prev === key ? null : prev)), 2000);
  };

  const handleExportCSV = () => {
    const rows = [
      ['Tipe', 'ID', 'Pengguna/Email', 'Nominal/Harga', 'Status', 'Tanggal'],
      ...deposits.map((d) => ['DEPOSIT', d.id, d.userEmail, d.amount.toString(), d.status, d.createdAt]),
      ...orders.map((o) => ['ORDER', o.id, o.email, o.totalPrice.toString(), o.status, o.createdAt])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AM_PREMIUM_REPORT_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Laporan transaksi berhasil diunduh (CSV)!', 'success');
  };

  const handleClearAuditLogs = async () => {
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

  const handleUpdateOrderStatus = async (
    orderId: string,
    nextStatus: 'Berhasil' | 'Gagal' | 'Sedang diproses'
  ) => {
    const existingOrder = orders.find((o) => o.id === orderId);
    try {
      const res = await fetch('/api/admin/orders/status', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ orderId, status: nextStatus, orderData: existingOrder })
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const updatedOrder = data.order || (existingOrder ? {
          ...existingOrder,
          status: nextStatus,
          ...(nextStatus === 'Berhasil' || nextStatus === 'Gagal'
            ? { completedAt: new Date().toISOString() }
            : {})
        } : null);

        if (updatedOrder) {
          await setDoc(
            doc(db, 'orders', orderId),
            sanitizeForFirestore(updatedOrder),
            { merge: true }
          ).catch(() => {});
        }

        showToast(`Status order ${orderId} diubah menjadi ${nextStatus}`, 'success');
        fetchAllAdminData(true);
      }
    } catch (err) {
      showToast('Gagal mengubah status order', 'error');
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 sm:p-8 rounded-2xl bg-[#1C1E24] border border-white/10 shadow-[0_14px_40px_rgba(0,0,0,0.45)]">
        <div className="text-center space-y-3 mb-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] border border-blue-400/30 shadow-[0_8px_24px_rgba(37,99,235,0.35)] flex items-center justify-center text-white">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black font-display text-white">Akses Terbatas</h2>
          <p className="text-xs font-medium text-slate-400 leading-relaxed">
            Halaman ini khusus untuk akun dengan role Administrator. Silakan masuk menggunakan akun Admin Anda terlebih dahulu.
          </p>
        </div>

        {setParentActiveTab && (
          <button
            onClick={() => setParentActiveTab('home')}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] text-white font-extrabold text-xs nb-btn cursor-pointer"
          >
            Kembali ke Beranda
          </button>
        )}
      </div>
    );
  }

  const pendingDeposits = deposits.filter((d) => d.status === 'Menunggu Konfirmasi Admin');

  const displayStats = useMemo<DashboardStats>(() => {
    const hasMergedTx = orders.length > 0 || deposits.length > 0;
    const totalDeposit = hasMergedTx
      ? deposits
          .filter((d) => d.status === 'Berhasil')
          .reduce((sum, d) => sum + (Number(d.amount) || 0), 0)
      : stats.totalDeposit;
    const totalRevenue = hasMergedTx
      ? orders
          .filter((o) => o.status === 'Berhasil')
          .reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0)
      : stats.totalRevenue;
    const successfulOrders = hasMergedTx
      ? orders.filter((o) => o.status === 'Berhasil').length
      : stats.successfulOrders;
    const totalTransactions = hasMergedTx
      ? orders.length + deposits.length
      : stats.totalTransactions;

    return {
      totalUsers: users.length > 0 ? users.length : stats.totalUsers,
      totalTransactions,
      totalDeposit,
      totalRevenue,
      successfulOrders,
      pendingDeposits: deposits.length > 0 ? pendingDeposits.length : stats.pendingDeposits
    };
  }, [users.length, orders, deposits, pendingDeposits.length, stats]);

  const effectiveStoreOpen = settings?.storeOpen ?? storeSettings?.storeOpen ?? true;
  const effectiveDepositOpen = settings?.depositOpen ?? storeSettings?.depositOpen ?? true;

  const filteredDeposits = deposits.filter((d) => {
    const matchFilter = depositFilter === 'all' ? true : d.status === depositFilter;
    const matchSearch = !depositSearch
      ? true
      : d.id.toLowerCase().includes(depositSearch.toLowerCase()) ||
        d.userEmail.toLowerCase().includes(depositSearch.toLowerCase()) ||
        d.senderName.toLowerCase().includes(depositSearch.toLowerCase());
    return matchFilter && matchSearch;
  });

  const filteredUsers = users.filter((u) => {
    return !userSearch
      ? true
      : u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.uid.toLowerCase().includes(userSearch.toLowerCase());
  });

  const filteredOrders = orders.filter((o) => {
    const matchFilter = orderFilter === 'all' ? true : o.status === orderFilter;
    const matchSearch = !orderSearch
      ? true
      : o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.email.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.productName.toLowerCase().includes(orderSearch.toLowerCase());
    return matchFilter && matchSearch;
  });

  const bulkCurlExample = `curl -X POST ${settings?.apiConfiguration?.bulkApiUrl || 'https://am.dapjisync.my.id/api/bulk'} \\\n  -H "Content-Type: application/json" \\\n  -H "x-apikey: ${settings?.apiConfiguration?.bulkApiKey || ''}" \\\n  -d '{"total":1,"provider":"akunlama"}'`;
  const sendCurlExample = `curl -X POST ${settings?.apiConfiguration?.sendApiUrl || 'https://am.dapjisync.my.id/api/send'} \\\n  -H "Content-Type: application/json" \\\n  -H "x-apikey: ${settings?.apiConfiguration?.sendApiKey || ''}" \\\n  -d '{"gmail":"user@gmail.com"}'`;
  const verifCurlExample = `curl -X POST ${settings?.apiConfiguration?.verifApiUrl || 'https://am.dapjisync.my.id/api/verif'} \\\n  -H "Content-Type: application/json" \\\n  -H "x-apikey: ${settings?.apiConfiguration?.verifApiKey || ''}" \\\n  -d '{"gmail":"user@gmail.com","link":"https://alight-creative.firebaseapp.com/__/auth/links?link=..."}'`;

  return (
    <div className="space-y-6 pb-8 max-w-7xl mx-auto">
      {/* Top Blue Gradient Admin Header */}
      <div className="md-blue-gradient p-5 sm:p-6 rounded-2xl border border-blue-300/25 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 shadow-lg flex items-center justify-center text-white shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-black/30 border border-white/15 text-sky-200">
                  PANEL ADMINISTRATOR
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-md bg-white/20 border border-white/25 text-white font-black">
                  AZRYL ROOT
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black font-display text-white mt-1.5 tracking-tight">
                AM PREMIUM Control Center
              </h1>
              <p className="text-xs font-medium text-blue-100/85 mt-0.5">
                Pusat kendali operasional, mutasi deposit QRIS, pengguna Firebase, harga layanan, dan dokumentasi API.
              </p>
            </div>
          </div>

          {/* Quick Action Ribbon */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSimulateDeposit}
              className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-bold backdrop-blur-md flex items-center gap-1.5 transition-all cursor-pointer"
              title="Buat simulasi deposit QRIS masuk untuk ditinjau"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-200" />
              <span>Simulasi Deposit</span>
            </button>

            <button
              onClick={handleSeedSampleData}
              className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-bold backdrop-blur-md flex items-center gap-1.5 transition-all cursor-pointer"
              title="Isi data contoh pengguna & transaksi jika sistem kosong"
            >
              <Database className="w-3.5 h-3.5 text-sky-200" />
              <span>Isi Data Contoh</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3 py-2 rounded-xl bg-white text-[#1D4ED8] hover:bg-blue-50 text-xs font-extrabold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              title="Download rekap transaksi format CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => fetchAllAdminData()}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white backdrop-blur-md transition-all cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {[
          { id: 'dashboard', label: 'Ringkasan', icon: TrendingUp },
          { id: 'deposits', label: `Deposit (${pendingDeposits.length} pending)`, icon: Wallet, highlight: pendingDeposits.length > 0 },
          { id: 'users', label: `Pengguna (${users.length})`, icon: Users },
          { id: 'orders', label: `Semua Order (${orders.length})`, icon: ShoppingBag },
          { id: 'products', label: 'Produk & Harga', icon: Edit },
          { id: 'api', label: 'Dokumentasi & API', icon: Key },
          { id: 'store', label: 'Status Toko', icon: Sliders },
          { id: 'audit', label: 'Audit Log', icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white border border-blue-400/40 shadow-[0_6px_18px_rgba(37,99,235,0.38)]'
                  : tab.highlight
                  ? 'bg-amber-500/15 text-amber-200 border border-amber-400/30 hover:bg-amber-500/25'
                  : 'bg-[#1C1E24] text-slate-300 border border-white/[0.08] hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          TAB 1: DASHBOARD OVERVIEW (Always rendered immediately)
         ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#1C1E24] border border-white/[0.08] shadow-[0_10px_28px_rgba(0,0,0,0.3)] space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Pengguna (Firebase)
              </span>
              <div className="text-2xl font-black font-mono text-white tabular-nums">
                {displayStats.totalUsers}{' '}
                <span className="text-xs font-sans font-semibold text-slate-400">Akun</span>
              </div>
              <div className="text-[11px] font-semibold text-sky-400">Tersinkronisasi dengan Firestore</div>
            </div>

            <div className="p-5 rounded-2xl bg-[#1C1E24] border border-emerald-400/25 shadow-[0_10px_28px_rgba(0,0,0,0.3)] space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/90">
                Total Deposit Berhasil
              </span>
              <div className="text-2xl font-black font-mono text-white tabular-nums">
                {displayStats.totalDeposit.toLocaleString()}
              </div>
              <div className="text-[11px] font-semibold text-emerald-400 font-mono">
                Rp {displayStats.totalDeposit.toLocaleString('id-ID')} masuk
              </div>
            </div>

            <div className="p-5 rounded-2xl md-blue-gradient border border-blue-300/25 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-100/90">
                Total Pendapatan (Order)
              </span>
              <div className="text-2xl font-black font-mono text-white tabular-nums">
                {displayStats.totalRevenue.toLocaleString()}
              </div>
              <div className="text-[11px] font-semibold text-blue-100">
                {displayStats.successfulOrders} pesanan selesai
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#1C1E24] border border-white/[0.08] shadow-[0_10px_28px_rgba(0,0,0,0.3)] space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Transaksi
              </span>
              <div className="text-2xl font-black font-mono text-white tabular-nums">
                {displayStats.totalTransactions}{' '}
                <span className="text-xs font-sans font-semibold text-slate-400">Aktivitas</span>
              </div>
              <div className="text-[11px] font-medium text-slate-400">Order & Deposit</div>
            </div>

            <div className="p-5 rounded-2xl bg-[#1C1E24] border border-amber-400/25 shadow-[0_10px_28px_rgba(0,0,0,0.3)] space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300/90">
                Deposit Menunggu Konfirmasi
              </span>
              <div className="text-2xl font-black font-mono text-white tabular-nums">
                {displayStats.pendingDeposits}{' '}
                <span className="text-xs font-sans font-semibold text-slate-400">Permintaan</span>
              </div>
              <button
                onClick={() => setActiveTab('deposits')}
                className="text-[11px] text-sky-400 hover:text-sky-300 underline font-bold cursor-pointer"
              >
                Tinjau sekarang
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-[#1C1E24] border border-white/[0.08] shadow-[0_10px_28px_rgba(0,0,0,0.3)] space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Status Operasional Toko
              </span>
              <div className="text-xl font-black font-display text-white flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    effectiveStoreOpen
                      ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]'
                      : 'bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.7)]'
                  }`}
                />
                <span>{effectiveStoreOpen ? 'Toko Buka' : 'Toko Tutup'}</span>
              </div>
              <div className="text-[11px] font-medium text-slate-400">
                Deposit QRIS: {effectiveDepositOpen ? 'Buka' : 'Tutup'}
              </div>
            </div>
          </div>

          {pendingDeposits.length > 0 && (
            <div className="p-5 rounded-2xl bg-blue-500/12 border border-blue-400/30 shadow-[0_8px_24px_rgba(37,99,235,0.18)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/35 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    Ada {pendingDeposits.length} Permintaan Deposit Menunggu Persetujuan
                  </h3>
                  <p className="text-xs font-medium text-slate-300 mt-0.5">
                    Cek mutasi QRIS Anda dan klik "Setujui" untuk menambahkan saldo pengguna secara otomatis.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('deposits')}
                className="px-4 py-2.5 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] text-white font-bold text-xs rounded-xl nb-btn shrink-0 cursor-pointer"
              >
                Buka Manajemen Deposit
              </button>
            </div>
          )}

          {/* Quick Action Switches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-[#1C1E24] border border-white/[0.08] flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-black text-white">Status Penerimaan Pesanan</h4>
                <p className="text-xs font-medium text-slate-400 mt-0.5">
                  Matikan jika stok akun sedang habis atau server maintenance.
                </p>
              </div>
              <button
                onClick={() => handleToggleSetting('storeOpen', !effectiveStoreOpen)}
                className={`px-4 py-2 rounded-xl font-bold text-xs border flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                  effectiveStoreOpen
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/35 hover:bg-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-400/35 hover:bg-rose-500/30'
                }`}
              >
                {effectiveStoreOpen ? (
                  <ToggleRight className="w-4 h-4" />
                ) : (
                  <ToggleLeft className="w-4 h-4" />
                )}
                <span>{effectiveStoreOpen ? 'Toko Buka' : 'Toko Tutup'}</span>
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-[#1C1E24] border border-white/[0.08] flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-black text-white">Status Deposit QRIS</h4>
                <p className="text-xs font-medium text-slate-400 mt-0.5">
                  Kendalikan akses pembayaran QRIS Toko Kelontong Zril Store.
                </p>
              </div>
              <button
                onClick={() => handleToggleSetting('depositOpen', !effectiveDepositOpen)}
                className={`px-4 py-2 rounded-xl font-bold text-xs border flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                  effectiveDepositOpen
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/35 hover:bg-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-400/35 hover:bg-rose-500/30'
                }`}
              >
                {effectiveDepositOpen ? (
                  <ToggleRight className="w-4 h-4" />
                ) : (
                  <ToggleLeft className="w-4 h-4" />
                )}
                <span>{effectiveDepositOpen ? 'Deposit Buka' : 'Deposit Tutup'}</span>
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
              <h2 className="text-base font-black font-display text-white">
                Daftar Permintaan Deposit ({deposits.length})
              </h2>
              <p className="text-xs font-medium text-slate-400">
                Verifikasi mutasi QRIS Zril Store dan setujui untuk top-up saldo pengguna.
              </p>
            </div>

            <button
              onClick={handleSimulateDeposit}
              className="px-3.5 py-2 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] text-white rounded-xl text-xs font-bold nb-btn flex items-center gap-1.5 self-start cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Simulasi Deposit Baru</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={depositSearch}
                onChange={(e) => setDepositSearch(e.target.value)}
                placeholder="Cari ID Deposit, Email, atau Nama Pengirim..."
                className="w-full pl-10 pr-4 py-2.5 nb-input rounded-xl text-xs font-medium"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#16181F] p-1 rounded-xl border border-white/[0.08] text-xs overflow-x-auto">
              {['all', 'Menunggu Konfirmasi Admin', 'Berhasil', 'Ditolak'].map((st) => (
                <button
                  key={st}
                  onClick={() => setDepositFilter(st)}
                  className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                    depositFilter === st
                      ? 'bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st === 'all' ? 'Semua' : st === 'Menunggu Konfirmasi Admin' ? 'Pending' : st}
                </button>
              ))}
            </div>
          </div>

          {filteredDeposits.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#1C1E24] border border-white/[0.08] text-xs font-semibold text-slate-400 space-y-3">
              <p>Belum ada permintaan deposit yang sesuai filter.</p>
              <button
                onClick={handleSimulateDeposit}
                className="px-4 py-2 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white font-bold rounded-xl text-xs nb-btn cursor-pointer inline-flex items-center gap-1.5"
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
                    className={`rounded-2xl border p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-[0_8px_24px_rgba(0,0,0,0.28)] ${
                      isPending
                        ? 'bg-[#1C1E24] border-blue-400/35'
                        : isApproved
                        ? 'bg-[#1C1E24] border-white/[0.08]'
                        : 'bg-[#1C1E24] border-rose-500/25'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sky-400 font-bold text-xs">{dep.id}</span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            isPending
                              ? 'bg-amber-500/15 text-amber-300 border-amber-400/30'
                              : isApproved
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                              : 'bg-rose-500/15 text-rose-300 border-rose-400/30'
                          }`}
                        >
                          {dep.status}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-slate-300">
                        Nama Pengirim: <strong className="text-white">{dep.senderName}</strong> · Email:{' '}
                        <span className="font-mono font-semibold text-slate-200">{dep.userEmail}</span>
                      </div>
                      <div className="text-[11px] font-medium text-slate-400">
                        Diajukan: {new Date(dep.createdAt).toLocaleString('id-ID')}
                        {dep.approvedAt && ` · Diproses: ${new Date(dep.approvedAt).toLocaleString('id-ID')}`}
                      </div>
                      {dep.adminNote && (
                        <div className="text-[11px] font-medium text-sky-300/90 italic">
                          Catatan: "{dep.adminNote}"
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-white/[0.08]">
                      <div className="text-left lg:text-right">
                        <div className="text-lg font-black font-mono text-sky-400 tabular-nums">
                          +{dep.amount.toLocaleString()}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400">
                          Rp {dep.amount.toLocaleString('id-ID')}
                        </span>
                      </div>

                      {isPending && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedDeposit(dep);
                              setActionType('approve');
                              setAdminNote('Pembayaran QRIS Toko Kelontong Zril Store terkonfirmasi.');
                            }}
                            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-[0_4px_14px_rgba(16,185,129,0.3)] flex items-center gap-1 cursor-pointer"
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
                            className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/35 text-rose-200 font-bold text-xs flex items-center gap-1 cursor-pointer"
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
              <h2 className="text-base font-black font-display text-white">
                Daftar Pengguna Firebase ({users.length})
              </h2>
              <p className="text-xs font-medium text-slate-400">
                Ubah saldo & role (User/Admin) tersinkronisasi langsung ke Firestore console.
              </p>
            </div>

            <button
              onClick={() => setShowCreateUserModal(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] text-white rounded-xl text-xs font-bold nb-btn flex items-center gap-1.5 self-start cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Tambah User Baru</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Cari Pengguna berdasarkan Nama, Email, atau UID..."
              className="w-full pl-10 pr-4 py-2.5 nb-input rounded-xl text-xs font-medium"
            />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#1C1E24] shadow-[0_10px_28px_rgba(0,0,0,0.3)]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#12141A] text-slate-300 border-b border-white/[0.08]">
                <tr>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Pengguna / Email</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">UID</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Saldo</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Role (Firestore)</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Status</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[11px] text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-slate-200">
                {filteredUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-white/[0.03] transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-white">{u.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{u.email}</div>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] font-medium text-slate-400">
                      {u.uid.slice(0, 14)}...
                    </td>
                    <td className="p-3.5">
                      <span className="font-black font-mono text-sky-400 text-sm tabular-nums">
                        {u.balance.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <button
                        onClick={async () => {
                          const newRole = u.role === 'admin' ? 'user' : 'admin';
                          await changeUserRole(u.uid, newRole, u);
                          showToast(
                            `Role ${u.name} diubah menjadi ${newRole.toUpperCase()} (Tersinkron ke Firestore)`,
                            'success'
                          );
                          fetchAllAdminData(true);
                        }}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
                          u.role === 'admin'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-400/35 hover:bg-amber-500/30'
                            : 'bg-blue-500/15 text-sky-300 border-blue-400/30 hover:bg-blue-500/25'
                        }`}
                        title="Klik untuk ubah role (user/admin) di Firestore"
                      >
                        {u.role.toUpperCase()} ⟳
                      </button>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          u.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                            : 'bg-rose-500/15 text-rose-300 border-rose-400/30'
                        }`}
                      >
                        {u.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setNewBalanceInput(u.balance.toString());
                          setBalanceReason('');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/35 text-sky-200 font-bold text-[11px] cursor-pointer"
                      >
                        Edit Saldo
                      </button>

                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] cursor-pointer ${
                            u.status === 'active'
                              ? 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-400/30 text-rose-300'
                              : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-400/30 text-emerald-300'
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
          <div>
            <h2 className="text-base font-black font-display text-white">
              Daftar Semua Pesanan ({orders.length})
            </h2>
            <p className="text-xs font-medium text-slate-400">
              Seluruh transaksi pembelian layanan Bulk AM dan verifikasi link.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Cari ID Pesanan, Akun, atau Nama Produk..."
                className="w-full pl-10 pr-4 py-2.5 nb-input rounded-xl text-xs font-medium"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#16181F] p-1 rounded-xl border border-white/[0.08] text-xs overflow-x-auto">
              {['all', 'Berhasil', 'Sedang diproses', 'Gagal'].map((st) => (
                <button
                  key={st}
                  onClick={() => setOrderFilter(st)}
                  className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                    orderFilter === st
                      ? 'bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st === 'all' ? 'Semua' : st}
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#1C1E24] border border-white/[0.08] text-xs font-semibold text-slate-400">
              Belum ada pesanan yang sesuai filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-4 rounded-2xl bg-[#1C1E24] border border-white/[0.08] shadow-[0_8px_24px_rgba(0,0,0,0.28)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sky-400 font-bold text-xs">{ord.id}</span>
                      <span className="text-xs font-bold text-white">({ord.productName})</span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          ord.status === 'Berhasil'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                            : ord.status === 'Gagal'
                            ? 'bg-rose-500/15 text-rose-300 border-rose-400/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-400/30'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </div>

                    <div className="text-xs font-medium text-slate-300">
                      Rincian: <span className="font-mono font-semibold text-white">{ord.email}</span> · Jumlah:{' '}
                      {ord.quantity} unit
                    </div>

                    <div className="text-[11px] font-medium text-slate-400">
                      Waktu Order: {new Date(ord.createdAt).toLocaleString('id-ID')}
                      {ord.errorNote && (
                        <span className="text-rose-400 font-semibold ml-2">Note: {ord.errorNote}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-white/[0.08]">
                    <div className="font-mono font-black text-white text-sm tabular-nums">
                      {ord.totalPrice.toLocaleString()}
                    </div>

                    <button
                      onClick={() =>
                        handleUpdateOrderStatus(ord.id, ord.status === 'Berhasil' ? 'Gagal' : 'Berhasil')
                      }
                      className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-blue-500/20 border border-white/10 hover:border-blue-400/35 text-[11px] font-bold text-slate-200 cursor-pointer"
                      title="Ubah status manual"
                    >
                      Ubah Status
                    </button>
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
          <div>
            <h2 className="text-base font-black font-display text-white">
              Manajemen Produk & Harga
            </h2>
            <p className="text-xs font-medium text-slate-400">
              Ubah tarif harga dasar akun Bulk AM dan biaya verifikasi link.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {products.map((prod) => (
              <div
                key={prod.id}
                className="rounded-2xl bg-[#1C1E24] border border-white/[0.08] p-5 space-y-4 shadow-[0_10px_28px_rgba(0,0,0,0.3)]"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black font-display text-white">{prod.name}</h3>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      prod.active
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                        : 'bg-rose-500/15 text-rose-300 border-rose-400/30'
                    }`}
                  >
                    {prod.active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                <div className="w-full aspect-[16/8] rounded-xl overflow-hidden bg-[#12141A] border border-white/[0.08] relative">
                  <img
                    src={prod.image || 'https://cdn.corenexis.com/f/hUimw94N.webp'}
                    alt={prod.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/product-banner.webp';
                    }}
                  />
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-lg bg-[#101114]/85 backdrop-blur-md border border-blue-400/30 text-[10px] font-bold text-sky-300 font-mono">
                    Tarif: {prod.price.toLocaleString()}
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                      Harga Satuan (Angka Murni):
                    </label>
                    <input
                      type="number"
                      value={prod.price}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        setProducts((prev) =>
                          prev.map((p) => (p.id === prod.id ? { ...p, price: val } : p))
                        );
                      }}
                      className="w-full px-3 py-2 nb-input rounded-xl font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                      URL Banner Horizontal Produk:
                    </label>
                    <input
                      type="text"
                      value={prod.image}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProducts((prev) =>
                          prev.map((p) => (p.id === prod.id ? { ...p, image: val } : p))
                        );
                      }}
                      className="w-full px-3 py-2 nb-input rounded-xl font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                      Deskripsi Singkat:
                    </label>
                    <textarea
                      value={prod.description}
                      rows={2}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProducts((prev) =>
                          prev.map((p) => (p.id === prod.id ? { ...p, description: val } : p))
                        );
                      }}
                      className="w-full px-3 py-2 nb-input rounded-xl font-medium resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-200">
                      <input
                        type="checkbox"
                        checked={prod.active}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setProducts((prev) =>
                            prev.map((p) => (p.id === prod.id ? { ...p, active: val } : p))
                          );
                        }}
                        className="w-4 h-4 accent-[#3B82F6]"
                      />
                      <span>Aktifkan Produk</span>
                    </label>

                    <button
                      onClick={() => handleUpdateProduct(prod)}
                      className="px-4 py-2 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] text-white font-bold rounded-xl nb-btn cursor-pointer"
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
          TAB 6: MODERN DARK API DOCUMENTATION UI & CONFIG
         ========================================================================= */}
      {activeTab === 'api' && settings && (
        <div className="space-y-6">
          {/* API Documentation Header Card */}
          <div className="bg-[#1C1E24] border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-[0_12px_32px_rgba(0,0,0,0.35)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] border border-blue-400/35 shadow-[0_6px_18px_rgba(37,99,235,0.3)] flex items-center justify-center shrink-0">
                  <Terminal className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 border border-blue-400/30 text-sky-300 text-[10px] font-bold tracking-widest uppercase">
                      API DOCS · v1
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold">
                      REST / JSON
                    </span>
                  </div>
                  <h2 className="text-lg font-black font-display text-white mt-1">
                    Dokumentasi & Konfigurasi API Alight Motion
                  </h2>
                  <p className="text-xs font-medium text-slate-400">
                    Spesifikasi endpoint resmi server AM PREMIUM AZRYL beserta uji konektivitas ping langsung.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowApiKeys(!showApiKeys)}
                className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-1.5 self-start cursor-pointer"
              >
                {showApiKeys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showApiKeys ? 'Sembunyikan Key' : 'Tampilkan Key'}</span>
              </button>
            </div>

            <form onSubmit={handleSaveApiConfig} className="space-y-6 pt-5">
              {/* ENDPOINT 1: BULK AM */}
              <div className="rounded-2xl bg-[#15171E] border border-white/[0.08] overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-[#172554]/80 to-[#1E3A8A]/45 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/35 font-mono text-[11px] font-bold text-emerald-300">
                      POST
                    </span>
                    <span className="font-display font-bold text-sm text-white">
                      1. AM Bulk Generator
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyCurl(bulkCurlExample, 'curl-bulk')}
                      className="px-2.5 py-1 bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 rounded-lg text-[11px] font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCurlKey === 'curl-bulk' ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Salin cURL</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestApi('bulk')}
                      disabled={testingApi}
                      className="px-3 py-1 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      <span>Tes Ping Bulk</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Form Config Inputs */}
                  <div className="lg:col-span-6 space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                        Endpoint POST URL:
                      </label>
                      <input
                        type="text"
                        value={settings.apiConfiguration?.bulkApiUrl || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSettings((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  apiConfiguration: { ...prev.apiConfiguration, bulkApiUrl: val }
                                }
                              : null
                          );
                        }}
                        className="w-full px-3 py-2 nb-input rounded-xl text-xs font-mono font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                        Header x-apikey:
                      </label>
                      <input
                        type={showApiKeys ? 'text' : 'password'}
                        value={settings.apiConfiguration?.bulkApiKey || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSettings((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  apiConfiguration: { ...prev.apiConfiguration, bulkApiKey: val }
                                }
                              : null
                          );
                        }}
                        placeholder="Masukkan API Key Bulk..."
                        className="w-full px-3 py-2 nb-input rounded-xl text-xs font-mono font-semibold"
                      />
                    </div>
                  </div>

                  {/* Request Schema & Payload Spec */}
                  <div className="lg:col-span-6 p-3.5 rounded-xl bg-[#101114] border border-white/[0.08] space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <span>Headers & Request Body</span>
                      <span className="px-2 py-0.5 rounded bg-blue-500/15 border border-blue-400/25 text-sky-300 font-mono">
                        application/json
                      </span>
                    </div>
                    <pre className="p-2.5 rounded-lg bg-[#0B0D12] border border-white/10 font-mono text-[11px] text-sky-200 overflow-x-auto leading-relaxed">
{`POST /api/bulk
Headers: Content-Type: application/json | x-apikey: <KEY>
Body:    {"total": 1, "provider": "akunlama"}`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* ENDPOINT 2: SEND GMAIL */}
              <div className="rounded-2xl bg-[#15171E] border border-white/[0.08] overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-[#172554]/80 to-[#1E3A8A]/45 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/20 border border-blue-400/35 font-mono text-[11px] font-bold text-sky-300">
                      POST
                    </span>
                    <span className="font-display font-bold text-sm text-white">
                      2. AM Send Gmail (Kirim Link)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyCurl(sendCurlExample, 'curl-send')}
                      className="px-2.5 py-1 bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 rounded-lg text-[11px] font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCurlKey === 'curl-send' ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Salin cURL</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestApi('send')}
                      disabled={testingApi}
                      className="px-3 py-1 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      <span>Tes Ping Send</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-6 space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                        Endpoint POST URL:
                      </label>
                      <input
                        type="text"
                        value={settings.apiConfiguration?.sendApiUrl || 'https://am.dapjisync.my.id/api/send'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSettings((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  apiConfiguration: { ...prev.apiConfiguration, sendApiUrl: val }
                                }
                              : null
                          );
                        }}
                        className="w-full px-3 py-2 nb-input rounded-xl text-xs font-mono font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                        Header x-apikey:
                      </label>
                      <input
                        type={showApiKeys ? 'text' : 'password'}
                        value={settings.apiConfiguration?.sendApiKey || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSettings((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  apiConfiguration: { ...prev.apiConfiguration, sendApiKey: val }
                                }
                              : null
                          );
                        }}
                        placeholder="Masukkan API Key Send Gmail..."
                        className="w-full px-3 py-2 nb-input rounded-xl text-xs font-mono font-semibold"
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-6 p-3.5 rounded-xl bg-[#101114] border border-white/[0.08] space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <span>Headers & Request Body</span>
                      <span className="px-2 py-0.5 rounded bg-blue-500/15 border border-blue-400/25 text-sky-300 font-mono">
                        application/json
                      </span>
                    </div>
                    <pre className="p-2.5 rounded-lg bg-[#0B0D12] border border-white/10 font-mono text-[11px] text-sky-200 overflow-x-auto leading-relaxed">
{`POST /api/send
Headers: Content-Type: application/json | x-apikey: <KEY>
Body:    {"gmail": "user@gmail.com"}`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* ENDPOINT 3: VERIF GMAIL */}
              <div className="rounded-2xl bg-[#15171E] border border-white/[0.08] overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-[#172554]/80 to-[#1E3A8A]/45 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/25 border border-indigo-400/35 font-mono text-[11px] font-bold text-indigo-200">
                      POST
                    </span>
                    <span className="font-display font-bold text-sm text-white">
                      3. AM Verif Gmail (Eksekusi Verifikasi)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyCurl(verifCurlExample, 'curl-verif')}
                      className="px-2.5 py-1 bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 rounded-lg text-[11px] font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCurlKey === 'curl-verif' ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Salin cURL</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestApi('verif')}
                      disabled={testingApi}
                      className="px-3 py-1 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      <span>Tes Ping Verif</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-6 space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                        Endpoint POST URL:
                      </label>
                      <input
                        type="text"
                        value={settings.apiConfiguration?.verifApiUrl || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSettings((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  apiConfiguration: { ...prev.apiConfiguration, verifApiUrl: val }
                                }
                              : null
                          );
                        }}
                        className="w-full px-3 py-2 nb-input rounded-xl text-xs font-mono font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                        Header x-apikey:
                      </label>
                      <input
                        type={showApiKeys ? 'text' : 'password'}
                        value={settings.apiConfiguration?.verifApiKey || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSettings((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  apiConfiguration: { ...prev.apiConfiguration, verifApiKey: val }
                                }
                              : null
                          );
                        }}
                        placeholder="Masukkan API Key Verif..."
                        className="w-full px-3 py-2 nb-input rounded-xl text-xs font-mono font-semibold"
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-6 p-3.5 rounded-xl bg-[#101114] border border-white/[0.08] space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <span>Headers & Request Body</span>
                      <span className="px-2 py-0.5 rounded bg-blue-500/15 border border-blue-400/25 text-sky-300 font-mono">
                        application/json
                      </span>
                    </div>
                    <pre className="p-2.5 rounded-lg bg-[#0B0D12] border border-white/10 font-mono text-[11px] text-sky-200 overflow-x-auto leading-relaxed">
{`POST /api/verif
Headers: Content-Type: application/json | x-apikey: <KEY>
Body:    {"gmail": "user@gmail.com", "link": "https://..."}`}
                    </pre>
                  </div>
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-4 rounded-xl border text-xs font-mono ${
                    testResult.success
                      ? 'bg-emerald-500/12 border-emerald-400/30 text-emerald-200'
                      : 'bg-rose-500/12 border-rose-400/30 text-rose-200'
                  }`}
                >
                  <div className="font-bold uppercase mb-1">Hasil Pengujian Ping API:</div>
                  <div>Status Code: {testResult.statusCode || 'N/A'}</div>
                  <div>Latency: {testResult.durationMs ? `${testResult.durationMs}ms` : 'Timeout / Error'}</div>
                  {testResult.error && <div className="font-bold mt-1">Pesan Error: {testResult.error}</div>}
                </div>
              )}

              <button
                type="submit"
                className="py-3 px-6 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] text-white font-bold text-xs nb-btn cursor-pointer"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-[#1C1E24] border border-white/[0.08] shadow-[0_10px_28px_rgba(0,0,0,0.3)] space-y-4">
            <h3 className="text-base font-black font-display text-white">
              Kontrol Saklar Operasional
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#15171E] border border-white/[0.08] flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-white block">Penerimaan Pesanan</span>
                  <span className="text-[11px] font-medium text-slate-400">
                    Izinkan pengguna melakukan pembelian Bulk AM & Verif.
                  </span>
                </div>
                <button
                  onClick={() => handleToggleSetting('storeOpen', !settings.storeOpen)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs border cursor-pointer ${
                    settings.storeOpen
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/35'
                      : 'bg-rose-500/20 text-rose-300 border-rose-400/35'
                  }`}
                >
                  {settings.storeOpen ? 'Buka' : 'Tutup'}
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-[#15171E] border border-white/[0.08] flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-white block">Pengajuan Deposit QRIS</span>
                  <span className="text-[11px] font-medium text-slate-400">
                    Izinkan pengguna melakukan transfer & deposit saldo.
                  </span>
                </div>
                <button
                  onClick={() => handleToggleSetting('depositOpen', !settings.depositOpen)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs border cursor-pointer ${
                    settings.depositOpen
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/35'
                      : 'bg-rose-500/20 text-rose-300 border-rose-400/35'
                  }`}
                >
                  {settings.depositOpen ? 'Buka' : 'Tutup'}
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-[#15171E] border border-white/[0.08] flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-white block">Mode Pemeliharaan (Maintenance)</span>
                  <span className="text-[11px] font-medium text-slate-400">
                    Tampilkan pengumuman pemeliharaan server.
                  </span>
                </div>
                <button
                  onClick={() => handleToggleSetting('maintenanceMode', !settings.maintenanceMode)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs border cursor-pointer ${
                    settings.maintenanceMode
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400/35'
                      : 'bg-white/[0.06] text-slate-300 border-white/10'
                  }`}
                >
                  {settings.maintenanceMode ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl md-blue-gradient border border-blue-300/25 space-y-4">
            <h3 className="text-base font-black font-display text-white">Merchant QRIS Aktif</h3>

            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-xl bg-white p-1.5 border border-white/30 shadow-lg overflow-hidden shrink-0">
                <img
                  src="https://cdn.phototourl.com/member/2026-11-10-5a092aa1-5330-4068-a112-233f093bfe0b.png"
                  alt="QRIS Merchant"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-medium text-blue-100/80">Nama Merchant:</div>
                <div className="font-black text-white text-sm">Toko Kelontong Zril Store</div>
                <div className="font-medium text-blue-100/80 pt-1">Minimal Deposit:</div>
                <div className="font-mono font-black text-sky-200 text-sm">500</div>
                <div className="text-[11px] font-bold text-emerald-300">
                  ✓ Bebas biaya admin & instan konfirmasi
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
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black font-display text-white">
                Catatan Aktivitas Admin (Audit Trail)
              </h2>
              <p className="text-xs font-medium text-slate-400">
                Rekap riwayat persetujuan deposit, perubahan saldo, status role, dan pengaturan.
              </p>
            </div>

            <button
              onClick={handleClearAuditLogs}
              className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-xs font-bold text-rose-300 cursor-pointer shrink-0"
            >
              Bersihkan Log
            </button>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#1C1E24] shadow-[0_10px_28px_rgba(0,0,0,0.3)] divide-y divide-white/[0.06] max-h-[500px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs font-semibold text-slate-400">
                Belum ada aktivitas admin tercatat.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white/[0.02]"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono bg-blue-500/20 border border-blue-400/30 px-2 py-0.5 rounded-md text-sky-300 font-bold text-[11px]">
                        {log.action}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">oleh {log.adminEmail}</span>
                    </div>
                    <div className="font-medium text-slate-200">{log.details}</div>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono font-medium shrink-0">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#1C1E24] border border-white/12 rounded-2xl p-6 shadow-[0_24px_60px_rgba(0,0,0,0.65)] relative">
            <h3 className="text-base font-black font-display text-white mb-1">
              {actionType === 'approve' ? 'Setujui Permintaan Deposit' : 'Tolak Permintaan Deposit'}
            </h3>
            <p className="text-xs font-medium text-slate-400 mb-4">
              ID Deposit: <span className="font-mono text-sky-400">{selectedDeposit.id}</span>
            </p>

            <div className="p-3.5 rounded-xl bg-[#15171E] border border-white/[0.08] text-xs space-y-1.5 mb-4">
              <div className="flex justify-between">
                <span className="font-medium text-slate-400">Pengirim:</span>
                <span className="text-white font-bold">{selectedDeposit.senderName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-400">Email Akun:</span>
                <span className="text-slate-200 font-mono font-semibold">{selectedDeposit.userEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-400">Nominal:</span>
                <span className="text-emerald-400 font-mono font-black text-sm">
                  +{selectedDeposit.amount.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 mb-5">
              <label className="block text-xs font-bold uppercase text-slate-300">Catatan Admin:</label>
              <input
                type="text"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={actionType === 'approve' ? 'Disetujui oleh admin' : 'Contoh: Mutasi QRIS tidak sesuai'}
                className="w-full px-3 py-2.5 nb-input rounded-xl text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedDeposit(null)}
                className="py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-200 text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDepositAction}
                disabled={processingAction}
                className={`py-2.5 px-3 rounded-xl font-extrabold text-xs cursor-pointer ${
                  actionType === 'approve'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_6px_18px_rgba(16,185,129,0.3)]'
                    : 'bg-rose-500 hover:bg-rose-400 text-white shadow-[0_6px_18px_rgba(244,63,94,0.3)]'
                }`}
              >
                {processingAction
                  ? 'Memproses...'
                  : actionType === 'approve'
                  ? 'Konfirmasi Setujui'
                  : 'Konfirmasi Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: EDIT USER BALANCE
         ========================================================================= */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#1C1E24] border border-white/12 rounded-2xl p-6 shadow-[0_24px_60px_rgba(0,0,0,0.65)] relative">
            <h3 className="text-base font-black font-display text-white mb-1">
              Sesuaikan Saldo Pengguna
            </h3>
            <p className="text-xs font-medium text-slate-400 mb-4">
              Target: <span className="font-bold text-white">{selectedUser.name}</span> ({selectedUser.email})
            </p>

            <form onSubmit={handleUpdateBalance} className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label className="font-bold uppercase text-slate-300">Saldo Baru:</label>
                  <span className="text-[11px] font-medium text-slate-400">
                    Saat ini:{' '}
                    <strong className="font-mono text-sky-400">
                      {selectedUser.balance.toLocaleString()}
                    </strong>
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  value={newBalanceInput}
                  onChange={(e) => setNewBalanceInput(e.target.value)}
                  className="w-full px-3 py-2.5 nb-input rounded-xl text-sm font-mono font-bold"
                  required
                />

                <div className="grid grid-cols-5 gap-1.5 mt-2">
                  {[500, 1000, 5000, 10000].map((addVal) => (
                    <button
                      key={addVal}
                      type="button"
                      onClick={() => {
                        const cur = parseInt(newBalanceInput, 10) || 0;
                        setNewBalanceInput((cur + addVal).toString());
                      }}
                      className="py-1 px-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-400/30 text-[10px] font-bold text-sky-300 cursor-pointer"
                    >
                      +{addVal >= 1000 ? `${addVal / 1000}k` : addVal}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setNewBalanceInput('0')}
                    className="py-1 px-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-[10px] font-bold text-rose-300 cursor-pointer"
                  >
                    Set 0
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                  Alasan Perubahan (Opsional):
                </label>
                <input
                  type="text"
                  value={balanceReason}
                  onChange={(e) => setBalanceReason(e.target.value)}
                  placeholder="Contoh: Top-up manual / Koreksi saldo"
                  className="w-full px-3 py-2 nb-input rounded-xl text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-200 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] text-white font-bold text-xs nb-btn cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#1C1E24] border border-white/12 rounded-2xl p-6 shadow-[0_24px_60px_rgba(0,0,0,0.65)] relative">
            <h3 className="text-base font-black font-display text-white mb-1">
              Tambah Pengguna Baru
            </h3>
            <p className="text-xs font-medium text-slate-400 mb-4">
              Buat akun pengguna secara manual ke sistem database.
            </p>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-300 mb-1">Alamat Email:</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="user@gmail.com"
                  className="w-full px-3 py-2 nb-input rounded-xl font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-300 mb-1">Nama Pengguna:</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Nama Lengkap / Editor"
                  className="w-full px-3 py-2 nb-input rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-300 mb-1">Role Akun:</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 nb-input rounded-xl font-semibold"
                >
                  <option value="user">User Biasa</option>
                  <option value="admin">Administrator (Root)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-300 mb-1">Saldo Awal:</label>
                <input
                  type="number"
                  min="0"
                  value={newUserBalance}
                  onChange={(e) => setNewUserBalance(e.target.value)}
                  className="w-full px-3 py-2 nb-input rounded-xl font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-200 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] text-white font-bold nb-btn cursor-pointer"
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
