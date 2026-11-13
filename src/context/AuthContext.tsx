import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  db,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  updateDoc,
  FirebaseUser
} from '../lib/firebase.ts';
import { UserProfile, StoreSettings } from '../types/index.ts';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  storeSettings: StoreSettings | null;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (e: string, p: string) => Promise<void>;
  registerWithEmail: (e: string, p: string, name: string) => Promise<void>;
  resetPassword: (e: string) => Promise<void>;
  verifyResetCode: (oobCode: string) => Promise<string>;
  confirmResetPassword: (oobCode: string, newPass: string) => Promise<void>;
  changePassword: (currentPass: string, newPass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  updateBalanceLocally: (newBalance: number) => void;
  changeUserRole: (uid: string, role: 'user' | 'admin', userData?: UserProfile) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  // Sync user profile with Firestore (source of truth) and backend server
  const syncUserWithServer = async (user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null }) => {
    try {
      const normalizedEmail = (user.email || `${user.uid}@am-premium.local`).toLowerCase().trim();
      const isOwner = normalizedEmail === 'apriliansyahazril10@gmail.com';

      let fsBalance: number | undefined;
      let fsRole: 'user' | 'admin' | undefined = isOwner ? 'admin' : undefined;
      let fsStatus: 'active' | 'banned' | undefined;
      let fsName: string | undefined;
      let fsExists = false;

      // 1. Read existing user data from Firestore first so admin edits in Firebase are preserved
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const existingSnap = await getDoc(userDocRef);
        if (existingSnap.exists()) {
          fsExists = true;
          const fsData = existingSnap.data();
          if (typeof fsData.balance === 'number') fsBalance = fsData.balance;
          if (fsData.role === 'user' || fsData.role === 'admin') {
            fsRole = isOwner ? 'admin' : fsData.role;
          }
          if (fsData.status === 'active' || fsData.status === 'banned') {
            fsStatus = fsData.status;
          }
          if (typeof fsData.name === 'string' && fsData.name.trim()) {
            fsName = fsData.name;
          }
        }
      } catch {
        // ignore offline firestore read
      }

      // 2. Sync with backend server using Firestore values
      const res = await fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: normalizedEmail,
          name: fsName || user.displayName || normalizedEmail.split('@')[0] || 'Member AM',
          photoURL: user.photoURL || '',
          balance: fsBalance,
          role: fsRole,
          status: fsStatus
        })
      });

      if (res.ok) {
        const data: UserProfile = await res.json();
        if (isOwner && data.role !== 'admin') {
          data.role = 'admin';
        }
        setUserProfile(data);
        localStorage.setItem('am_active_session', JSON.stringify({
          uid: data.uid,
          email: data.email,
          displayName: data.name,
          photoURL: data.photoURL || ''
        }));

        // 3. Ensure Firestore document exists and stays synced without clobbering balance
        try {
          const userDocRef = doc(db, 'users', data.uid);
          if (fsExists) {
            await setDoc(userDocRef, {
              uid: data.uid,
              email: data.email,
              name: data.name,
              role: data.role,
              status: data.status,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          } else {
            await setDoc(userDocRef, {
              uid: data.uid,
              email: data.email,
              name: data.name,
              role: data.role,
              balance: data.balance,
              status: data.status,
              createdAt: data.createdAt,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }
        } catch (e) {
          // ignore offline firestore write
        }
      }
    } catch (err) {
      console.error('Failed to sync user with server:', err);
    }
  };

  // Refresh profile from Firestore and server
  const refreshUserProfile = async () => {
    if (!userProfile?.uid) return;
    try {
      let fsData: any = null;
      try {
        const snap = await getDoc(doc(db, 'users', userProfile.uid));
        if (snap.exists()) fsData = snap.data();
      } catch {
        // ignore
      }

      const res = await fetch(`/api/user/${userProfile.uid}`);
      if (res.ok) {
        const data: UserProfile = await res.json();
        if (fsData) {
          if (typeof fsData.balance === 'number') data.balance = fsData.balance;
          if (fsData.role === 'user' || fsData.role === 'admin') data.role = fsData.role;
          if (fsData.status === 'active' || fsData.status === 'banned') data.status = fsData.status;
        }
        setUserProfile(data);
      } else if (fsData) {
        setUserProfile(prev => prev ? {
          ...prev,
          balance: typeof fsData.balance === 'number' ? fsData.balance : prev.balance,
          role: fsData.role || prev.role,
          status: fsData.status || prev.status
        } : null);
      }
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
  };

  // Refresh store settings
  const refreshSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setStoreSettings(prev => ({
          storeOpen: data.storeOpen ?? true,
          depositOpen: data.depositOpen ?? true,
          maintenanceMode: data.maintenanceMode ?? false,
          apiConfiguration: prev?.apiConfiguration || {
            bulkApiUrl: 'https://am.dapjisync.my.id/api/bulk',
            bulkApiKey: '',
            sendApiUrl: 'https://am.dapjisync.my.id/api/send',
            sendApiKey: '',
            verifApiUrl: 'https://am.dapjisync.my.id/api/verif',
            verifApiKey: ''
          }
        }));
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  useEffect(() => {
    refreshSettings();

    // Check active local session first for instant resume
    const savedSession = localStorage.getItem('am_active_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        syncUserWithServer(parsed);
      } catch {
        // invalid session
      }
    }

    // Listen to Firebase auth state
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setCurrentUser(firebaseUser);
      if (firebaseUser) {
        await syncUserWithServer({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await syncUserWithServer({
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL
        });
      }
    } catch (err: any) {
      console.warn('Firebase Google Auth:', err);
      // If unauthorized domain or popup failure, check if owner
      throw new Error(err.message || 'Gagal login via Google. Pastikan popup diizinkan.');
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      const userCred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      if (userCred.user) {
        await syncUserWithServer({
          uid: userCred.user.uid,
          email: userCred.user.email,
          displayName: userCred.user.displayName,
          photoURL: userCred.user.photoURL
        });
      }
    } catch (err: any) {
      console.warn('Firebase login error:', err);
      if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password') {
        throw new Error('Email atau password salah.');
      } else if (err?.code === 'auth/user-not-found') {
        throw new Error('Akun belum terdaftar. Silakan daftar terlebih dahulu.');
      } else if (err?.code === 'auth/invalid-email') {
        throw new Error('Format email tidak valid.');
      } else if (err?.code === 'auth/too-many-requests') {
        throw new Error('Terlalu banyak percobaan login. Silakan coba lagi nanti.');
      } else if (err?.code === 'auth/user-disabled') {
        throw new Error('Akun ini telah dinonaktifkan.');
      }
      throw new Error(err?.message || 'Gagal masuk ke akun Firebase.');
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      if (name.trim()) {
        await updateProfile(userCred.user, { displayName: name.trim() }).catch(() => {});
      }
      await syncUserWithServer({
        uid: userCred.user.uid,
        email: userCred.user.email,
        displayName: name.trim() || userCred.user.displayName,
        photoURL: userCred.user.photoURL
      });
    } catch (err: any) {
      console.warn('Firebase register error:', err);
      if (err?.code === 'auth/email-already-in-use') {
        throw new Error('Email ini sudah terdaftar. Silakan langsung login.');
      } else if (err?.code === 'auth/weak-password') {
        throw new Error('Password terlalu lemah (minimal 6 karakter).');
      } else if (err?.code === 'auth/invalid-email') {
        throw new Error('Format email tidak valid.');
      }
      throw new Error(err?.message || 'Gagal melakukan pendaftaran akun.');
    }
  };

  const resetPassword = async (email: string) => {
    const targetEmail = email.trim();
    if (!targetEmail) {
      throw new Error('Masukkan alamat email terlebih dahulu.');
    }

    try {
      try {
        await sendPasswordResetEmail(auth, targetEmail, {
          url: window.location.origin,
          handleCodeInApp: false
        });
      } catch (continueErr: any) {
        if (
          continueErr?.code === 'auth/unauthorized-continue-uri' ||
          continueErr?.code === 'auth/invalid-continue-uri'
        ) {
          await sendPasswordResetEmail(auth, targetEmail);
        } else {
          throw continueErr;
        }
      }
    } catch (err: any) {
      console.warn('Firebase reset password error:', err);
      if (err?.code === 'auth/user-not-found') {
        throw new Error('Email tidak terdaftar di Firebase Authentication.');
      } else if (err?.code === 'auth/invalid-email') {
        throw new Error('Format alamat email tidak valid.');
      } else if (err?.code === 'auth/too-many-requests') {
        throw new Error('Terlalu banyak permintaan reset sandi. Tunggu beberapa saat lalu coba lagi.');
      } else if (err?.code === 'auth/missing-email') {
        throw new Error('Alamat email wajib diisi.');
      }
      throw new Error(err?.message || 'Gagal mengirim link reset sandi via Firebase.');
    }
  };

  const verifyResetCode = async (oobCode: string) => {
    try {
      return await verifyPasswordResetCode(auth, oobCode);
    } catch (err: any) {
      if (err?.code === 'auth/expired-action-code') {
        throw new Error('Link reset sandi sudah kedaluwarsa. Silakan kirim ulang link reset.');
      } else if (err?.code === 'auth/invalid-action-code') {
        throw new Error('Link reset sandi tidak valid atau sudah pernah digunakan.');
      }
      throw new Error(err?.message || 'Kode reset sandi tidak valid.');
    }
  };

  const confirmResetPassword = async (oobCode: string, newPass: string) => {
    try {
      await confirmPasswordReset(auth, oobCode, newPass);
    } catch (err: any) {
      if (err?.code === 'auth/weak-password') {
        throw new Error('Kata sandi baru terlalu lemah (minimal 6 karakter).');
      } else if (err?.code === 'auth/expired-action-code') {
        throw new Error('Link reset sandi sudah kedaluwarsa. Silakan kirim ulang.');
      } else if (err?.code === 'auth/invalid-action-code') {
        throw new Error('Link reset sandi tidak valid atau sudah digunakan.');
      }
      throw new Error(err?.message || 'Gagal mengubah kata sandi di Firebase.');
    }
  };

  const changePassword = async (currentPass: string, newPass: string) => {
    const fbUser = auth.currentUser;
    if (!fbUser || !fbUser.email) {
      throw new Error('Sesi Firebase tidak ditemukan. Silakan login ulang terlebih dahulu.');
    }

    try {
      const credential = EmailAuthProvider.credential(fbUser.email, currentPass);
      await reauthenticateWithCredential(fbUser, credential);
      await updatePassword(fbUser, newPass);
    } catch (err: any) {
      console.warn('Firebase updatePassword error:', err);
      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        throw new Error('Kata sandi lama yang Anda masukkan salah.');
      } else if (err?.code === 'auth/weak-password') {
        throw new Error('Kata sandi baru terlalu lemah (minimal 6 karakter).');
      } else if (err?.code === 'auth/requires-recent-login') {
        throw new Error('Demi keamanan, silakan keluar lalu login kembali sebelum mengubah sandi.');
      } else if (err?.code === 'auth/too-many-requests') {
        throw new Error('Terlalu banyak percobaan. Silakan coba lagi nanti.');
      }
      throw new Error(err?.message || 'Gagal mengubah kata sandi.');
    }
  };

  const logout = async () => {
    localStorage.removeItem('am_active_session');
    await firebaseSignOut(auth).catch(() => {});
    setCurrentUser(null);
    setUserProfile(null);
  };

  const updateBalanceLocally = (newBalance: number) => {
    setUserProfile(prev => prev ? { ...prev, balance: newBalance } : null);
  };

  // Real-time Firestore document listener to detect role, balance, or status updates directly
  useEffect(() => {
    if (!userProfile?.uid) return;

    try {
      const userDocRef = doc(db, 'users', userProfile.uid);
      const unsubFirestore = onSnapshot(userDocRef, async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const hasRoleChange = data.role && data.role !== userProfile.role;
          const hasBalanceChange = typeof data.balance === 'number' && data.balance !== userProfile.balance;
          const hasStatusChange = data.status && data.status !== userProfile.status;

          if (hasRoleChange || hasBalanceChange || hasStatusChange) {
            setUserProfile(prev => prev ? {
              ...prev,
              role: data.role || prev.role,
              balance: typeof data.balance === 'number' ? data.balance : prev.balance,
              status: data.status || prev.status
            } : null);

            // Sync updated balance/role/status back to backend server so API orders stay accurate
            await fetch('/api/user/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                uid: userProfile.uid,
                email: userProfile.email,
                name: data.name || userProfile.name,
                balance: typeof data.balance === 'number' ? data.balance : undefined,
                role: data.role,
                status: data.status
              })
            }).catch(() => {});
          }
        }
      }, () => {});

      return () => unsubFirestore();
    } catch {
      // ignore
    }
  }, [userProfile?.uid, userProfile?.role, userProfile?.balance, userProfile?.status]);

  // Change user role both in Firestore and server
  const changeUserRole = async (targetUid: string, newRole: 'user' | 'admin', userData?: UserProfile) => {
    // 1. Update in Firestore directly
    try {
      const targetDocRef = doc(db, 'users', targetUid);
      await setDoc(targetDocRef, { role: newRole, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e) {
      console.warn('Firestore role update note:', e);
    }

    // 2. Update on backend server
    await fetch('/api/admin/users/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: targetUid, role: newRole, userData })
    }).catch(() => {});

    // 3. Update locally if current user
    if (userProfile?.uid === targetUid) {
      setUserProfile(prev => prev ? { ...prev, role: newRole } : null);
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      userProfile,
      loading,
      storeSettings,
      loginWithGoogle,
      loginWithEmail,
      registerWithEmail,
      resetPassword,
      verifyResetCode,
      confirmResetPassword,
      changePassword,
      logout,
      refreshUserProfile,
      refreshSettings,
      updateBalanceLocally,
      changeUserRole
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
