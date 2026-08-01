import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  type Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  applyActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId,
  );
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }
  if (!app) {
    app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  if (!auth) {
    auth = getAuth(app);
  }
  return auth;
}

export async function firebaseSignIn(email: string, password: string) {
  const result = await signInWithEmailAndPassword(
    getFirebaseAuth(),
    email.trim().toLowerCase(),
    password,
  );
  return result.user;
}

export async function firebaseRegister(email: string, password: string) {
  const result = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    email.trim().toLowerCase(),
    password,
  );
  await sendEmailVerification(result.user);
  return result.user;
}

export async function firebaseForgotPassword(email: string) {
  await sendPasswordResetEmail(getFirebaseAuth(), email.trim().toLowerCase());
}

export async function firebaseSignOut() {
  if (!isFirebaseConfigured()) return;
  await signOut(getFirebaseAuth());
}

export async function getFirebaseIdToken(user?: User | null): Promise<string | null> {
  if (!isFirebaseConfigured()) return null;
  const current = user ?? getFirebaseAuth().currentUser;
  if (!current) return null;
  return current.getIdToken();
}

export function subscribeFirebaseAuth(onChange: (user: User | null) => void) {
  if (!isFirebaseConfigured()) {
    onChange(null);
    return () => {};
  }
  return onAuthStateChanged(getFirebaseAuth(), onChange);
}

export async function firebaseVerifyEmail(oobCode: string) {
  await applyActionCode(getFirebaseAuth(), oobCode);
}

export async function firebaseConfirmReset(oobCode: string, newPassword: string) {
  await verifyPasswordResetCode(getFirebaseAuth(), oobCode);
  await confirmPasswordReset(getFirebaseAuth(), oobCode, newPassword);
}

export { type User as FirebaseUser };
