import { lookupCached, translateMany } from '@/lib/translate-client';
import { getCachedTranslation } from '@/lib/translate-cache';
import { shouldSkipTranslatableString } from '@/lib/translate-skip';

const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'CODE',
  'PRE',
  'TEXTAREA',
  'INPUT',
]);

const TRANSLATABLE_ATTRS = [
  'placeholder',
  'aria-label',
  'title',
  'value',
] as const;

type AttrTarget = {
  element: HTMLElement;
  attr: (typeof TRANSLATABLE_ATTRS)[number];
  source: string;
};

type TextTarget = {
  node: Text;
  source: string;
};

type TranslationEngineStatus =
  | 'idle'
  | 'running'
  | 'ready'
  | 'failed';

type TranslationStatusDetail = {
  status: TranslationEngineStatus;
  lang?: string;
  progress?: number;
  message?: string;
  translatedCount?: number;
  totalStrings?: number;
};

type TranslationPassResult = {
  translatedCount: number;
  failed: boolean;
};

/** English source text preserved for re-applying after React re-renders. */
const englishByNode = new WeakMap<Text, string>();

function dispatchStatus(detail: TranslationStatusDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('umkm-translation-status', { detail }),
  );
}

function markDocumentReady(lang: string | null, ready: boolean) {
  if (typeof document === 'undefined') return;
  if (ready && lang) {
    document.documentElement.dataset.umkmTranslationReady = '1';
    document.documentElement.dataset.umkmTranslationLang = lang;
  } else {
    delete document.documentElement.dataset.umkmTranslationReady;
    delete document.documentElement.dataset.umkmTranslationLang;
  }
}

function shouldSkipElement(element: Element | null): boolean {
  if (!element) return true;
  if (element.closest('.notranslate')) return true;
  if (SKIP_TAGS.has(element.tagName)) return true;
  if (element.closest('[contenteditable="true"]')) return true;
  return false;
}

function shouldSkipString(value: string): boolean {
  return shouldSkipTranslatableString(value);
}

function shouldTranslateValueAttr(element: HTMLElement): boolean {
  if (element.tagName !== 'INPUT') return false;
  const type = (element.getAttribute('type') ?? 'text').toLowerCase();
  return type === 'submit' || type === 'button' || type === 'reset';
}

function collectTextTargets(root: ParentNode): TextTarget[] {
  const targets: TextTarget[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const textNode = node as Text;
    const parent = textNode.parentElement;
    if (!shouldSkipElement(parent)) {
      const source = textNode.data;
      if (!shouldSkipString(source)) {
        targets.push({ node: textNode, source });
      }
    }
    node = walker.nextNode();
  }
  return targets;
}

function collectAttrTargets(root: ParentNode): AttrTarget[] {
  const targets: AttrTarget[] = [];
  const elements = root.querySelectorAll<HTMLElement>('*');
  elements.forEach((element) => {
    if (shouldSkipElement(element)) return;
    for (const attr of TRANSLATABLE_ATTRS) {
      if (attr === 'value' && !shouldTranslateValueAttr(element)) continue;
      const value = element.getAttribute(attr);
      if (!value || shouldSkipString(value)) continue;
      targets.push({ element, attr, source: value });
    }
  });
  return targets;
}

function resolveEnglish(textNode: Text, current: string): string {
  return englishByNode.get(textNode) ?? current;
}

function applyTextTranslation(
  target: TextTarget,
  english: string,
  translated: string,
): boolean {
  if (!translated || translated === english) return false;
  if (!englishByNode.has(target.node)) {
    englishByNode.set(target.node, english);
  }
  if (target.node.data === translated) return false;
  target.node.data =
    target.node.data === english
      ? translated
      : target.node.data.replace(english, translated);
  return true;
}

function applyFromMap(
  lang: string,
  map: Map<string, string>,
): number {
  let translatedCount = 0;
  const textTargets = collectTextTargets(document.body);
  const attrTargets = collectAttrTargets(document.body);

  for (const target of textTargets) {
    const english = resolveEnglish(target.node, target.source);
    const translated =
      map.get(english) ??
      map.get(target.source) ??
      lookupCached(lang, english) ??
      lookupCached(lang, target.source);
    if (!translated) continue;
    if (applyTextTranslation(target, english, translated)) {
      translatedCount += 1;
    }
  }

  for (const target of attrTargets) {
    const english = target.element.dataset.umkmAttrSrc ?? target.source;
    const translated =
      map.get(english) ??
      map.get(target.source) ??
      lookupCached(lang, english) ??
      lookupCached(lang, target.source);
    if (!translated || translated === english) continue;
    if (target.element.getAttribute(target.attr) === translated) continue;
    if (!target.element.dataset.umkmAttrSrc) {
      target.element.dataset.umkmAttrSrc = english;
    }
    target.element.setAttribute(target.attr, translated);
    translatedCount += 1;
  }

  return translatedCount;
}

function applyCachedOnly(lang: string): number {
  const map = new Map<string, string>();
  const textTargets = collectTextTargets(document.body);
  const attrTargets = collectAttrTargets(document.body);
  for (const target of textTargets) {
    const english = resolveEnglish(target.node, target.source);
    const hit = lookupCached(lang, english) ?? lookupCached(lang, target.source);
    if (hit) map.set(english, hit);
  }
  for (const target of attrTargets) {
    const english = target.element.dataset.umkmAttrSrc ?? target.source;
    const hit = lookupCached(lang, english) ?? lookupCached(lang, target.source);
    if (hit) map.set(english, hit);
  }
  return applyFromMap(lang, map);
}

