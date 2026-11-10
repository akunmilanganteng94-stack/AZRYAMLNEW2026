import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { 
  UserProfile, 
  ProductItem, 
  DepositTransaction, 
  OrderTransaction, 
  StoreSettings, 
  AuditLog, 
  DashboardStats 
} from './src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Database persistence directory
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial default state
interface DatabaseSchema {
  users: Record<string, UserProfile>;
  products: ProductItem[];
  deposits: DepositTransaction[];
  orders: OrderTransaction[];
  settings: StoreSettings;
  auditLogs: AuditLog[];
}

const PRODUCT_BANNER_IMG = 'https://cdn.corenexis.com/f/hUimw94N.webp';

const defaultProducts: ProductItem[] = [
  {
    id: 'bulk-am',
    name: 'Bulk AM',
    price: 200,
    image: PRODUCT_BANNER_IMG,
    description: 'Layanan inject akun Alight Motion Bulk cepat, stabil, dan otomatis (1 - 5 akun sekaligus).',
    active: true
  },
  {
    id: 'am-verif',
    name: 'AM Verif',
    price: 300,
    image: PRODUCT_BANNER_IMG,
    description: 'Verifikasi resmi akun Alight Motion via link autentikasi langsung dengan proses terjamin.',
    active: true
  }
];

const defaultSettings: StoreSettings = {
  storeOpen: true,
  depositOpen: true,
  maintenanceMode: false,
  apiConfiguration: {
    bulkApiUrl: 'https://am.dapjisync.my.id/api/send',
    bulkApiKey: 'API_KEY_BULK',
    verifApiUrl: 'https://am.dapjisync.my.id/api/verif',
    verifApiKey: 'API_KEY_VERIF'
  }
};

let db: DatabaseSchema = {
  users: {},
  products: defaultProducts,
  deposits: [],
  orders: [],
  settings: defaultSettings,
  auditLogs: []
};

// Load database from file
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      const loadedProducts: ProductItem[] = parsed.products && parsed.products.length ? parsed.products : defaultProducts;
      
      // Ensure product images use the required horizontal product banner
      loadedProducts.forEach(p => {
        if (!p.image || p.image.includes('bulk-am.jpg') || p.image.includes('am-verif.jpg')) {
          p.image = PRODUCT_BANNER_IMG;
        }
      });

      db = {
        users: parsed.users || {},
        products: loadedProducts,
        deposits: parsed.deposits || [],
        orders: parsed.orders || [],
        settings: parsed.settings ? { ...defaultSettings, ...parsed.settings } : defaultSettings,
        auditLogs: parsed.auditLogs || []
      };
    } else {
      saveDatabase();
    }
  } catch (err) {
    console.error('Failed to load DB file, using memory DB:', err);
  }
}

// Save database to file atomically
function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save DB file:', err);
  }
}

loadDatabase();

// Pre-register owner email as admin
const OWNER_EMAIL = 'apriliansyahazril10@gmail.com';

// Middleware to verify admin rights
function verifyAdmin(req: Request, res: Response, next: NextFunction) {
  const adminUid = req.headers['x-admin-uid'] as string;
  const adminEmail = (req.headers['x-admin-email'] as string || '').toLowerCase().trim();

  // If email matches owner, or user record has role admin
  if (adminEmail === OWNER_EMAIL.toLowerCase()) {
    return next();
  }

  if (adminUid && db.users[adminUid] && db.users[adminUid].role === 'admin') {
    return next();
  }

  return res.status(403).json({ error: 'Akses ditolak. Tindakan ini memerlukan hak administrator.' });
}

/* =========================================================
   PUBLIC / GENERAL ENDPOINTS
   ========================================================= */

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Store settings (Sanitized for public: Hide API Keys)
app.get('/api/settings', (req, res) => {
  const safeSettings = {
    storeOpen: db.settings.storeOpen,
    depositOpen: db.settings.depositOpen,
    maintenanceMode: db.settings.maintenanceMode,
    bulkApiConfigured: Boolean(db.settings.apiConfiguration?.bulkApiKey && db.settings.apiConfiguration?.bulkApiKey !== 'API_KEY_BULK'),
    verifApiConfigured: Boolean(db.settings.apiConfiguration?.verifApiKey && db.settings.apiConfiguration?.verifApiKey !== 'API_KEY_VERIF')
  };
  res.json(safeSettings);
});

