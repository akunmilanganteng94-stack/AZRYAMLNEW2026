import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { OrderTransaction, DepositTransaction } from '../types/index.ts';
import { 
  Clock, 
  ShoppingBag, 
  Wallet, 
  Search, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface HistoryViewProps {
  onOpenAuth: () => void;
  setActiveTab: (tab: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onOpenAuth, setActiveTab }) => {
  const { userProfile } = useAuth();
  const [activeCategory, setActiveCategory] = useState<'orders' | 'deposits'>('orders');
  const [orders, setOrders] = useState<OrderTransaction[]>([]);
  const [deposits, setDeposits] = useState<DepositTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

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
        setOrders(data.orders || []);
        setDeposits(data.deposits || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-slate-950/40 p-4 sm:p-5 rounded-3xl border border-blue-500/15">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-white">
            Riwayat Transaksi
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pantau status pesanan layanan dan konfirmasi deposit saldo Anda.
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

              return (
                <div
                  key={ord.id}
                  className="rounded-2xl bg-[#090e21] border border-blue-500/15 overflow-hidden transition-all hover:border-blue-500/30"
                >
                  <div 
                    onClick={() => toggleExpand(ord.id)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-950/70 border border-blue-500/30 text-cyan-400 flex items-center justify-center font-display font-extrabold text-xs shrink-0 mt-0.5">
                        {ord.productId === 'bulk-am' ? 'BULK' : 'VERIF'}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-xs">{ord.productName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({ord.id})</span>
                        </div>
                        <div className="text-xs text-cyan-300 font-mono">
                          {ord.productId === 'bulk-am' ? `Layanan: ${ord.quantity} Akun Bulk AM` : `Target: ${ord.email}`}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(ord.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
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

                  {/* Expandable Details */}
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
                        {ord.errorNote && (
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
