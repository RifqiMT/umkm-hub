'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  domTranslationEngine,
  syncCachedTranslations,
} from '@/lib/dom-translator';
import { useTranslation } from '@/lib/translation';

/** Keeps DOM copy aligned with React after navigation and re-renders. */
export function TranslationDomSync() {
  const pathname = usePathname();
  const { lang, active, phase } = useTranslation();

  useEffect(() => {
    if (!lang || !active || phase !== 'ready') return;

    syncCachedTranslations();
    const kickoff = window.setTimeout(() => {
      void domTranslationEngine.runFullPass();
    }, 80);

    const interval = window.setInterval(() => {
      syncCachedTranslations();
    }, 2000);

    return () => {
      window.clearTimeout(kickoff);
      window.clearInterval(interval);
    };
  }, [pathname, lang, active, phase]);

  return null;
}
