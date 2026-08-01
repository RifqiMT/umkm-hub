'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { useTranslatedNavigation } from '@/hooks/useTranslatedNavigation';
import {
  domTranslationEngine,
  syncCachedTranslations,
} from '@/lib/dom-translator';
import { getUiLanguageCode, markTranslatedDocument } from '@/lib/ui-language';
import { lookupCached, translateMany, translateText } from '@/lib/translate-client';
import {
  getCacheCoverage,
  loadCachedDictionary,
  recordUsedLanguage,
} from '@/lib/translate-cache';
import { getFullUiCatalog } from '@/lib/translation/full-catalog';
import {
  formatLocalizedInteger,
  formatLocalizedNumber,
} from '@/lib/format-localized-number';

const INSTANT_CACHE_COVERAGE = 0.85;

type TranslationPhase =
  | 'off'
  | 'loading'
  | 'applying'
  | 'ready'
  | 'failed';

type TranslationContextValue = {
  lang: string | null;
  active: boolean;
  phase: TranslationPhase;
  catalogReady: boolean;
  progress: number;
  message: string;
  tr: (text: string) => string;
  formatNumber: (
    value: number,
    options?: Intl.NumberFormatOptions,
  ) => string;
  formatInteger: (value: number) => string;
  retry: () => void;
};

const TranslationContext = createContext<TranslationContextValue>({
  lang: null,
  active: false,
  phase: 'off',
  catalogReady: false,
  progress: 0,
  message: '',
  tr: (text) => text,
  formatNumber: (value) => String(value),
  formatInteger: (value) => String(value),
  retry: () => {},
});

export function useTranslation() {
  return useContext(TranslationContext);
}

/** @deprecated use useTranslation */
export function useTranslationStatus() {
  const ctx = useTranslation();
  const status =
    ctx.phase === 'loading' || ctx.phase === 'applying'
      ? ('applying' as const)
      : ctx.phase === 'ready'
        ? ('ready' as const)
        : ctx.phase === 'failed'
          ? ('failed' as const)
          : ('off' as const);
  return {
    status,
    languageCode: ctx.lang,
    progress: ctx.progress,
    message: ctx.message,
    retry: ctx.retry,
  };
}

function TranslationBootScreen({
  message,
  progress,
}: {
  message: string;
  progress: number;
}) {
  return (
    <main className="umkm-auth umkm-translation-boot notranslate">
      <div className="umkm-panel umkm-auth-card" style={{ maxWidth: 420 }}>
        <h1 className="umkm-title">UMKM Hub</h1>
        <p className="umkm-sub">{message || 'Loading translations…'}</p>
        <div
          className="umkm-translate-boot-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div
            className="umkm-translate-boot-bar-fill"
            style={{ width: `${Math.max(6, progress)}%` }}
          />
        </div>
        <p className="umkm-profile-field-hint">{progress}%</p>
      </div>
    </main>
  );
}

