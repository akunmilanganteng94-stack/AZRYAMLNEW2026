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
  const [fsOrders, setFsOrders] = useState<OrderTransaction[]>([]);
  const [apiDeposits, setApiDeposits] = useState<DepositTransaction[]>([]);
  const [fsDeposits, setFsDeposits] = useState<DepositTransaction[]>([]);

  const handleCopy = (text: string, key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedKey(key);
    showToast('Berhasil disalin!', 'success');
    setTimeout(() => setCopiedKey(prev => (prev === key ? null : prev)), 2000);
  };

  useEffect(() => {
    const map = new Map<string, OrderTransaction>();
    [...apiOrders, ...fsOrders].forEach((ord) => {
      if (!ord || !ord.id) return;
      const existing = map.get(ord.id);
      if (!existing || (!existing.apiResponse && ord.apiResponse)) {
        map.set(ord.id, ord);
      }
    });
    setOrders(
      Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    );
  }, [apiOrders, fsOrders]);

  useEffect(() => {
    const map = new Map<string, DepositTransaction>();
    [...apiDeposits, ...fsDeposits].forEach((dep) => {
      if (!dep || !dep.id) return;
      const existing = map.get(dep.id);
      if (!existing) {
        map.set(dep.id, dep);
      } else if (existing.status === 'Menunggu Konfirmasi Admin' && dep.status !== 'Menunggu Konfirmasi Admin') {
        map.set(dep.id, dep);
      }
    });
    setDeposits(
      Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    );
  }, [apiDeposits, fsDeposits]);

  const fetchTransactions = async () => {
    if (!userProfile?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions/${userProfile.uid}`);
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
    fetchTransactions();
    if (!userProfile?.uid) return;

    const depQuery = query(collection(db, 'deposits'), where('uid', '==', userProfile.uid));
    const unsubDeps = onSnapshot(
      depQuery,
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

    const ordQuery = query(collection(db, 'orders'), where('uid', '==', userProfile.uid));
    const unsubOrds = onSnapshot(
      ordQuery,
      (snapshot) => {
        const list: OrderTransaction[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as OrderTransaction;
          if (data && data.id) list.push(data);
        });
        setFsOrders(list);
      },
      () => {}
    );

    return () => {
      unsubDeps();
      unsubOrds();
    };
  }, [userProfile?.uid]);

  const toggleExpand = (id: string) => {
    setExpandedRow(prev => prev === id ? null : id);
  };

  // Filter Orders
  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.productName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filter Deposits
  const filteredDeposits = deposits.filter(d => {
    const matchesSearch = 
      d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.amount.toString().includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!userProfile) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-4 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-cyan-400">
          <Clock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-display text-white">Riwayat Transaksi</h2>
        <p className="text-xs text-slate-400">
          Silakan masuk ke akun Anda terlebih dahulu untuk melihat seluruh riwayat order dan deposit.
        </p>
        <button
          onClick={onOpenAuth}
          className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/20"
        >
          Masuk Akun
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-950/50 via-[#0b1330] to-slate-950/60 p-4 sm:p-5 rounded-3xl border border-cyan-500/20 shadow-lg shadow-blue-950/30">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-400/30 text-[10px] font-extrabold tracking-widest text-cyan-300 uppercase">
              AZRYL HISTORY
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-white">
            Riwayat Transaksi
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pantau status pesanan layanan dan konfirmasi deposit saldo Anda di AM PREMIUM · AZRYL.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchTransactions()}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Perbarui</span>
          </button>
        </div>
      </div>

      {/* Category Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center p-1 bg-slate-950/90 rounded-2xl border border-blue-500/20 w-fit">
          <button
            onClick={() => {
              setActiveCategory('orders');
              setStatusFilter('all');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeCategory === 'orders'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
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
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeCategory === 'deposits'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
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
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ID, email, atau nominal..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950/80 border border-slate-800 text-xs text-slate-300 rounded-xl focus:outline-none focus:border-cyan-500"
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

      {/* =========================================================================
          TAB 1: RIWAYAT ORDER
         ========================================================================= */}
      {activeCategory === 'orders' && (
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#080d1e] border border-slate-800/80">
              <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Belum ada riwayat pemesanan yang cocok.</p>
              <button
                onClick={() => setActiveTab('menu')}
                className="mt-3 px-4 py-2 rounded-xl bg-blue-600/80 text-white text-xs font-semibold"
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
              const isBulk = ord.productId === 'bulk-am';
              const bulkAccounts = isBulk ? extractBulkAccounts(ord.apiResponse) : [];
              const verifMessage = !isBulk ? extractVerifMessage(ord) : '';

              return (
                <div
                  key={ord.id}
                  className="rounded-3xl bg-gradient-to-br from-[#091128] via-[#080d1e] to-[#060b19] border border-blue-500/20 overflow-hidden transition-all hover:border-cyan-400/35 shadow-lg shadow-blue-950/20"
                >
                  <div 
                    onClick={() => toggleExpand(ord.id)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600/25 to-cyan-500/15 border border-cyan-400/30 text-cyan-300 flex flex-col items-center justify-center font-display font-extrabold text-[10px] shrink-0 mt-0.5">
                        <span>{isBulk ? 'BULK' : 'VERIF'}</span>
                        <span className="text-[7px] text-cyan-400/80 tracking-widest">AZRYL</span>
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-white text-xs sm:text-sm">{ord.productName}</span>
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/25 text-[9px] font-extrabold tracking-widest text-cyan-300 uppercase">
                            AZRYL
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">({ord.id})</span>
                        </div>
                        <div className="text-xs text-cyan-300 font-mono">
                          {isBulk ? `Layanan: ${ord.quantity} Akun Bulk AM` : `Target: ${ord.email}`}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(ord.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/80">
                      <div className="text-left sm:text-right">
                        <div className="font-display font-extrabold text-sm text-white">
                          {ord.totalPrice.toLocaleString()}
                        </div>
                        <span className="text-[10px] text-slate-400">{ord.quantity} Akun</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                          isSuccess
                            ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400'
                            : isProcessing
                            ? 'bg-cyan-950/60 border-cyan-500/30 text-cyan-400 animate-pulse'
                            : isFailed
                            ? 'bg-rose-950/60 border-rose-500/30 text-rose-400'
                            : 'bg-amber-950/60 border-amber-500/30 text-amber-400'
                        }`}>
                          {ord.status}
                        </span>

                        <div className="text-slate-500">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AM Bulk: ONLY email, inbox_link, validUntil */}
                  {isBulk && bulkAccounts.length > 0 && (
                    <div className="px-4 pb-4 pt-1 space-y-2.5">
                      <div className="p-3.5 rounded-2xl bg-slate-950/85 border border-cyan-500/20 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-300">
                            Akun Bulk AM · AZRYL
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {bulkAccounts.length} Akun
                          </span>
                        </div>

                        <div className="space-y-2">
                          {bulkAccounts.map((acc, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-xl bg-black/50 border border-slate-800/90 hover:border-cyan-500/30 transition-all space-y-2"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                                  Akun #{idx + 1} · AZRYL
                                </span>
                                {acc.validUntil && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-400/25 text-[10px] font-medium text-amber-300">
                                    <Clock className="w-3 h-3" />
                                    <span>Valid Until: {formatValidUntil(acc.validUntil)}</span>
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div className="px-3 py-2 rounded-lg bg-[#070d1f] border border-slate-800 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                    <div className="min-w-0">
                                      <div className="text-[9px] uppercase tracking-wider text-slate-400">Email</div>
                                      <div className="text-xs font-mono text-white truncate">{acc.email || '-'}</div>
                                    </div>
                                  </div>
                                  {acc.email && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleCopy(acc.email, `${ord.id}-email-${idx}`, e)}
                                      className="p-1.5 rounded-md bg-slate-900 hover:bg-blue-600/30 border border-slate-700 text-cyan-300 shrink-0 cursor-pointer"
                                      title="Salin Email"
                                    >
                                      {copiedKey === `${ord.id}-email-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                  )}
                                </div>

                                <div className="px-3 py-2 rounded-lg bg-[#070d1f] border border-slate-800 flex items-center justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[9px] uppercase tracking-wider text-slate-400">Inbox Link</div>
                                    <div className="text-xs font-mono text-cyan-300 truncate">{acc.inbox_link || '-'}</div>
                                  </div>
                                  {acc.inbox_link && (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={(e) => handleCopy(acc.inbox_link, `${ord.id}-inbox-${idx}`, e)}
                                        className="p-1.5 rounded-md bg-slate-900 hover:bg-blue-600/30 border border-slate-700 text-slate-300 cursor-pointer"
                                        title="Salin Link"
                                      >
                                        {copiedKey === `${ord.id}-inbox-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                      </button>
                                      <a
                                        href={acc.inbox_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="px-2.5 py-1 rounded-md bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-[10px] font-bold inline-flex items-center gap-1"
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
                    <div className="px-4 pb-4 pt-1">
                      <div className={`p-3 rounded-2xl border flex items-start gap-2.5 text-xs ${
                        isSuccess
                          ? 'bg-emerald-950/25 border-emerald-500/25 text-emerald-200'
                          : 'bg-rose-950/30 border-rose-500/25 text-rose-200'
                      }`}>
                        <MessageSquareText className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
                        <div className="min-w-0">
                          <div className="text-[10px] font-extrabold uppercase tracking-widest opacity-80 mb-0.5">
                            Message · AZRYL
                          </div>
                          <div className="font-medium leading-relaxed break-words">{verifMessage}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expandable Extra Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 bg-black/40 text-xs space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400">ID Transaksi: </span>
                          <span className="font-mono text-white">{ord.id}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Email Pemesan: </span>
                          <span className="font-mono text-white">{ord.userEmail}</span>
                        </div>
                        {ord.link && (
                          <div className="sm:col-span-2">
                            <span className="text-slate-400">Link Verifikasi: </span>
                            <span className="font-mono text-cyan-300 break-all">{ord.link}</span>
                          </div>
                        )}
                        {isBulk && ord.errorNote && (
                          <div className="sm:col-span-2 text-rose-300">
                            <span className="font-semibold">Catatan: </span>
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

      {/* =========================================================================
          TAB 2: RIWAYAT DEPOSIT
         ========================================================================= */}
      {activeCategory === 'deposits' && (
        <div className="space-y-3">
          {filteredDeposits.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#080d1e] border border-slate-800/80">
              <Wallet className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Belum ada riwayat deposit yang tercatat.</p>
              <button
                onClick={() => setActiveTab('deposit')}
                className="mt-3 px-4 py-2 rounded-xl bg-blue-600/80 text-white text-xs font-semibold"
              >
                Isi Saldo QRIS
              </button>
            </div>
          ) : (
            filteredDeposits.map((dep) => {
              const isApproved = dep.status === 'Berhasil';
              const isPending = dep.status === 'Menunggu Konfirmasi Admin';
              const isRejected = dep.status === 'Ditolak';

              return (
                <div
                  key={dep.id}
                  className="rounded-2xl bg-[#090e21] border border-blue-500/15 p-4 transition-all hover:border-blue-500/30"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-950/70 border border-blue-500/30 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Wallet className="w-5 h-5" />
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-xs">Deposit QRIS</span>
                          <span className="text-[10px] text-slate-400 font-mono">({dep.id})</span>
                        </div>
                        <div className="text-xs text-slate-300">
                          Pengirim: <span className="font-medium text-white">{dep.senderName}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(dep.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                      <div className="text-left sm:text-right">
                        <div className="font-display font-extrabold text-sm text-cyan-300">
                          +{dep.amount.toLocaleString()}
                        </div>
                        <span className="text-[10px] text-slate-400">Rp {dep.amount.toLocaleString('id-ID')}</span>
                      </div>

                      <div>
                        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                          isApproved
                            ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400'
                            : isPending
                            ? 'bg-amber-950/60 border-amber-500/30 text-amber-400 animate-pulse'
                            : 'bg-rose-950/60 border-rose-500/30 text-rose-400'
                        }`}>
                          {dep.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Note if available */}
                  {dep.adminNote && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
                      <span className="font-semibold text-slate-300">Catatan Admin:</span>
                      <span className="text-slate-400 italic">"{dep.adminNote}"</span>
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