// Products
app.get('/api/products', (req, res) => {
  res.json(db.products);
});

// Sync user on login
app.post('/api/user/sync', (req, res) => {
  const { uid, email, name, photoURL } = req.body;
  if (!uid || !email) {
    return res.status(400).json({ error: 'Missing UID or email' });
  }

  const normalizedEmail = (email || '').toLowerCase().trim();
  const isOwner = normalizedEmail === OWNER_EMAIL.toLowerCase();

  let user = db.users[uid];
  if (!user) {
    // Check if user previously existed under same email
    const existingUid = Object.keys(db.users).find(k => db.users[k].email.toLowerCase() === normalizedEmail);
    if (existingUid) {
      user = db.users[existingUid];
      // migrate to new uid if needed
      delete db.users[existingUid];
      user.uid = uid;
    } else {
      user = {
        uid,
        name: name || email.split('@')[0],
        email: normalizedEmail,
        photoURL: photoURL || '',
        balance: isOwner ? 100000 : 0, // Gift initial balance to store owner
        role: isOwner ? 'admin' : 'user',
        createdAt: new Date().toISOString(),
        status: 'active'
      };
    }
  }

  // Update profile details
  user.name = name || user.name;
  user.photoURL = photoURL || user.photoURL;
  if (isOwner) {
    user.role = 'admin';
  }

  db.users[uid] = user;
  saveDatabase();

  res.json(user);
});

// User Registration endpoint (failsafe, reliable & persistent)
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Format email tidak valid.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password minimal 6 karakter.' });
  }

  // Check if email already registered
  const existingUser = Object.values(db.users).find(u => u.email.toLowerCase() === normalizedEmail);
  if (existingUser) {
    return res.status(400).json({ error: 'Email sudah terdaftar. Silakan langsung login.' });
  }

  const isOwner = normalizedEmail === OWNER_EMAIL.toLowerCase();
  const uid = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

  const newUser: UserProfile & { password?: string } = {
    uid,
    name: name?.trim() || normalizedEmail.split('@')[0],
    email: normalizedEmail,
    photoURL: '',
    balance: isOwner ? 100000 : 0,
    role: isOwner ? 'admin' : 'user',
    createdAt: new Date().toISOString(),
    status: 'active',
    password: password
  };

  db.users[uid] = newUser;
  saveDatabase();

  const { password: _, ...safeUser } = newUser;
  res.json({ success: true, user: safeUser });
});

// User Login endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const isOwner = normalizedEmail === OWNER_EMAIL.toLowerCase();

  let user = Object.values(db.users).find(u => u.email.toLowerCase() === normalizedEmail) as (UserProfile & { password?: string }) | undefined;

  if (!user) {
    // If it's the owner email, auto-create immediately so owner can never be locked out
    if (isOwner) {
      const uid = 'owner_' + Date.now().toString(36);
      user = {
        uid,
        name: 'AZRYL (Admin Owner)',
        email: normalizedEmail,
        photoURL: '',
        balance: 100000,
        role: 'admin',
        createdAt: new Date().toISOString(),
        status: 'active',
        password: password
      };
      db.users[uid] = user;
      saveDatabase();
    } else {
      return res.status(404).json({ error: 'Email belum terdaftar. Silakan klik "Daftar sekarang" terlebih dahulu.' });
    }
  }

  if (user.status === 'banned') {
    return res.status(403).json({ error: 'Akun Anda sedang ditangguhkan. Silakan hubungi admin.' });
  }

  // Check password if set
  if (user.password && user.password !== password) {
    return res.status(401).json({ error: 'Password yang Anda masukkan salah.' });
  }

  // If user had no password set, set it now
  if (!user.password) {
    user.password = password;
    saveDatabase();
  }

  const { password: _, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

// User Reset Password endpoint
app.post('/api/auth/reset-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email wajib diisi.' });
  }
  const normalizedEmail = email.toLowerCase().trim();
  const user = Object.values(db.users).find(u => u.email.toLowerCase() === normalizedEmail);
  if (!user) {
    return res.status(404).json({ error: 'Email tidak ditemukan di sistem.' });
  }
  res.json({ success: true, message: 'Permintaan reset password berhasil diproses.' });
});

