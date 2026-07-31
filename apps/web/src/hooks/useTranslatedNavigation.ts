'use client';

import { useEffect } from 'react';
import { getUiLanguageCode, markTranslatedDocument, resetUiLanguage } from '@/lib/ui-language';

/**
 * Optional escape hatch: `?reset-lang=1` clears a broken translation preference.
 */
export function useTranslatedNavigation() {
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('reset-lang') === '1') {
      resetUiLanguage();
      return;
    }
    markTranslatedDocument();
    getUiLanguageCode();
  }, []);
}
