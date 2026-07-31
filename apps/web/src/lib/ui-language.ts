import { findLanguage } from './languages';
import { stopPageTranslation } from './dom-translator';
import { clearTranslationCache, recordUsedLanguage } from './translate-cache';

const STORAGE_KEY = 'umkm-ui-language';
const SOURCE_LANG = 'en';

/** Sync `<html lang>` before paint when a language preference exists. */
export const UI_LANGUAGE_BOOTSTRAP_SCRIPT = `(function(){
  var STORAGE_KEY='${STORAGE_KEY}';
  var SOURCE='${SOURCE_LANG}';
  try{
    var raw=localStorage.getItem(STORAGE_KEY);
    if(!raw||raw.trim()===''||raw.trim()===SOURCE||raw.trim()==='en'){
      document.documentElement.classList.remove('umkm-translated');
      document.documentElement.lang=SOURCE;
      return;
    }
    document.documentElement.classList.add('umkm-translated');
    document.documentElement.lang=raw.trim();
  }catch(e){}
})();`;

export function getUiLanguageCode(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY)?.trim();
  if (!raw || raw === SOURCE_LANG) return null;
  if (!findLanguage(raw)) return null;
  return raw;
}

function isUiTranslationActive(): boolean {
  return getUiLanguageCode() !== null;
}

export function setUiLanguageCode(code: string | null): void {
  if (typeof window === 'undefined') return;

  const nextRaw = code?.trim() || null;
  const next =
    nextRaw && nextRaw !== SOURCE_LANG && findLanguage(nextRaw)
      ? nextRaw
      : null;
  const prev = getUiLanguageCode();
  if (next === prev) return;

  if (next) {
    localStorage.setItem(STORAGE_KEY, next);
    recordUsedLanguage(next);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }

  window.location.reload();
}

export function resetUiLanguage(): void {
  if (typeof window === 'undefined') return;
  const prev = getUiLanguageCode();
  localStorage.removeItem(STORAGE_KEY);
  if (prev) clearTranslationCache(prev);
  stopPageTranslation();
  const url = new URL(window.location.href);
  url.searchParams.delete('reset-lang');
  window.location.replace(url.toString());
}

export function markTranslatedDocument(): void {
  if (typeof document === 'undefined') return;
  if (isUiTranslationActive()) {
    document.documentElement.classList.add('umkm-translated');
    document.documentElement.lang = getUiLanguageCode() ?? SOURCE_LANG;
  } else {
    document.documentElement.classList.remove('umkm-translated');
    document.documentElement.lang = SOURCE_LANG;
  }
}
