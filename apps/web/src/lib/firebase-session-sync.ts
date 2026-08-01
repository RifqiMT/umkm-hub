import { api } from './api';
import { setSession, type StoredProfile } from './auth';
import { getFirebaseAuth, isFirebaseConfigured } from './firebase';

/** Push Firebase emailVerified into the API profile (refreshes ID token first). */
export async function syncFirebaseVerificationToApi(): Promise<boolean> {
  if (!isFirebaseConfigured()) return false;

  const user = getFirebaseAuth().currentUser;
  if (!user) return false;

  await user.reload();
  if (!user.emailVerified) return false;

  const idToken = await user.getIdToken(true);
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
  return true;
}
