import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from './Toast.tsx';
import { OrderTransaction, DepositTransaction } from '../types/index.ts';
import { db, collection, query, where, onSnapshot } from '../lib/firebase.ts';
import {
  extractBulkAccounts,
  extractVerifMessage,
  formatValidUntil
} from '../utils/orderFormatting.ts';
import {
  mergeOrders,
  mergeDeposits,
  loadUserTransactionsCache,
  saveUserTransactionsCache
} from '../utils/transactionSync.ts';
import {
  Clock,
  ShoppingBag,
  Wallet,
  Search,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Mail,
  MessageSquareText
} from 'lucide-react';

interface HistoryViewProps {
  onOpenAuth: () => void;
  setActiveTab: (tab: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onOpenAuth, setActiveTab }) => {
  const { userProfile } = useAuth();
  const { showToast } = useToast();
  const [activeCategory, setActiveCategory] = useState<'orders' | 'deposits'>('orders');
  const [orders, setOrders] = useState<OrderTransaction[]>([]);
  const [deposits, setDeposits] = useState<DepositTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [apiOrders, setApiOrders] = useState<OrderTransaction[]>([]);
  const [fsUidOrders, setFsUidOrders] = useState<OrderTransaction[]>([]);
  const [fsEmailOrders, setFsEmailOrders] = useState<OrderTransaction[]>([]);
  const [apiDeposits, setApiDeposits] = useState<DepositTransaction[]>([]);
  const [fsUidDeposits, setFsUidDeposits] = useState<DepositTransaction[]>([]);
  const [fsEmailDeposits, setFsEmailDeposits] = useState<DepositTransaction[]>([]);

  const handleCopy = (text: string, key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedKey(key);
    showToast('Berhasil disalin!', 'success');
    setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
  };

  useEffect(() => {
    if (!userProfile?.uid) {
      setOrders([]);
      setDeposits([]);
      return;
    }

    const cached = loadUserTransactionsCache(userProfile.uid, userProfile.email);
    const mergedOrders = mergeOrders(cached.orders, apiOrders, fsUidOrders, fsEmailOrders);
    const mergedDeposits = mergeDeposits(cached.deposits, apiDeposits, fsUidDeposits, fsEmailDeposits);

    setOrders(mergedOrders);
    setDeposits(mergedDeposits);
    saveUserTransactionsCache(userProfile.uid, userProfile.email, mergedOrders, mergedDeposits);
  }, [
    userProfile?.uid,
    userProfile?.email,
    apiOrders,
    fsUidOrders,
    fsEmailOrders,
    apiDeposits,
    fsUidDeposits,
    fsEmailDeposits
  ]);

  const fetchTransactions = async () => {
    if (!userProfile?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const emailParam = userProfile.email ? `?email=${encodeURIComponent(userProfile.email)}` : '';
      const res = await fetch(`/api/transactions/${userProfile.uid}${emailParam}`);
      if (res.ok) {
        const data = await res.json();
        setApiOrders(data.orders || []);
        setApiDeposits(data.deposits || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userProfile?.uid) {
      setLoading(false);
      return;
    }

    const cached = loadUserTransactionsCache(userProfile.uid, userProfile.email);
    if (cached.orders.length > 0) setOrders(cached.orders);
    if (cached.deposits.length > 0) setDeposits(cached.deposits);

    fetchTransactions();

    const normalizedEmail = (userProfile.email || '').toLowerCase().trim();

    const unsubDepsUid = onSnapshot(
      query(collection(db, 'deposits'), where('uid', '==', userProfile.uid)),
      (snapshot) => {
        const list: DepositTransaction[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as DepositTransaction;
          if (data && (data.id || docSnap.id)) {
            list.push({ ...data, id: data.id || docSnap.id });
          }
        });
        setFsUidDeposits(list);
      },
      () => {}
    );

    const unsubOrdsUid = onSnapshot(
      query(collection(db, 'orders'), where('uid', '==', userProfile.uid)),
      (snapshot) => {
        const list: OrderTransaction[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as OrderTransaction;
          if (data && (data.id || docSnap.id)) {
            list.push({ ...data, id: data.id || docSnap.id });
          }
        });
        setFsUidOrders(list);
      },
      () => {}
    );

    let unsubDepsEmail = () => {};
    let unsubOrdsEmail = () => {};

    if (normalizedEmail) {
      unsubDepsEmail = onSnapshot(
        query(collection(db, 'deposits'), where('userEmail', '==', normalizedEmail)),
        (snapshot) => {
          const list: DepositTransaction[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as DepositTransaction;
            if (data && (data.id || docSnap.id)) {
              list.push({ ...data, id: data.id || docSnap.id });
            }
          });
          setFsEmailDeposits(list);
        },
        () => {}
      );

      unsubOrdsEmail = onSnapshot(
        query(collection(db, 'orders'), where('userEmail', '==', normalizedEmail)),
        (snapshot) => {
          const list: OrderTransaction[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as OrderTransaction;
            if (data && (data.id || docSnap.id)) {
              list.push({ ...data, id: data.id || docSnap.id });
            }
          });
          setFsEmailOrders(list);
        },
        () => {}
      );
    }

    return () => {
      unsubDepsUid();
      unsubOrdsUid();
      unsubDepsEmail();
      unsubOrdsEmail();
    };
  }, [userProfile?.uid, userProfile?.email]);

  const toggleExpand = (id: string) => {
    setExpandedRow((prev) => (prev === id ? null : id));
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.productName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredDeposits = deposits.filter((d) => {
    const matchesSearch =
      d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.amount.toString().includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!userProfile) {
    return (
      <div className="max-w-md mx-auto text-center py-14 px-6 md-card rounded-3xl space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#0EA5E9] border border-blue-300/25 flex items-center justify-center text-white">
          <Clock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-display text-white">Riwayat Transaksi</h2>
        <p className="text-xs text-slate-400">
          Silakan masuk ke akun Anda terlebih dahulu untuk melihat seluruh riwayat order dan deposit.
        </p>
        <button
          onClick={onOpenAuth}
          className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white font-semibold text-xs nb-btn cursor-pointer"
        >
          Masuk Akun
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md-card p-5 sm:p-6 rounded-3xl">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/25 text-[11px] font-semibold text-blue-300">
              AZRYL History
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveCategory('orders');
                setStatusFilter('Berhasil');
              }}
              className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/25 text-[11px] font-semibold text-emerald-300 cursor-pointer transition-colors"
            >
              Order Berhasil: {orders.filter((o) => o.status === 'Berhasil').length}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveCategory('deposits');
                setStatusFilter('Berhasil');
              }}
              className="px-2.5 py-0.5 rounded-full bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/25 text-[11px] font-semibold text-sky-300 cursor-pointer transition-colors"
            >
              Deposit Berhasil: {deposits.filter((d) => d.status === 'Berhasil').length}
            </button>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-white">
            Riwayat Transaksi
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Pantau status pesanan layanan dan konfirmasi deposit saldo Anda di AM PREMIUM AZRYL.
          </p>
        </div>

        <button
          onClick={() => fetchTransactions()}
          className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 text-white font-semibold text-xs flex items-center gap-1.5 self-start sm:self-auto transition-colors cursor-pointer"
          title="Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Perbarui</span>
        </button>
      </div>

      {/* Category Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center p-1.5 md-card rounded-2xl w-fit gap-1.5">
          <button
            onClick={() => {
              setActiveCategory('orders');
              setStatusFilter('all');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeCategory === 'orders'
                ? 'bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white shadow-[0_6px_18px_-4px_rgba(37,99,235,0.6)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Riwayat Order ({orders.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveCategory('deposits');
              setStatusFilter('all');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeCategory === 'deposits'
                ? 'bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] text-white shadow-[0_6px_18px_-4px_rgba(14,165,233,0.55)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Riwayat Deposit ({deposits.length})</span>
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ID, email, atau nominal..."
              className="w-full pl-9 pr-3 py-2.5 nb-input rounded-xl text-xs font-medium placeholder-slate-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 nb-input rounded-xl text-xs font-semibold"
          >
            <option value="all">Semua Status</option>
            {activeCategory === 'orders' ? (
              <>
                <option value="Berhasil">Berhasil</option>
                <option value="Sedang diproses">Sedang diproses</option>
                <option value="Gagal">Gagal</option>
                <option value="Menunggu proses">Menunggu proses</option>
              </>
            ) : (
              <>
                <option value="Menunggu Konfirmasi Admin">Menunggu Konfirmasi</option>
                <option value="Berhasil">Berhasil</option>
                <option value="Ditolak">Ditolak</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* TAB 1: RIWAYAT ORDER */}
      {activeCategory === 'orders' && (
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center rounded-3xl md-card">
              <ShoppingBag className="w-10 h-10 text-slate-500 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-400">Belum ada riwayat pemesanan yang cocok.</p>
              <button
                onClick={() => setActiveTab('menu')}
                className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white text-xs font-semibold nb-btn cursor-pointer"
              >
                Mulai Belanja
              </button>
            </div>
          ) : (
            filteredOrders.map((ord) => {
              const isExpanded = expandedRow === ord.id;
              const isSuccess = ord.status === 'Berhasil';
              const isProcessing = ord.status === 'Sedang diproses' || ord.status === 'Menunggu proses';
              const isFailed = ord.status === 'Gagal';
              const isBulk =
                ord.productId === 'bulk-am' ||
                (ord.productName || '').toLowerCase().includes('bulk');
              const bulkAccounts = isBulk ? extractBulkAccounts(ord.apiResponse) : [];
              const verifMessage = !isBulk ? extractVerifMessage(ord) : '';

              return (
                <div
                  key={ord.id}
                  className="rounded-3xl md-card overflow-hidden"
                >
                  <div
                    onClick={() => toggleExpand(ord.id)}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl border flex flex-col items-center justify-center font-display font-bold text-[10px] shrink-0 mt-0.5 ${
                          isBulk
                            ? 'bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] border-blue-300/30 text-white'
                            : 'bg-gradient-to-br from-[#0284C7] to-[#2563EB] border-sky-300/30 text-white'
                        }`}
                      >
                        <span>{isBulk ? 'BULK' : 'VERIF'}</span>
                        <span className="text-[7px] tracking-widest opacity-80">AZRYL</span>
                      </div>

                      <div className="space-y-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-white text-xs sm:text-sm">{ord.productName}</span>
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/25 text-[10px] font-semibold text-blue-300">
                            AZRYL
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">({ord.id})</span>
                        </div>
                        <div className="text-xs font-medium text-sky-300 font-mono truncate">
                          {isBulk ? `Layanan: ${ord.quantity} Akun Bulk AM` : `Target: ${ord.email}`}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(ord.createdAt).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-white/[0.06]">
                      <div className="text-left sm:text-right">
                        <div className="font-mono font-bold text-sm text-white tabular-nums">
                          {ord.totalPrice.toLocaleString()}
                        </div>
                        <span className="text-[11px] text-slate-400">{ord.quantity} Akun</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                            isSuccess
                              ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                              : isProcessing
                              ? 'bg-sky-500/15 border-sky-400/30 text-sky-300'
                              : isFailed
                              ? 'bg-rose-500/15 border-rose-400/30 text-rose-300'
                              : 'bg-blue-500/15 border-blue-400/30 text-blue-300'
                          }`}
                        >
                          {ord.status}
                        </span>

                        <div className="text-slate-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AM Bulk: ONLY email, inbox_link, validUntil */}
                  {isBulk && bulkAccounts.length > 0 && (
                    <div className="px-4 sm:px-5 pb-4 pt-1 space-y-2.5">
                      <div className="p-3.5 rounded-2xl bg-[#12141A] border border-white/[0.08] space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-blue-300">
                            Akun Bulk AM · AZRYL
                          </span>
                          <span className="text-[11px] font-medium text-slate-400">
                            {bulkAccounts.length} Akun
                          </span>
                        </div>

                        <div className="space-y-2">
                          {bulkAccounts.map((acc, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-xl bg-[#1C1E24] border border-white/[0.08] space-y-2"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/25 text-[10px] font-semibold text-blue-300">
                                  Akun #{idx + 1} · AZRYL
                                </span>
                                {acc.validUntil && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/25 text-[10px] font-medium text-sky-200">
                                    <Clock className="w-3 h-3" />
                                    <span>Valid Until: {formatValidUntil(acc.validUntil)}</span>
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div className="px-3 py-2 rounded-xl bg-[#12141A] border border-white/[0.06] flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                    <div className="min-w-0">
                                      <div className="text-[10px] text-slate-400">Email</div>
                                      <div className="text-xs font-mono font-semibold text-white truncate">
                                        {acc.email || '-'}
                                      </div>
                                    </div>
                                  </div>
                                  {acc.email && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleCopy(acc.email, `${ord.id}-email-${idx}`, e)}
                                      className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-blue-500/25 border border-white/10 text-slate-200 shrink-0 cursor-pointer"
                                      title="Salin Email"
                                    >
                                      {copiedKey === `${ord.id}-email-${idx}` ? (
                                        <Check className="w-3 h-3 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  )}
                                </div>

                                <div className="px-3 py-2 rounded-xl bg-[#12141A] border border-white/[0.06] flex items-center justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[10px] text-slate-400">Inbox Link</div>
                                    <div className="text-xs font-mono font-semibold text-sky-300 truncate">
                                      {acc.inbox_link || '-'}
                                    </div>
                                  </div>
                                  {acc.inbox_link && (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={(e) => handleCopy(acc.inbox_link, `${ord.id}-inbox-${idx}`, e)}
                                        className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-blue-500/25 border border-white/10 text-slate-200 cursor-pointer"
                                        title="Salin Link"
                                      >
                                        {copiedKey === `${ord.id}-inbox-${idx}` ? (
                                          <Check className="w-3 h-3 text-emerald-400" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                      </button>
                                      <a
                                        href={acc.inbox_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white text-[10px] font-semibold inline-flex items-center gap-1"
                                      >
                                        <span>Inbox</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AM Verif: Message Display */}
                  {!isBulk && verifMessage && (
                    <div className="px-4 sm:px-5 pb-4 pt-1">
                      <div
                        className={`p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs ${
                          isSuccess
                            ? 'bg-emerald-500/10 border-emerald-400/25 text-emerald-100'
                            : 'bg-rose-500/10 border-rose-400/25 text-rose-100'
                        }`}
                      >
                        <MessageSquareText className="w-4 h-4 shrink-0 mt-0.5 text-blue-300" />
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold text-blue-300 mb-0.5">
                            Message · AZRYL
                          </div>
                          <div className="font-medium leading-relaxed break-words">{verifMessage}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expandable Extra Details */}
                  {isExpanded && (
                    <div className="px-4 sm:px-5 pb-4 pt-3 border-t border-white/[0.08] bg-[#12141A] text-xs space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400">ID Transaksi: </span>
                          <span className="font-mono font-semibold text-white">{ord.id}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Email Pemesan: </span>
                          <span className="font-mono font-semibold text-white">{ord.userEmail}</span>
                        </div>
                        {ord.link && (
                          <div className="sm:col-span-2">
                            <span className="text-slate-400">Link Verifikasi: </span>
                            <span className="font-mono font-semibold text-sky-300 break-all">{ord.link}</span>
                          </div>
                        )}
                        {isBulk && ord.errorNote && (
                          <div className="sm:col-span-2 text-rose-300 font-medium">
                            <span>Catatan: </span>
                            <span>{ord.errorNote}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: RIWAYAT DEPOSIT */}
      {activeCategory === 'deposits' && (
        <div className="space-y-3">
          {filteredDeposits.length === 0 ? (
            <div className="p-12 text-center rounded-3xl md-card">
              <Wallet className="w-10 h-10 text-slate-500 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-400">Belum ada riwayat deposit yang tercatat.</p>
              <button
                onClick={() => setActiveTab('deposit')}
                className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white text-xs font-semibold nb-btn cursor-pointer"
              >
                Isi Saldo QRIS
              </button>
            </div>
          ) : (
            filteredDeposits.map((dep) => {
              const isApproved = dep.status === 'Berhasil';
              const isPending = dep.status === 'Menunggu Konfirmasi Admin';

              return (
                <div
                  key={dep.id}
                  className="rounded-3xl md-card p-4 sm:p-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#0EA5E9] border border-blue-300/25 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Wallet className="w-5 h-5" />
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">Deposit QRIS</span>
                          <span className="text-[11px] text-slate-400 font-mono">({dep.id})</span>
                        </div>
                        <div className="text-xs text-slate-300">
                          Pengirim: <span className="font-semibold text-white">{dep.senderName}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(dep.createdAt).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-white/[0.06]">
                      <div className="text-left sm:text-right">
                        <div className="font-mono font-bold text-sm text-sky-300 tabular-nums">
                          +{dep.amount.toLocaleString()}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Rp {dep.amount.toLocaleString('id-ID')}
                        </span>
                      </div>

                      <span
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                          isApproved
                            ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                            : isPending
                            ? 'bg-blue-500/15 border-blue-400/30 text-blue-300'
                            : 'bg-rose-500/15 border-rose-400/30 text-rose-300'
                        }`}
                      >
                        {dep.status}
                      </span>
                    </div>
                  </div>

                  {dep.adminNote && (
                    <div className="mt-3 pt-2.5 border-t border-white/[0.08] text-[11px] text-slate-300 flex items-center gap-1.5">
                      <span className="font-semibold text-blue-300">Catatan Admin:</span>
                      <span className="italic">"{dep.adminNote}"</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
