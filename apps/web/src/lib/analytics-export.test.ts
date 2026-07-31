import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  csvEscape,
  maxChartPngPixelRatio,
  rowsToCsv,
  slugExportName,
} from './analytics-export';

describe('analytics-export', () => {
  it('escapes csv cells', () => {
    assert.equal(csvEscape(null), '');
    assert.equal(csvEscape('a,b'), '"a,b"');
    assert.equal(csvEscape('say "hi"'), '"say ""hi"""');
  });

  it('builds bom csv', () => {
    const csv = rowsToCsv(
      ['Period', 'Revenue'],
      [
        { Period: 'Jan', Revenue: '1,000' },
        { Period: 'Feb', Revenue: 2000 },
      ],
    );
    assert.ok(csv.startsWith('\uFEFF'));
    assert.ok(csv.includes('Period,Revenue'));
    assert.ok(csv.includes('Jan,"1,000"'));
    assert.ok(csv.includes('Feb,2000'));
  });

  it('slugs export names', () => {
    assert.equal(slugExportName('Average order value'), 'average-order-value');
    assert.equal(slugExportName('  '), 'analytics');
  });

  it('picks a high chart png pixel ratio', () => {
    assert.equal(maxChartPngPixelRatio(1), 6);
    assert.equal(maxChartPngPixelRatio(2), 6);
    assert.equal(maxChartPngPixelRatio(3), 6);
    assert.equal(maxChartPngPixelRatio(4), 8);
  });
});
