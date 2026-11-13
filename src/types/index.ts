export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'banned';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  balance: number;
  role: UserRole;
  createdAt: string;
  status: UserStatus;
}

export interface ProductItem {
  id: string; // 'bulk-am' | 'am-verif'
  name: string;
  price: number;
  image: string;
  description: string;
  active: boolean;
}

export type DepositStatus = 'Menunggu Konfirmasi Admin' | 'Berhasil' | 'Ditolak';

export interface DepositTransaction {
  id: string;
  uid: string;
  userEmail: string;
  amount: number;
  senderName: string;
  status: DepositStatus;
  createdAt: string;
  approvedAt?: string;
  adminNote?: string;
}

export type OrderStatus = 'Menunggu proses' | 'Sedang diproses' | 'Berhasil' | 'Gagal';

export interface OrderTransaction {
  id: string;
  uid: string;
  userEmail: string;
  productId: string;
  productName: string;
  email: string; // target account gmail
  quantity: number;
  totalPrice: number;
  status: OrderStatus;
  apiResponse?: any;
  link?: string; // for AM Verif
  createdAt: string;
  completedAt?: string;
  errorNote?: string;
}

export interface ApiConfiguration {
  bulkApiUrl: string;
  bulkApiKey: string;
  sendApiUrl?: string;
  sendApiKey?: string;
  verifApiUrl: string;
  verifApiKey: string;
}

export interface StoreSettings {
  storeOpen: boolean;
  depositOpen: boolean;
  maintenanceMode: boolean;
  apiConfiguration: ApiConfiguration;
}

export interface AuditLog {
  id: string;
  adminEmail: string;
  action: string;
  targetUser?: string;
  details: string;
  timestamp: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalTransactions: number;
  totalDeposit: number;
  totalRevenue: number;
  successfulOrders: number;
  pendingDeposits: number;
}
