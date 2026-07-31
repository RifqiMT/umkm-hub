'use client';

import { useTranslation } from '@/lib/translation/provider';

/** Translate for aria-labels, titles, and other string-only attributes. */
export function useTr() {
  const { tr } = useTranslation();
  return tr;
}

export function useFormatNumber() {
  const { formatNumber, formatInteger, lang } = useTranslation();
  return { formatNumber, formatInteger, lang };
}