// Get user profile by UID
app.get('/api/user/:uid', (req, res) => {
  const { uid } = req.params;
  const user = db.users[uid];
  if (!user) {
    return res.status(404).json({ error: 'User tidak ditemukan' });
  }
  res.json(user);
});

// Get user transactions (deposits & orders)
app.get('/api/transactions/:uid', (req, res) => {
  const { uid } = req.params;
  const userOrders = db.orders.filter(o => o.uid === uid).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const userDeposits = db.deposits.filter(d => d.uid === uid).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ orders: userOrders, deposits: userDeposits });
});

/* =========================================================
   DEPOSIT SYSTEM (QRIS)
   ========================================================= */

// Create new deposit
app.post('/api/deposits', (req, res) => {
  if (!db.settings.depositOpen) {
    return res.status(403).json({ error: 'Layanan deposit sedang ditutup sementara oleh admin.' });
  }

  const { uid, amount, senderName } = req.body;
  if (!uid || !amount || !senderName) {
    return res.status(400).json({ error: 'Data deposit tidak lengkap.' });
  }

  const numericAmount = Math.floor(Number(amount));
  if (isNaN(numericAmount) || numericAmount < 500) {
    return res.status(400).json({ error: 'Minimal deposit adalah 500.' });
  }

  const user = db.users[uid];
  if (!user) {
    return res.status(404).json({ error: 'User tidak ditemukan.' });
  }

  if (user.status === 'banned') {
    return res.status(403).json({ error: 'Akun Anda ditangguhkan. Tidak dapat melakukan deposit.' });
  }

  const depositId = 'DEP-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);

  const newDeposit: DepositTransaction = {
    id: depositId,
    uid,
    userEmail: user.email,
    amount: numericAmount,
    senderName: senderName.trim(),
    status: 'Menunggu Konfirmasi Admin',
    createdAt: new Date().toISOString()
  };

  db.deposits.unshift(newDeposit);
  saveDatabase();

  res.json({ success: true, deposit: newDeposit });
});

/* =========================================================
   ORDER SERVICES (BULK AM & AM VERIF)
   ========================================================= */

