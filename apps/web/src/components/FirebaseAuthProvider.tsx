'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { User } from 'firebase/auth';
import {
  firebaseSignOut,
  isFirebaseConfigured,
  subscribeFirebaseAuth,
} from '@/lib/firebase';
import {
  clearSession,
  getStoredProfile,
  setSession,
  type StoredProfile,
} from '@/lib/auth';
import { api } from '@/lib/api';

type AuthContextValue = {
  ready: boolean;
  firebaseEnabled: boolean;
  user: User | null;
  profile: StoredProfile | null;
  authenticated: boolean;
  signOutAll: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function FirebaseAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const firebaseEnabled = isFirebaseConfigured();
  const [ready, setReady] = useState(!firebaseEnabled);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StoredProfile | null>(null);

  const syncApiSession = useCallback(async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      clearSession();
      setProfile(null);
      return false;
    }
    await firebaseUser.reload();
    const idToken = await firebaseUser.getIdToken(true);
    if (!idToken) return false;
    try {
      const data = await api<{
        accessToken: string;
        refreshToken: string;
        profile: StoredProfile;
      }>('/auth/firebase/session', {
        method: 'POST',
        auth: false,
        body: { idToken },
      });
      setSession(data);
      setProfile(data.profile);
      return true;
    } catch {
      clearSession();
      setProfile(null);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!firebaseEnabled) {
      setProfile(getStoredProfile());
      setReady(true);
      return;
    }

    return subscribeFirebaseAuth(async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        await syncApiSession(nextUser);
      } else {
        clearSession();
        setProfile(null);
      }
      setReady(true);
    });
  }, [firebaseEnabled, syncApiSession]);

  const signOutAll = useCallback(async () => {
    if (firebaseEnabled) {
      await firebaseSignOut();
    }
    clearSession();
    setUser(null);
    setProfile(null);
  }, [firebaseEnabled]);

  const refreshSession = useCallback(async () => {
    if (firebaseEnabled && user) {
      return syncApiSession(user);
    }
    return Boolean(getStoredProfile());
  }, [firebaseEnabled, user, syncApiSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      firebaseEnabled,
      user,
      profile,
      authenticated: firebaseEnabled
        ? Boolean(user && profile)
        : Boolean(getStoredProfile()),
      signOutAll,
      refreshSession,
    }),
    [ready, firebaseEnabled, user, profile, signOutAll, refreshSession],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within FirebaseAuthProvider');
  }
  return ctx;
}
