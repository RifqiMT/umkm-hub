const CACHE_PREFIX = 'umkm-translate-cache:';
const USED_LANGUAGES_KEY = 'umkm-translate-used-langs';
const LEGACY_SESSION_PREFIX = 'umkm-translate-cache:';
const MAX_ENTRIES = 4000;
const MAX_USED_LANGUAGES = 12;

type CacheBlob = Record<string, string>;

function cacheKey(lang: string): string {
  return `${CACHE_PREFIX}${lang}`;
}

function readStorage(lang: string): CacheBlob {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(cacheKey(lang));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CacheBlob;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStorage(lang: string, blob: CacheBlob): void {
  if (typeof localStorage === 'undefined') return;
  const keys = Object.keys(blob);
  let next = blob;
  if (keys.length > MAX_ENTRIES) {
    const trimmed = keys.slice(keys.length - MAX_ENTRIES);
    next = {};
    for (const key of trimmed) next[key] = blob[key]!;
  }
  try {
    localStorage.setItem(cacheKey(lang), JSON.stringify(next));
  } catch {
    // Ignore quota errors — in-memory cache still helps this session.
  }
}

/** One-time migration from older sessionStorage caches. */
function migrateLegacySessionCache(lang: string): CacheBlob {
  if (typeof sessionStorage === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(`${LEGACY_SESSION_PREFIX}${lang}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CacheBlob;
    if (!parsed || typeof parsed !== 'object') return {};
    sessionStorage.removeItem(`${LEGACY_SESSION_PREFIX}${lang}`);
    return parsed;
  } catch {
    return {};
  }
}

const memory = new Map<string, CacheBlob>();

function langMap(lang: string): CacheBlob {
  if (!memory.has(lang)) {
    const fromLocal = readStorage(lang);
    const legacy =
      Object.keys(fromLocal).length > 0 ? {} : migrateLegacySessionCache(lang);
    memory.set(lang, { ...legacy, ...fromLocal });
    if (Object.keys(legacy).length > 0) {
      writeStorage(lang, memory.get(lang)!);
    }
  }
  return memory.get(lang)!;
}

function readUsedLanguages(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(USED_LANGUAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((code): code is string => typeof code === 'string');
  } catch {
    return [];
  }
}

function writeUsedLanguages(codes: string[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(USED_LANGUAGES_KEY, JSON.stringify(codes));
  } catch {
    // Ignore quota errors.
  }
}

export function recordUsedLanguage(lang: string): void {
  const code = lang.trim();
  if (!code || code === 'en') return;
  const used = readUsedLanguages().filter((item) => item !== code);
  used.unshift(code);
  writeUsedLanguages(used.slice(0, MAX_USED_LANGUAGES));
}

export function getUsedLanguages(): string[] {
  return readUsedLanguages();
}

export function getCachedTranslation(
  lang: string,
  source: string,
): string | null {
  const hit = langMap(lang)[source];
  return typeof hit === 'string' ? hit : null;
}

export function primeTranslationCache(
  lang: string,
  pairs: Array<{ source: string; translated: string }>,
): void {
  const blob = langMap(lang);
  for (const pair of pairs) {
    blob[pair.source] = pair.translated;
  }
  writeStorage(lang, blob);
}

export function loadCachedDictionary(
  lang: string,
  sources?: readonly string[],
): Record<string, string> {
  const blob = langMap(lang);
  if (!sources || sources.length === 0) {
    return { ...blob };
  }
  const dictionary: Record<string, string> = {};
  for (const source of sources) {
    const hit = blob[source];
    if (typeof hit === 'string') dictionary[source] = hit;
  }
  return dictionary;
}

export function getCacheCoverage(
  lang: string,
  sources: readonly string[],
): number {
  if (sources.length === 0) return 1;
  const blob = langMap(lang);
  let hits = 0;
  for (const source of sources) {
    if (typeof blob[source] === 'string') hits += 1;
  }
  return hits / sources.length;
}

/** Clears one language cache — use only for explicit reset actions. */
export function clearTranslationCache(lang?: string): void {
  if (lang) {
    memory.delete(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(cacheKey(lang));
    }
    const used = readUsedLanguages().filter((code) => code !== lang);
    writeUsedLanguages(used);
    return;
  }
  clearAllTranslationCaches();
}

/** Clears every stored translation cache on this device. */
export function clearAllTranslationCaches(): void {
  memory.clear();
  if (typeof localStorage === 'undefined') return;
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(CACHE_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
  localStorage.removeItem(USED_LANGUAGES_KEY);
}