// Process Bulk AM Order
app.post('/api/orders/bulk', async (req, res) => {
  if (!db.settings.storeOpen) {
    return res.status(403).json({ error: 'Toko sedang tutup. Pemesanan sementara tidak dapat dilakukan.' });
  }

  const { uid, quantity } = req.body;
  if (!uid || !quantity) {
    return res.status(400).json({ error: 'Parameter pemesanan tidak lengkap.' });
  }

  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty < 1 || qty > 5) {
    return res.status(400).json({ error: 'Jumlah produk harus antara 1 sampai 5 akun.' });
  }

  const user = db.users[uid];
  if (!user) {
    return res.status(404).json({ error: 'User tidak ditemukan.' });
  }

  if (user.status === 'banned') {
    return res.status(403).json({ error: 'Akun Anda ditangguhkan.' });
  }

  const product = db.products.find(p => p.id === 'bulk-am');
  if (!product || !product.active) {
    return res.status(400).json({ error: 'Produk Bulk AM sedang tidak tersedia.' });
  }

  const totalPrice = product.price * qty;

  // ATOMIC BALANCE CHECK
  if (user.balance < totalPrice) {
    return res.status(400).json({ 
      error: `Saldo tidak mencukupi! Dibutuhkan ${totalPrice.toLocaleString()}, saldo Anda ${user.balance.toLocaleString()}.` 
    });
  }

  // ATOMIC BALANCE DEDUCTION
  user.balance -= totalPrice;

  const orderId = 'ORD-BULK-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);

  const order: OrderTransaction = {
    id: orderId,
    uid,
    userEmail: user.email,
    productId: 'bulk-am',
    productName: 'Bulk AM',
    email: `${qty} Akun Bulk AM`,
    quantity: qty,
    totalPrice,
    status: 'Sedang diproses',
    createdAt: new Date().toISOString()
  };

  db.orders.unshift(order);
  saveDatabase();

  // Process via external Bulk API
  const bulkApiUrl = db.settings.apiConfiguration?.bulkApiUrl || 'https://am.dapjisync.my.id/api/send';
  const bulkApiKey = db.settings.apiConfiguration?.bulkApiKey || 'API_KEY_BULK';

  // Process accounts sequentially (1 request per account)
  const results: any[] = [];
  let successfulRequests = 0;

  try {
    for (let i = 0; i < qty; i++) {
      try {
        const response = await fetch(bulkApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-apikey': bulkApiKey
          },
          body: JSON.stringify({ gmail: user.email || 'bulk@am-premium.local' }),
          signal: AbortSignal.timeout(15000)
        });

        const data = await response.json().catch(() => ({ rawStatus: response.status }));
        results.push({ attempt: i + 1, statusCode: response.status, data });

        if (response.ok) {
          successfulRequests++;
        }
      } catch (err: any) {
        results.push({ attempt: i + 1, error: err.message || 'Connection error' });
      }
    }

    // Determine final status
    if (successfulRequests === qty) {
      order.status = 'Berhasil';
      order.completedAt = new Date().toISOString();
      order.apiResponse = { successfulRequests, results };
    } else if (successfulRequests > 0) {
      order.status = 'Berhasil';
      order.completedAt = new Date().toISOString();
      order.errorNote = `Berhasil ${successfulRequests} dari ${qty} akun.`;
      order.apiResponse = { successfulRequests, results };
      // Partial refund for failed accounts
      const refundAmount = product.price * (qty - successfulRequests);
      user.balance += refundAmount;
    } else {
      order.status = 'Gagal';
      order.completedAt = new Date().toISOString();
      order.errorNote = 'Gagal memproses via server API. Saldo telah dikembalikan secara otomatis.';
      order.apiResponse = { results };
      // Full refund
      user.balance += totalPrice;
    }
  } catch (err: any) {
    order.status = 'Gagal';
    order.errorNote = err.message || 'Server error saat mengirim permintaan';
    // Full refund on unexpected failure
    user.balance += totalPrice;
  }

  saveDatabase();

  res.json({
    success: order.status === 'Berhasil',
    order,
    currentBalance: user.balance,
    message: order.status === 'Berhasil' 
      ? `Pesanan Bulk AM (${qty} akun) berhasil diproses!`
      : `Pesanan gagal: ${order.errorNote}`
  });
});

