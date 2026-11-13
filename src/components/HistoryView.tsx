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
    setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
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
      Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
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
      Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
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
      <div className="max-w-md mx-auto text-center py-14 px-6 bg-white border-2 border-slate-950 rounded-2xl shadow-[5px_5px_0px_0px_#020617] space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FFE600] border-2 border-slate-950 flex items-center justify-center text-slate-950">
          <Clock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black font-display text-slate-950">Riwayat Transaksi</h2>
        <p className="text-xs font-medium text-slate-600">
          Silakan masuk ke akun Anda terlebih dahulu untuk melihat seluruh riwayat order dan deposit.
        </p>
        <button
          onClick={onOpenAuth}
          className="py-2.5 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs nb-btn cursor-pointer"
        >
          Masuk Akun
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border-2 border-slate-950 shadow-[4px_4px_0px_0px_#020617]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-[#FFE600] border border-slate-950 text-[10px] font-black tracking-widest text-slate-950 uppercase">
              AZRYL HISTORY
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-display text-slate-950">
            Riwayat Transaksi
          </h1>
          <p className="text-xs font-medium text-slate-600 mt-0.5">
            Pantau status pesanan layanan dan konfirmasi deposit saldo Anda di AM PREMIUM · AZRYL.
          </p>
        </div>

        <button
          onClick={() => fetchTransactions()}
          className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#FFE600] border-2 border-slate-950 text-slate-950 font-extrabold text-xs nb-btn flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          title="Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Perbarui</span>
        </button>
      </div>

      {/* Category Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center p-1.5 bg-white rounded-xl border-2 border-slate-950 shadow-[3px_3px_0px_0px_#020617] w-fit gap-1.5">
          <button
            onClick={() => {
              setActiveCategory('orders');
              setStatusFilter('all');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeCategory === 'orders'
                ? 'bg-[#FFE600] text-slate-950 border-2 border-slate-950'
                : 'text-slate-700 hover:text-slate-950 border-2 border-transparent'
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
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeCategory === 'deposits'
                ? 'bg-[#38BDF8] text-slate-950 border-2 border-slate-950'
                : 'text-slate-700 hover:text-slate-950 border-2 border-transparent'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Riwayat Deposit ({deposits.length})</span>
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ID, email, atau nominal..."
              className="w-full pl-9 pr-3 py-2 nb-input rounded-xl text-xs font-semibold placeholder-slate-400"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 nb-input rounded-xl text-xs font-bold"
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
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border-2 border-slate-950 shadow-[4px_4px_0px_0px_#020617]">
              <ShoppingBag className="w-10 h-10 text-slate-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">Belum ada riwayat pemesanan yang cocok.</p>
              <button
                onClick={() => setActiveTab('menu')}
                className="mt-3 px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-extrabold nb-btn cursor-pointer"
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
                  className="rounded-2xl bg-white border-2 border-slate-950 shadow-[4px_4px_0px_0px_#020617] overflow-hidden"
                >
                  <div
                    onClick={() => toggleExpand(ord.id)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-[#FFFDF5] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl border-2 border-slate-950 text-slate-950 flex flex-col items-center justify-center font-display font-black text-[10px] shrink-0 mt-0.5 ${
                          isBulk ? 'bg-[#FFE600]' : 'bg-[#38BDF8]'
                        }`}
                      >
                        <span>{isBulk ? 'BULK' : 'VERIF'}</span>
                        <span className="text-[7px] tracking-widest">AZRYL</span>
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-slate-950 text-xs sm:text-sm">{ord.productName}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-950 text-[9px] font-black tracking-widest text-[#FFE600] uppercase">
                            AZRYL
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 font-mono">({ord.id})</span>
                        </div>
                        <div className="text-xs font-bold text-[#2563EB] font-mono">
                          {isBulk ? `Layanan: ${ord.quantity} Akun Bulk AM` : `Target: ${ord.email}`}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500">
                          {new Date(ord.createdAt).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t-2 sm:border-t-0 pt-2.5 sm:pt-0 border-slate-950/15">
                      <div className="text-left sm:text-right">
                        <div className="font-mono font-black text-sm text-slate-950 tabular-nums">
                          {ord.totalPrice.toLocaleString()}
                        </div>
                        <span className="text-[10px] font-bold text-slate-600">{ord.quantity} Akun</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-lg border-2 border-slate-950 ${
                            isSuccess
                              ? 'bg-[#4ADE80] text-slate-950'
                              : isProcessing
                              ? 'bg-[#38BDF8] text-slate-950'
                              : isFailed
                              ? 'bg-[#FB7185] text-slate-950'
                              : 'bg-[#FFE600] text-slate-950'
                          }`}
                        >
                          {ord.status}
                        </span>

                        <div className="text-slate-950">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AM Bulk: ONLY email, inbox_link, validUntil */}
                  {isBulk && bulkAccounts.length > 0 && (
                    <div className="px-4 pb-4 pt-1 space-y-2.5">
                      <div className="p-3.5 rounded-xl bg-[#F4F3EE] border-2 border-slate-950 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-950">
                            Akun Bulk AM · AZRYL
                          </span>
                          <span className="text-[10px] font-extrabold text-slate-700">
                            {bulkAccounts.length} Akun
                          </span>
                        </div>

                        <div className="space-y-2">
                          {bulkAccounts.map((acc, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-xl bg-white border-2 border-slate-950 space-y-2"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="px-2 py-0.5 rounded bg-[#FFE600] border border-slate-950 text-[10px] font-black text-slate-950 uppercase tracking-wider">
                                  Akun #{idx + 1} · AZRYL
                                </span>
                                {acc.validUntil && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E0F2FE] border border-slate-950 text-[10px] font-bold text-slate-950">
                                    <Clock className="w-3 h-3" />
                                    <span>Valid Until: {formatValidUntil(acc.validUntil)}</span>
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div className="px-3 py-2 rounded-lg bg-[#FFFDF5] border-2 border-slate-950 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Mail className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                                    <div className="min-w-0">
                                      <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                                        Email
                                      </div>
                                      <div className="text-xs font-mono font-bold text-slate-950 truncate">
                                        {acc.email || '-'}
                                      </div>
                                    </div>
                                  </div>
                                  {acc.email && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleCopy(acc.email, `${ord.id}-email-${idx}`, e)}
                                      className="p-1.5 rounded-lg bg-white hover:bg-[#FFE600] border border-slate-950 text-slate-950 shrink-0 cursor-pointer"
                                      title="Salin Email"
                                    >
                                      {copiedKey === `${ord.id}-email-${idx}` ? (
                                        <Check className="w-3 h-3 text-[#16A34A]" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  )}
                                </div>

                                <div className="px-3 py-2 rounded-lg bg-[#FFFDF5] border-2 border-slate-950 flex items-center justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                                      Inbox Link
                                    </div>
                                    <div className="text-xs font-mono font-bold text-[#2563EB] truncate">
                                      {acc.inbox_link || '-'}
                                    </div>
                                  </div>
                                  {acc.inbox_link && (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={(e) => handleCopy(acc.inbox_link, `${ord.id}-inbox-${idx}`, e)}
                                        className="p-1.5 rounded-lg bg-white hover:bg-[#FFE600] border border-slate-950 text-slate-950 cursor-pointer"
                                        title="Salin Link"
                                      >
                                        {copiedKey === `${ord.id}-inbox-${idx}` ? (
                                          <Check className="w-3 h-3 text-[#16A34A]" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                      </button>
                                      <a
                                        href={acc.inbox_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="px-2.5 py-1 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white border border-slate-950 text-[10px] font-extrabold inline-flex items-center gap-1"
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
                      <div
                        className={`p-3 rounded-xl border-2 border-slate-950 flex items-start gap-2.5 text-xs ${
                          isSuccess ? 'bg-[#DCFCE7] text-slate-950' : 'bg-[#FFE4E6] text-slate-950'
                        }`}
                      >
                        <MessageSquareText className="w-4 h-4 shrink-0 mt-0.5 text-slate-950" />
                        <div className="min-w-0">
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-700 mb-0.5">
                            Message · AZRYL
                          </div>
                          <div className="font-bold leading-relaxed break-words">{verifMessage}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expandable Extra Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-3 border-t-2 border-slate-950 bg-[#F4F3EE] text-xs space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="font-bold text-slate-600">ID Transaksi: </span>
                          <span className="font-mono font-bold text-slate-950">{ord.id}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-600">Email Pemesan: </span>
                          <span className="font-mono font-bold text-slate-950">{ord.userEmail}</span>
                        </div>
                        {ord.link && (
                          <div className="sm:col-span-2">
                            <span className="font-bold text-slate-600">Link Verifikasi: </span>
                            <span className="font-mono font-bold text-[#2563EB] break-all">{ord.link}</span>
                          </div>
                        )}
                        {isBulk && ord.errorNote && (
                          <div className="sm:col-span-2 text-[#DC2626] font-bold">
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

      {/* =========================================================================
          TAB 2: RIWAYAT DEPOSIT
         ========================================================================= */}
      {activeCategory === 'deposits' && (
        <div className="space-y-3">
          {filteredDeposits.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border-2 border-slate-950 shadow-[4px_4px_0px_0px_#020617]">
              <Wallet className="w-10 h-10 text-slate-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">Belum ada riwayat deposit yang tercatat.</p>
              <button
                onClick={() => setActiveTab('deposit')}
                className="mt-3 px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-extrabold nb-btn cursor-pointer"
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
                  className="rounded-2xl bg-white border-2 border-slate-950 shadow-[4px_4px_0px_0px_#020617] p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FFE600] border-2 border-slate-950 text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
                        <Wallet className="w-5 h-5" />
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-950 text-xs">Deposit QRIS</span>
                          <span className="text-[10px] font-bold text-slate-600 font-mono">({dep.id})</span>
                        </div>
                        <div className="text-xs font-semibold text-slate-700">
                          Pengirim: <span className="font-black text-slate-950">{dep.senderName}</span>
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500">
                          {new Date(dep.createdAt).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t-2 sm:border-t-0 pt-2.5 sm:pt-0 border-slate-950/15">
                      <div className="text-left sm:text-right">
                        <div className="font-mono font-black text-sm text-[#2563EB] tabular-nums">
                          +{dep.amount.toLocaleString()}
                        </div>
                        <span className="text-[10px] font-bold text-slate-600">
                          Rp {dep.amount.toLocaleString('id-ID')}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-lg border-2 border-slate-950 ${
                          isApproved
                            ? 'bg-[#4ADE80] text-slate-950'
                            : isPending
                            ? 'bg-[#FFE600] text-slate-950'
                            : 'bg-[#FB7185] text-slate-950'
                        }`}
                      >
                        {dep.status}
                      </span>
                    </div>
                  </div>

                  {dep.adminNote && (
                    <div className="mt-3 pt-2.5 border-t-2 border-slate-950/15 text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="text-slate-950">Catatan Admin:</span>
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
