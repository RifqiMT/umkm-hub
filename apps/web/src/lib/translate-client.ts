import {
  translateBatch as translateBatchApi,
  translateBatchPublic,
} from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import {
  getCachedTranslation,
  primeTranslationCache,
} from '@/lib/translate-cache';

/** English source language — matches API Google Translate `sl` parameter. */
const TRANSLATION_SOURCE_LANG = 'en';

const CHUNK_SIZE = 40;

type TranslateProgress = {
  done: number;
  total: number;
  progress: number;
};

async function translateViaGoogleApi(
  texts: string[],
  to: string,
): Promise<string[]> {
  if (getAccessToken()) {
    try {
      return await translateBatchApi(texts, to);
    } catch {
      // Fall through to public Google Translate proxy.
    }
  }

  return translateBatchPublic(texts, to);
}

async function translateOneViaGoogleApi(
  text: string,
  to: string,
): Promise<string> {
  try {
    const [value] = await translateViaGoogleApi([text], to);
    return value?.trim() || text;
  } catch {
    return text;
  }
}

function storePairs(
  target: string,
  pairs: Array<{ source: string; translated: string }>,
  result: Map<string, string>,
): void {
  primeTranslationCache(target, pairs);
  for (const pair of pairs) {
    result.set(pair.source, pair.translated);
  }
}

export async function translateMany(
  texts: string[],
  to: string,
  onProgress?: (progress: TranslateProgress) => void,
): Promise<Map<string, string>> {
  const target = to.trim();
  const result = new Map<string, string>();
  if (!target || target === TRANSLATION_SOURCE_LANG) return result;

  const uniqueTexts = [...new Set(texts.map((text) => text.trim()).filter(Boolean))];
  const pending: string[] = [];
  let cachedCount = 0;

  for (const text of uniqueTexts) {
    const cached = getCachedTranslation(target, text);
    if (cached != null) {
      result.set(text, cached);
      cachedCount += 1;
    } else {
      pending.push(text);
    }
  }

  const total = uniqueTexts.length;
  const report = (done: number) => {
    onProgress?.({
      done,
      total,
      progress: total === 0 ? 100 : Math.min(100, Math.round((done / total) * 100)),
    });
  };

  report(cachedCount);

  for (let index = 0; index < pending.length; index += CHUNK_SIZE) {
    const chunk = pending.slice(index, index + CHUNK_SIZE);

    try {
      const translated = await translateViaGoogleApi(chunk, target);
      const pairs = chunk.map((source, chunkIndex) => ({
        source,
        translated: translated[chunkIndex]?.trim() || source,
      }));
      storePairs(target, pairs, result);
    } catch {
      for (const source of chunk) {
        const translated = await translateOneViaGoogleApi(source, target);
        storePairs(target, [{ source, translated }], result);
      }
    }

    report(cachedCount + Math.min(index + chunk.length, pending.length));
  }

  report(total);
  return result;
}

export async function translateText(text: string, to: string): Promise<string> {
  const map = await translateMany([text], to);
  return map.get(text) ?? text;
}

export function lookupCached(lang: string, source: string): string | null {
  return (
    getCachedTranslation(lang, source) ??
    getCachedTranslation(lang, source.trim()) ??
    null
  );
}