// Process AM Verif Order
app.post('/api/orders/verif', async (req, res) => {
  if (!db.settings.storeOpen) {
    return res.status(403).json({ error: 'Toko sedang tutup. Pemesanan sementara tidak dapat dilakukan.' });
  }

  const { uid, email, link } = req.body;
  if (!uid || !email || !link) {
    return res.status(400).json({ error: 'Email dan link verifikasi wajib diisi.' });
  }

  const targetEmail = email.trim();
  const targetLink = link.trim();

  const user = db.users[uid];
  if (!user) {
    return res.status(404).json({ error: 'User tidak ditemukan.' });
  }

  if (user.status === 'banned') {
    return res.status(403).json({ error: 'Akun Anda ditangguhkan.' });
  }

  const product = db.products.find(p => p.id === 'am-verif');
  if (!product || !product.active) {
    return res.status(400).json({ error: 'Produk AM Verif sedang tidak tersedia.' });
  }

  const price = product.price;

  // ATOMIC BALANCE CHECK
  if (user.balance < price) {
    return res.status(400).json({ 
      error: `Saldo tidak mencukupi! Dibutuhkan ${price.toLocaleString()}, saldo Anda ${user.balance.toLocaleString()}.` 
    });
  }

  // ATOMIC BALANCE DEDUCTION
  user.balance -= price;

  const orderId = 'ORD-VERIF-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);

  const order: OrderTransaction = {
    id: orderId,
    uid,
    userEmail: user.email,
    productId: 'am-verif',
    productName: 'AM Verif',
    email: targetEmail,
    quantity: 1,
    totalPrice: price,
    status: 'Sedang diproses',
    link: targetLink,
    createdAt: new Date().toISOString()
  };

  db.orders.unshift(order);
  saveDatabase();

  const verifApiUrl = db.settings.apiConfiguration?.verifApiUrl || 'https://am.dapjisync.my.id/api/verif';
  const verifApiKey = db.settings.apiConfiguration?.verifApiKey || 'API_KEY_VERIF';

  try {
    const response = await fetch(verifApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-apikey': verifApiKey
      },
      body: JSON.stringify({
        gmail: targetEmail,
        link: targetLink
      }),
      signal: AbortSignal.timeout(20000)
    });

    const data = await response.json().catch(() => ({ rawStatus: response.status }));
    order.apiResponse = data;
    order.completedAt = new Date().toISOString();

    if (response.ok && (data.success !== false && data.status !== 'error')) {
      order.status = 'Berhasil';
    } else {
      order.status = 'Gagal';
      order.errorNote = data.message || data.error || 'Server menolak link verifikasi.';
      // Refund balance
      user.balance += price;
    }
  } catch (err: any) {
    order.status = 'Gagal';
    order.completedAt = new Date().toISOString();
    order.errorNote = err.message || 'Koneksi ke API Verif bermasalah. Saldo otomatis dikembalikan.';
    // Refund balance
    user.balance += price;
  }

  saveDatabase();

  res.json({
    success: order.status === 'Berhasil',
    order,
    currentBalance: user.balance,
    message: order.status === 'Berhasil' 
      ? 'Verifikasi akun AM berhasil terkonfirmasi!' 
      : `Verifikasi gagal: ${order.errorNote}`
  });
});

/* =========================================================
   ADMIN PANEL PROTECTED ENDPOINTS
   ========================================================= */

// Admin Dashboard stats
app.get('/api/admin/stats', verifyAdmin, (req, res) => {
  const totalUsers = Object.keys(db.users).length;
  const totalTransactions = db.orders.length + db.deposits.length;
  const totalDeposit = db.deposits
    .filter(d => d.status === 'Berhasil')
    .reduce((sum, d) => sum + d.amount, 0);
  const totalRevenue = db.orders
    .filter(o => o.status === 'Berhasil')
    .reduce((sum, o) => sum + o.totalPrice, 0);
  const successfulOrders = db.orders.filter(o => o.status === 'Berhasil').length;
  const pendingDeposits = db.deposits.filter(d => d.status === 'Menunggu Konfirmasi Admin').length;

  const stats: DashboardStats = {
    totalUsers,
    totalTransactions,
    totalDeposit,
    totalRevenue,
    successfulOrders,
    pendingDeposits
  };

  res.json(stats);
});

// Admin Get all users
app.get('/api/admin/users', verifyAdmin, (req, res) => {
  res.json(Object.values(db.users));
});

// Admin Get all deposits
app.get('/api/admin/deposits', verifyAdmin, (req, res) => {
  res.json(db.deposits);
});

// Admin Get all orders
app.get('/api/admin/orders', verifyAdmin, (req, res) => {
  res.json(db.orders);
});

// Admin Get settings (including API keys)
app.get('/api/admin/settings', verifyAdmin, (req, res) => {
  res.json(db.settings);
});

