'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/components/FirebaseAuthProvider';
import { useTr } from '@/components/Tr';
import { getAccessToken } from '@/lib/auth';
import { isFirebaseConfigured } from '@/lib/firebase';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const tr = useTr();
  const auth = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!auth.ready) return;

    const signedIn = isFirebaseConfigured()
      ? auth.authenticated
      : Boolean(getAccessToken());

    if (!signedIn) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [auth.ready, auth.authenticated, router]);

  if (!ready) {
    return <main className="umkm-auth">{tr('Checking session…')}</main>;
  }

  return <AppShell>{children}</AppShell>;
}
