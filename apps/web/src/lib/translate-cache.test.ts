import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
};

function createStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
  };
}

describe('translate-cache', () => {
  beforeEach(() => {
    const storage = createStorage();
    (globalThis as { localStorage?: StorageLike }).localStorage = storage;
    (globalThis as { sessionStorage?: StorageLike }).sessionStorage =
      createStorage();
  });

  it('persists translations per language in localStorage', async () => {
    const {
      clearAllTranslationCaches,
      loadCachedDictionary,
      primeTranslationCache,
    } = await import('./translate-cache');

    clearAllTranslationCaches();
    primeTranslationCache('id', [
      { source: 'Dashboard', translated: 'Dasbor' },
      { source: 'Products', translated: 'Produk' },
    ]);

    assert.deepEqual(loadCachedDictionary('id', ['Dashboard', 'Products']), {
      Dashboard: 'Dasbor',
      Products: 'Produk',
    });
    assert.match(
      localStorage.getItem('umkm-translate-cache:id') ?? '',
      /Dasbor/,
    );
  });

  it('keeps separate caches when switching languages', async () => {
    const {
      clearAllTranslationCaches,
      getCacheCoverage,
      loadCachedDictionary,
      primeTranslationCache,
    } = await import('./translate-cache');

    clearAllTranslationCaches();
    primeTranslationCache('id', [{ source: 'Orders', translated: 'Pesanan' }]);
    primeTranslationCache('ms', [{ source: 'Orders', translated: 'Pesanan' }]);

    assert.equal(getCacheCoverage('id', ['Orders']), 1);
    assert.equal(getCacheCoverage('fr', ['Orders']), 0);
    assert.equal(loadCachedDictionary('id', ['Orders']).Orders, 'Pesanan');
  });

  it('tracks recently used languages', async () => {
    const {
      clearAllTranslationCaches,
      getUsedLanguages,
      recordUsedLanguage,
    } = await import('./translate-cache');

    clearAllTranslationCaches();
    recordUsedLanguage('id');
    recordUsedLanguage('ms');
    recordUsedLanguage('id');

    assert.deepEqual(getUsedLanguages(), ['id', 'ms']);
  });
});