// Admin Update settings
app.post('/api/admin/settings', verifyAdmin, (req, res) => {
  const { storeOpen, depositOpen, maintenanceMode, apiConfiguration } = req.body;
  const adminEmail = req.headers['x-admin-email'] as string || 'Admin';

  if (typeof storeOpen === 'boolean') db.settings.storeOpen = storeOpen;
  if (typeof depositOpen === 'boolean') db.settings.depositOpen = depositOpen;
  if (typeof maintenanceMode === 'boolean') db.settings.maintenanceMode = maintenanceMode;
  if (apiConfiguration) {
    db.settings.apiConfiguration = {
      ...db.settings.apiConfiguration,
      ...apiConfiguration
    };
  }

  // Audit log
  db.auditLogs.unshift({
    id: 'AUD-' + Date.now().toString(36),
    adminEmail,
    action: 'UPDATE_SETTINGS',
    details: `Toko: ${db.settings.storeOpen ? 'Buka' : 'Tutup'}, Deposit: ${db.settings.depositOpen ? 'Buka' : 'Tutup'}`,
    timestamp: new Date().toISOString()
  });

  saveDatabase();
  res.json({ success: true, settings: db.settings });
});

// Admin Approve / Reject Deposit
app.post('/api/admin/deposits/action', verifyAdmin, (req, res) => {
  const { depositId, action, adminNote } = req.body;
  const adminEmail = req.headers['x-admin-email'] as string || 'Admin';

  if (!depositId || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Parameter persetujuan tidak valid.' });
  }

  const deposit = db.deposits.find(d => d.id === depositId);
  if (!deposit) {
    return res.status(404).json({ error: 'Permintaan deposit tidak ditemukan.' });
  }

  // Prevent duplicate approval or re-processing
  if (deposit.status !== 'Menunggu Konfirmasi Admin') {
    return res.status(400).json({ error: `Deposit ini telah berstatus '${deposit.status}', tidak dapat diproses ulang.` });
  }

  const user = db.users[deposit.uid];
  if (!user && action === 'approve') {
    return res.status(404).json({ error: 'Pengguna akun deposit tidak ditemukan.' });
  }

  if (action === 'approve') {
    deposit.status = 'Berhasil';
    deposit.approvedAt = new Date().toISOString();
    deposit.adminNote = adminNote || 'Disetujui oleh admin';
    
    // Add balance atomically
    user.balance += deposit.amount;

    db.auditLogs.unshift({
      id: 'AUD-' + Date.now().toString(36),
      adminEmail,
      action: 'APPROVE_DEPOSIT',
      targetUser: deposit.userEmail,
      details: `Menyetujui deposit ID ${deposit.id} sebesar ${deposit.amount.toLocaleString()}. Saldo akhir: ${user.balance.toLocaleString()}`,
      timestamp: new Date().toISOString()
    });
  } else {
    deposit.status = 'Ditolak';
    deposit.approvedAt = new Date().toISOString();
    deposit.adminNote = adminNote || 'Deposit ditolak oleh admin.';

    db.auditLogs.unshift({
      id: 'AUD-' + Date.now().toString(36),
      adminEmail,
      action: 'REJECT_DEPOSIT',
      targetUser: deposit.userEmail,
      details: `Menolak deposit ID ${deposit.id} sebesar ${deposit.amount.toLocaleString()}. Alasan: ${deposit.adminNote}`,
      timestamp: new Date().toISOString()
    });
  }

  saveDatabase();

  res.json({
    success: true,
    message: action === 'approve' ? 'Deposit berhasil disetujui & saldo ditambahkan.' : 'Deposit berhasil ditolak.',
    deposit
  });
});

// Admin Adjust User Balance
app.post('/api/admin/users/balance', verifyAdmin, (req, res) => {
  const { uid, newBalance, reason } = req.body;
  const adminEmail = req.headers['x-admin-email'] as string || 'Admin';

  if (!uid || typeof newBalance !== 'number' || newBalance < 0) {
    return res.status(400).json({ error: 'Nominal saldo tidak valid (harus angka positif).' });
  }

  const user = db.users[uid];
  if (!user) {
    return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  }

  const prevBalance = user.balance;
  user.balance = Math.floor(newBalance);

  db.auditLogs.unshift({
    id: 'AUD-' + Date.now().toString(36),
    adminEmail,
    action: 'ADJUST_BALANCE',
    targetUser: user.email,
    details: `Ubah saldo dari ${prevBalance.toLocaleString()} menjadi ${user.balance.toLocaleString()}. Alasan: ${reason || 'Penyesuaian manual oleh admin'}`,
    timestamp: new Date().toISOString()
  });

  saveDatabase();

  res.json({ success: true, user });
});

