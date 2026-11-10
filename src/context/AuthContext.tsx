import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  db,
  doc,
  setDoc,
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
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  updateBalanceLocally: (newBalance: number) => void;
  changeUserRole: (uid: string, role: 'user' | 'admin') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  // Sync user profile with server and Firestore
  const syncUserWithServer = async (user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null }) => {
    try {
      const res = await fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email || `${user.uid}@am-premium.local`,
          name: user.displayName || user.email?.split('@')[0] || 'Member AM',
          photoURL: user.photoURL || ''
        })
      });
      if (res.ok) {
        const data: UserProfile = await res.json();
        setUserProfile(data);
        localStorage.setItem('am_active_session', JSON.stringify({
          uid: data.uid,
          email: data.email,
          displayName: data.name,
          photoURL: data.photoURL || ''
        }));

        // Mirror to Firestore so role can be modified in Firestore Console
        try {
          const userDocRef = doc(db, 'users', data.uid);
          setDoc(userDocRef, {
            uid: data.uid,
            email: data.email,
            name: data.name,
            role: data.role,
            balance: data.balance,
            status: data.status,
            createdAt: data.createdAt,
            updatedAt: new Date().toISOString()
          }, { merge: true }).catch((err) => {
            console.warn('Firestore write warning:', err);
          });
        } catch (e) {
          // ignore offline firestore
        }
      }
    } catch (err) {
      console.error('Failed to sync user with server:', err);
    }
  };

  // Refresh profile from server
  const refreshUserProfile = async () => {
    if (!userProfile?.uid) return;
    try {
      const res = await fetch(`/api/user/${userProfile.uid}`);
      if (res.ok) {
        const data: UserProfile = await res.json();
        setUserProfile(data);
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
            bulkApiUrl: 'https://am.dapjisync.my.id/api/send',
            bulkApiKey: '',
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
    // Call server login endpoint for guaranteed, rock-solid login
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password: pass })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Email atau password tidak sesuai.');
    }

    // Save session & set state
    setUserProfile(data.user);
    localStorage.setItem('am_active_session', JSON.stringify({
      uid: data.user.uid,
      email: data.user.email,
      displayName: data.user.name,
      photoURL: data.user.photoURL || ''
    }));

    // In background, also attempt Firebase login if credentials match
    signInWithEmailAndPassword(auth, email.trim(), pass).catch(() => {});
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    // Call server register endpoint for guaranteed, rock-solid registration
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        password: pass,
        name: name.trim()
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal melakukan pendaftaran akun.');
    }

    setUserProfile(data.user);
    localStorage.setItem('am_active_session', JSON.stringify({
      uid: data.user.uid,
      email: data.user.email,
      displayName: data.user.name,
      photoURL: data.user.photoURL || ''
    }));

    // In background, also attempt Firebase user creation if possible
    createUserWithEmailAndPassword(auth, email.trim(), pass).catch(() => {});
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      // If Firebase fails, notify server
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      if (!res.ok) {
        throw new Error('Email tidak ditemukan di sistem.');
      }
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

  // Real-time Firestore document listener to detect role changes in Firestore Console directly
  useEffect(() => {
    if (!userProfile?.uid) return;

    try {
      const userDocRef = doc(db, 'users', userProfile.uid);
      const unsubFirestore = onSnapshot(userDocRef, async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.role && data.role !== userProfile.role) {
            setUserProfile(prev => prev ? { ...prev, role: data.role } : null);
            // Sync with backend
            await fetch('/api/admin/users/role', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ uid: userProfile.uid, role: data.role })
            }).catch(() => {});
          }
        }
      }, () => {});

      return () => unsubFirestore();
    } catch {
      // ignore
    }
  }, [userProfile?.uid, userProfile?.role]);

  // Change user role both in Firestore and server
  const changeUserRole = async (targetUid: string, newRole: 'user' | 'admin') => {
    // 1. Update in Firestore directly
    try {
      const targetDocRef = doc(db, 'users', targetUid);
      await updateDoc(targetDocRef, { role: newRole }).catch(() => {
        return setDoc(targetDocRef, { role: newRole }, { merge: true });
      });
    } catch (e) {
      console.warn('Firestore role update note:', e);
    }

    // 2. Update on backend server
    await fetch('/api/admin/users/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: targetUid, role: newRole })
    });

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
