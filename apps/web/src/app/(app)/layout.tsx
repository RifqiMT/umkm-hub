'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useTr } from '@/components/Tr';
import { getAccessToken } from '@/lib/auth';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const tr = useTr();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return <main className="umkm-auth">{tr('Checking session…')}</main>;
  }

  return <AppShell>{children}</AppShell>;
}
