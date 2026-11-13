import { OrderTransaction, DepositTransaction, OrderStatus, DepositStatus } from '../types/index.ts';

/**
 * Strips `undefined` values recursively so Firestore `setDoc` never rejects
 * objects containing optional `undefined` properties (e.g. inside `apiResponse`).
 */
export function sanitizeForFirestore<T>(data: T): T {
  try {
    return JSON.parse(JSON.stringify(data)) as T;
  } catch {
    return data;
  }
}

const ORDER_STATUS_PRIORITY: Record<OrderStatus, number> = {
  Berhasil: 4,
  Gagal: 3,
  'Sedang diproses': 2,
  'Menunggu proses': 1
};

const DEPOSIT_STATUS_PRIORITY: Record<DepositStatus, number> = {
  Berhasil: 3,
  Ditolak: 3,
  'Menunggu Konfirmasi Admin': 1
};

export function mergeOrders(...lists: OrderTransaction[][]): OrderTransaction[] {
  const map = new Map<string, OrderTransaction>();

  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const ord of list) {
      if (!ord || !ord.id) continue;
      const existing = map.get(ord.id);
      if (!existing) {
        map.set(ord.id, ord);
        continue;
      }

      const existingPrio = ORDER_STATUS_PRIORITY[existing.status] ?? 0;
      const nextPrio = ORDER_STATUS_PRIORITY[ord.status] ?? 0;

      const preferred = nextPrio >= existingPrio ? ord : existing;
      const fallback = preferred === ord ? existing : ord;

      map.set(ord.id, {
        ...fallback,
        ...preferred,
        apiResponse: preferred.apiResponse ?? fallback.apiResponse,
        completedAt: preferred.completedAt || fallback.completedAt,
        errorNote: preferred.errorNote || fallback.errorNote,
        link: preferred.link || fallback.link,
        userEmail: preferred.userEmail || fallback.userEmail
      });
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function mergeDeposits(...lists: DepositTransaction[][]): DepositTransaction[] {
  const map = new Map<string, DepositTransaction>();

  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const dep of list) {
      if (!dep || !dep.id) continue;
      const existing = map.get(dep.id);
      if (!existing) {
        map.set(dep.id, dep);
        continue;
      }

      const existingPrio = DEPOSIT_STATUS_PRIORITY[existing.status] ?? 0;
      const nextPrio = DEPOSIT_STATUS_PRIORITY[dep.status] ?? 0;

      const preferred = nextPrio >= existingPrio ? dep : existing;
      const fallback = preferred === dep ? existing : dep;

      map.set(dep.id, {
        ...fallback,
        ...preferred,
        approvedAt: preferred.approvedAt || fallback.approvedAt,
        adminNote: preferred.adminNote || fallback.adminNote,
        userEmail: preferred.userEmail || fallback.userEmail
      });
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function getCacheKeys(uid?: string, email?: string): string[] {
  const keys: string[] = [];
  if (email && email.trim()) {
    keys.push(`am_tx_cache_email_${email.toLowerCase().trim()}`);
  }
  if (uid && uid.trim()) {
    keys.push(`am_tx_cache_uid_${uid.trim()}`);
  }
  return keys;
}

export function loadUserTransactionsCache(
  uid?: string,
  email?: string
): { orders: OrderTransaction[]; deposits: DepositTransaction[] } {
  if (typeof window === 'undefined') {
    return { orders: [], deposits: [] };
  }

  const orderLists: OrderTransaction[][] = [];
  const depositLists: DepositTransaction[][] = [];

  for (const key of getCacheKeys(uid, email)) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.orders)) orderLists.push(parsed.orders);
      if (Array.isArray(parsed?.deposits)) depositLists.push(parsed.deposits);
    } catch {
      // ignore corrupt cache
    }
  }

  return {
    orders: mergeOrders(...orderLists),
    deposits: mergeDeposits(...depositLists)
  };
}

export function saveUserTransactionsCache(
  uid: string | undefined,
  email: string | undefined,
  orders: OrderTransaction[],
  deposits: DepositTransaction[]
): void {
  if (typeof window === 'undefined') return;
  const payload = JSON.stringify({
    orders: mergeOrders(orders),
    deposits: mergeDeposits(deposits),
    updatedAt: new Date().toISOString()
  });

  for (const key of getCacheKeys(uid, email)) {
    try {
      localStorage.setItem(key, payload);
    } catch {
      // ignore storage quota errors
    }
  }
}

export function appendUserOrderCache(
  uid: string | undefined,
  email: string | undefined,
  order: OrderTransaction
): void {
  if (!order?.id) return;
  const current = loadUserTransactionsCache(uid, email);
  saveUserTransactionsCache(uid, email, mergeOrders([order], current.orders), current.deposits);
}

export function appendUserDepositCache(
  uid: string | undefined,
  email: string | undefined,
  deposit: DepositTransaction
): void {
  if (!deposit?.id) return;
  const current = loadUserTransactionsCache(uid, email);
  saveUserTransactionsCache(uid, email, current.orders, mergeDeposits([deposit], current.deposits));
}