class DomTranslationEngine {
  private lang: string | null = null;
  private observer: MutationObserver | null = null;
  private debounceTimer: number | null = null;
  private syncInterval: number | null = null;
  private running = false;
  private started = false;
  private ready = false;
  private lastProgress = 0;

  get language(): string | null {
    return this.lang;
  }

  start(lang: string): void {
    if (this.lang === lang && this.started) {
      void this.runFullPass();
      return;
    }
    this.stop(false);
    this.lang = lang;
    this.started = true;
    this.ready = false;
    this.lastProgress = 0;
    markDocumentReady(lang, false);
    document.documentElement.classList.add('umkm-translating');
    dispatchStatus({
      status: 'running',
      lang,
      progress: 0,
      message: 'Translating workspace…',
    });

    this.observer = new MutationObserver(() => {
      if (!this.lang || this.running) return;
      if (this.debounceTimer != null) window.clearTimeout(this.debounceTimer);
      this.debounceTimer = window.setTimeout(() => {
        if (this.lang) applyCachedOnly(this.lang);
      }, 120);
    });
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    this.syncInterval = window.setInterval(() => {
      if (!this.lang || this.running) return;
      const applied = applyCachedOnly(this.lang);
      if (applied > 0 && !this.ready) {
        dispatchStatus({
          status: 'running',
          lang: this.lang,
          progress: Math.max(this.lastProgress, 90),
          message: 'Applying translation…',
        });
      }
    }, 700);

    window.setTimeout(() => void this.runFullPass(), 150);
    window.setTimeout(() => void this.runFullPass(), 1200);
    window.setTimeout(() => void this.runFullPass(), 3000);
  }

  stop(clearMarks = true): void {
    this.started = false;
    this.ready = false;
    this.lang = null;
    this.observer?.disconnect();
    this.observer = null;
    if (this.debounceTimer != null) window.clearTimeout(this.debounceTimer);
    if (this.syncInterval != null) window.clearInterval(this.syncInterval);
    this.debounceTimer = null;
    this.syncInterval = null;
    document.documentElement.classList.remove('umkm-translating');
    if (clearMarks) {
      markDocumentReady(null, false);
      dispatchStatus({ status: 'idle' });
    }
  }

  private markReady(translatedCount: number, totalStrings: number): void {
    if (!this.lang || this.ready) return;
    this.ready = true;
    markDocumentReady(this.lang, true);
    document.documentElement.classList.remove('umkm-translating');
    dispatchStatus({
      status: 'ready',
      lang: this.lang,
      progress: 100,
      message: 'Translation complete',
      translatedCount,
      totalStrings,
    });
  }

  async runFullPass(): Promise<TranslationPassResult> {
    if (!this.lang || this.running) {
      return { translatedCount: 0, failed: false };
    }

    this.running = true;
    document.documentElement.classList.add('umkm-translating');

    try {
      const textTargets = collectTextTargets(document.body);
      const attrTargets = collectAttrTargets(document.body);
      const unique = new Set<string>();
      for (const target of textTargets) {
        unique.add(resolveEnglish(target.node, target.source));
      }
      for (const target of attrTargets) {
        unique.add(target.element.dataset.umkmAttrSrc ?? target.source);
      }

      const pending = [...unique].filter(
        (text) => !getCachedTranslation(this.lang!, text),
      );

      if (unique.size === 0) {
        this.markReady(0, 0);
        return { translatedCount: 0, failed: false };
      }

      let map = new Map<string, string>();
      if (pending.length > 0) {
        dispatchStatus({
          status: 'running',
          lang: this.lang,
          progress: 5,
          message: `Translating ${pending.length} strings…`,
          totalStrings: unique.size,
        });
        map = await translateMany(pending, this.lang, (progress) => {
          this.lastProgress = Math.max(
            5,
            Math.min(95, progress.progress),
          );
          dispatchStatus({
            status: 'running',
            lang: this.lang!,
            progress: this.lastProgress,
            message: `Translating… ${this.lastProgress}%`,
            totalStrings: unique.size,
          });
        });
      }

      for (const text of unique) {
        const cached = getCachedTranslation(this.lang, text);
        if (cached) map.set(text, cached);
      }

      const translatedCount = applyFromMap(this.lang, map);

      if (pending.length > 0 && translatedCount === 0 && map.size === 0) {
        dispatchStatus({
          status: 'failed',
          lang: this.lang,
          progress: 0,
          message: 'Translation failed — check API or network',
        });
        return { translatedCount: 0, failed: true };
      }

      this.lastProgress = 100;
      this.markReady(translatedCount, unique.size);
      return { translatedCount, failed: false };
    } catch {
      dispatchStatus({
        status: 'failed',
        lang: this.lang ?? undefined,
        progress: 0,
        message: 'Translation failed — check API or network',
      });
      return { translatedCount: 0, failed: true };
    } finally {
      this.running = false;
    }
  }
}

export const domTranslationEngine = new DomTranslationEngine();

export function stopPageTranslation(): void {
  domTranslationEngine.stop();
}

export function syncCachedTranslations(): void {
  const lang = domTranslationEngine.language;
  if (!lang) return;
  applyCachedOnly(lang);
}
