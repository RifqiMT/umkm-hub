import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatLocalizedInteger,
  formatLocalizedNumber,
} from './format-localized-number';

describe('format-localized-number', () => {
  it('formats integers for the active locale', () => {
    assert.equal(formatLocalizedInteger(1234, 'id'), '1.234');
    assert.equal(formatLocalizedInteger(1234, 'en'), '1,234');
  });

  it('formats decimals for the active locale', () => {
    assert.equal(
      formatLocalizedNumber(1234.5, 'id', { maximumFractionDigits: 1 }),
      '1.234,5',
    );
  });
});
