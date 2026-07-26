import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  GLOSSARY_ENTRIES,
  GLOSSARY_FEATURES,
  groupGlossaryByFeature,
  searchGlossary,
} from './index';

describe('searchGlossary', () => {
  it('returns all entries for empty query and all features', () => {
    const result = searchGlossary('', 'all');
    assert.equal(result.length, GLOSSARY_ENTRIES.length);
  });

  it('filters by feature', () => {
    const result = searchGlossary('', 'orders');
    assert.ok(result.length > 0);
    assert.ok(result.every((e) => e.features.includes('orders')));
  });

  it('matches label aliases case-insensitively', () => {
    const result = searchGlossary('margin', 'all');
    assert.ok(result.some((e) => e.id === 'orders.profitMarginRate'));
  });

  it('returns empty for nonsense query', () => {
    assert.equal(searchGlossary('zzzxxyyqqq', 'all').length, 0);
  });
});

describe('groupGlossaryByFeature', () => {
  it('keeps stable feature order and drops empty groups', () => {
    const groups = groupGlossaryByFeature(searchGlossary('', 'all'));
    const features = groups.map((g) => g.feature);
    assert.deepEqual(
      features,
      GLOSSARY_FEATURES.filter((f) =>
        GLOSSARY_ENTRIES.some((e) => e.features.includes(f)),
      ),
    );
    assert.ok(groups.every((g) => g.entries.length > 0));
  });

  it('can list the same multi-feature term under more than one group', () => {
    const groups = groupGlossaryByFeature(searchGlossary('margin', 'all'));
    const appearances = groups.flatMap((g) =>
      g.entries.filter((e) => e.id === 'orders.profitMarginRate'),
    );
    assert.ok(appearances.length >= 2);
  });
});

describe('search result uniqueness', () => {
  it('returns each entry at most once for flat search views', () => {
    const result = searchGlossary('margin', 'all');
    const ids = result.map((e) => e.id);
    assert.equal(ids.length, new Set(ids).size);
  });
});

describe('catalog completeness', () => {
  it('gives every entry a formula', () => {
    for (const entry of GLOSSARY_ENTRIES) {
      assert.ok(entry.formula?.trim(), `${entry.id} missing formula`);
    }
  });

  it('covers critical UI metrics', () => {
    const required = [
      'order.lineTotal',
      'order.discountValue',
      'targets.nextYearProjected',
      'targets.annualGrowthPercent',
      'analytics.ltvCustomerCount',
      'analytics.productSaleCount',
      'analytics.productMarginPercent',
      'analytics.productRevenue',
      'product.unitProfit',
      'warehouse.packsOnHand',
      'warehouse.stockBeforeAfter',
    ];
    for (const id of required) {
      assert.ok(
        GLOSSARY_ENTRIES.some((e) => e.id === id),
        `missing glossary id ${id}`,
      );
    }
  });

  it('resolves Subtotal to line total', () => {
    const hits = searchGlossary('Subtotal', 'orders');
    assert.ok(hits.some((e) => e.id === 'order.lineTotal'));
  });
});
