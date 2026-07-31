'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '@/lib/auth';
import { useTr } from '@/components/Tr';

export default function HomePage() {
  const router = useRouter();
  const tr = useTr();

  useEffect(() => {
    if (getAccessToken()) router.replace('/dashboard');
    else router.replace('/login');
  }, [router]);

  return <main className="umkm-loading">{tr('Loading UMKM Hub…')}</main>;
}
