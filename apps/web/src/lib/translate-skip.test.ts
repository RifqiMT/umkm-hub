import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isNumericTranslatableString,
  shouldSkipTranslatableString,
} from './translate-skip';

describe('translate-skip', () => {
  it('allows numeric strings through translation', () => {
    assert.equal(shouldSkipTranslatableString('1,234'), false);
    assert.equal(shouldSkipTranslatableString('42'), false);
    assert.equal(shouldSkipTranslatableString('12.5%'), false);
    assert.equal(isNumericTranslatableString('1,234.56'), true);
  });

  it('still skips usernames, urls, and opaque ids', () => {
    assert.equal(shouldSkipTranslatableString('@demo'), true);
    assert.equal(shouldSkipTranslatableString('https://example.com'), true);
    assert.equal(
      shouldSkipTranslatableString('a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
      true,
    );
  });
});
