'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '@/lib/auth';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (getAccessToken()) router.replace('/dashboard');
    else router.replace('/login');
  }, [router]);

  return <main className="umkm-loading">Loading UMKM Hub…</main>;
}