// Admin Update User Status (active / banned)
app.post('/api/admin/users/status', verifyAdmin, (req, res) => {
  const { uid, status } = req.body;
  const adminEmail = req.headers['x-admin-email'] as string || 'Admin';

  if (!uid || !['active', 'banned'].includes(status)) {
    return res.status(400).json({ error: 'Status tidak valid.' });
  }

  const user = db.users[uid];
  if (!user) {
    return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  }

  user.status = status;

  db.auditLogs.unshift({
    id: 'AUD-' + Date.now().toString(36),
    adminEmail,
    action: 'UPDATE_USER_STATUS',
    targetUser: user.email,
    details: `Ubah status akun menjadi ${status}`,
    timestamp: new Date().toISOString()
  });

  saveDatabase();

  res.json({ success: true, user });
});

// Admin / Firestore User Role Update (changes role to user or admin)
app.post('/api/admin/users/role', (req, res) => {
  const { uid, role } = req.body;
  const adminEmail = req.headers['x-admin-email'] as string || 'Admin';

  if (!uid || !['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Role tidak valid (harus user atau admin).' });
  }

  const user = db.users[uid];
  if (!user) {
    return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  }

  user.role = role;

  db.auditLogs.unshift({
    id: 'AUD-' + Date.now().toString(36),
    adminEmail,
    action: 'UPDATE_USER_ROLE',
    targetUser: user.email,
    details: `Ubah role akun menjadi ${role.toUpperCase()}`,
    timestamp: new Date().toISOString()
  });

  saveDatabase();

  res.json({ success: true, user });
});

// Admin Update Product
app.post('/api/admin/products', verifyAdmin, (req, res) => {
  const { id, price, image, description, active } = req.body;
  const adminEmail = req.headers['x-admin-email'] as string || 'Admin';

  const product = db.products.find(p => p.id === id);
  if (!product) {
    return res.status(404).json({ error: 'Produk tidak ditemukan.' });
  }

  if (typeof price === 'number' && price > 0) product.price = Math.floor(price);
  if (typeof image === 'string' && image.trim()) product.image = image.trim();
  if (typeof description === 'string') product.description = description.trim();
  if (typeof active === 'boolean') product.active = active;

  db.auditLogs.unshift({
    id: 'AUD-' + Date.now().toString(36),
    adminEmail,
    action: 'UPDATE_PRODUCT',
    details: `Update produk ${product.name}: Harga=${product.price}P, Aktif=${product.active}`,
    timestamp: new Date().toISOString()
  });

  saveDatabase();

  res.json({ success: true, product });
});

// Admin Test API Connection
app.post('/api/admin/test-api', verifyAdmin, async (req, res) => {
  const { type, url, apiKey } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL API wajib diisi.' });
  }

  try {
    const testBody = type === 'bulk' 
      ? { gmail: 'ping-test@example.com' } 
      : { gmail: 'ping-test@example.com', link: 'https://test-link.com' };

    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-apikey': apiKey || ''
      },
      body: JSON.stringify(testBody),
      signal: AbortSignal.timeout(10000)
    });

    const duration = Date.now() - startTime;
    const data = await response.json().catch(() => ({}));

    res.json({
      success: true,
      statusCode: response.status,
      durationMs: duration,
      response: data
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Gagal menghubungi server API endpoint.'
    });
  }
});

// Admin Get Audit Logs
app.get('/api/admin/audit-logs', verifyAdmin, (req, res) => {
  res.json(db.auditLogs.slice(0, 50));
});

/* =========================================================
   VITE DEV MIDDLEWARE / STATIC FILES
   ========================================================= */

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  // Serve static files from public folder
  app.use(express.static(path.join(__dirname, 'public')));

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AM PREMIUM] Full-stack Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