export function TranslationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [lang, setLang] = useState<string | null>(null);
  const [phase, setPhase] = useState<TranslationPhase>('off');
  const [catalogReady, setCatalogReady] = useState(false);
  const [dictionary, setDictionary] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const runIdRef = useRef(0);
  const pendingRef = useRef(new Set<string>());

  useTranslatedNavigation();

  const refreshDictionaryFromCache = useCallback((code: string) => {
    setDictionary(loadCachedDictionary(code));
  }, []);

  const tr = useCallback(
    (text: string) => {
      if (!lang || !text) return text;
      const hit = dictionary[text] ?? lookupCached(lang, text);
      if (hit) return hit;

      if (!pendingRef.current.has(text)) {
        pendingRef.current.add(text);
        void translateText(text, lang).then((translated) => {
          pendingRef.current.delete(text);
          if (!translated || translated === text) return;
          setDictionary((prev) => ({ ...prev, [text]: translated }));
        });
      }

      return text;
    },
    [lang, dictionary],
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      formatLocalizedNumber(value, lang, options),
    [lang],
  );

  const formatInteger = useCallback(
    (value: number) => formatLocalizedInteger(value, lang),
    [lang],
  );

  const runPipeline = useCallback(async (code: string) => {
    const runId = ++runIdRef.current;
    setLang(code);
    markTranslatedDocument();
    recordUsedLanguage(code);

    const catalog = getFullUiCatalog();
    const cachedDictionary = loadCachedDictionary(code, catalog);
    const cachedCoverage = getCacheCoverage(code, catalog);
    const hasInstantCache =
      Object.keys(cachedDictionary).length > 0 &&
      cachedCoverage >= INSTANT_CACHE_COVERAGE;

    setDictionary(cachedDictionary);
    setCatalogReady(hasInstantCache);
    setPhase(hasInstantCache ? 'applying' : 'loading');
    setProgress(hasInstantCache ? 85 : 0);
    setMessage(
      hasInstantCache
        ? 'Applying cached translations…'
        : 'Loading translations…',
    );

    const map = await translateMany(catalog, code, (p) => {
      if (runId !== runIdRef.current) return;
      const floor = hasInstantCache ? 85 : 0;
      const scaled = floor + Math.round((p.progress / 100) * (88 - floor));
      setProgress(Math.min(88, scaled));
      setMessage(
        p.progress >= 100
          ? 'Applying to workspace…'
          : `Loading translations… ${p.progress}%`,
      );
    });

    if (runId !== runIdRef.current) return;

    const nextDictionary = { ...cachedDictionary, ...Object.fromEntries(map) };
    setDictionary(nextDictionary);
    setCatalogReady(true);

    const translatedCount = [...map.entries()].filter(
      ([source, value]) => value !== source,
    ).length;

    if (map.size === 0) {
      setPhase('failed');
      setProgress(0);
      setMessage('Translation failed — check API or network');
      return;
    }

    setPhase('applying');
    setProgress(Math.max(90, 90));
    setMessage('Applying to workspace…');

    try {
      domTranslationEngine.start(code);
      await domTranslationEngine.runFullPass();
      refreshDictionaryFromCache(code);
    } catch {
      // Catalog translation is enough for shared UI; DOM pass is best-effort.
    }

    setPhase('ready');
    setProgress(100);
    setMessage(
      translatedCount > 0
        ? 'Translation complete'
        : 'Translation complete (limited — check API)',
    );
  }, [refreshDictionaryFromCache]);

  const retry = useCallback(() => {
    const code = getUiLanguageCode();
    if (!code) return;
    void runPipeline(code);
  }, [runPipeline]);

  useEffect(() => {
    const code = getUiLanguageCode();
    setLang(code);
    if (!code) {
      setPhase('off');
      setCatalogReady(true);
      setDictionary({});
      domTranslationEngine.stop();
      return;
    }
    void runPipeline(code);
  }, [runPipeline]);

  useEffect(() => {
    const code = getUiLanguageCode();
    if (!code || !catalogReady || phase === 'loading') return;
    syncCachedTranslations();
    refreshDictionaryFromCache(code);
    const timer = window.setTimeout(() => {
      void domTranslationEngine.runFullPass().then(() => {
        refreshDictionaryFromCache(code);
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [pathname, phase, catalogReady, refreshDictionaryFromCache]);

  useEffect(() => {
    const code = getUiLanguageCode();
    if (!code || phase !== 'ready') return;
    const interval = window.setInterval(() => {
      syncCachedTranslations();
      refreshDictionaryFromCache(code);
    }, 900);
    return () => window.clearInterval(interval);
  }, [phase, refreshDictionaryFromCache]);

  const value = useMemo<TranslationContextValue>(
    () => ({
      lang,
      active: lang != null,
      phase,
      catalogReady,
      progress,
      message,
      tr,
      formatNumber,
      formatInteger,
      retry,
    }),
    [lang, phase, catalogReady, progress, message, tr, formatNumber, formatInteger, retry],
  );

  const showBoot =
    lang != null && !catalogReady && phase !== 'failed' && phase !== 'off';
  const showTopProgress =
    lang != null && catalogReady && phase !== 'off' && phase !== 'ready';

  return (
    <TranslationContext.Provider value={value}>
      {showBoot ? (
        <TranslationBootScreen message={message} progress={progress} />
      ) : (
        children
      )}
      {showTopProgress ? (
        <div
          className="umkm-translate-progress notranslate"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label={message}
        >
          <div
            className="umkm-translate-progress-bar"
            style={{ width: `${Math.max(4, progress)}%` }}
          />
          <span className="umkm-translate-progress-label">{message}</span>
        </div>
      ) : null}
    </TranslationContext.Provider>
  );
}
