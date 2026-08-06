import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  numberDraftToNumber,
  numberDraftToOptional,
  numberInputValue,
  parseNumberDraft,
} from './number-draft';

describe('parseNumberDraft', () => {
  it('keeps blank while clearing', () => {
    assert.equal(parseNumberDraft(''), '');
    assert.equal(parseNumberDraft('   '), '');
  });

  it('parses finite numbers', () => {
    assert.equal(parseNumberDraft('0'), 0);
    assert.equal(parseNumberDraft('12.5'), 12.5);
  });

  it('rejects non-numeric input as blank', () => {
    assert.equal(parseNumberDraft('abc'), '');
  });
});

describe('numberInputValue', () => {
  it('shows blank for empty drafts', () => {
    assert.equal(numberInputValue(''), '');
    assert.equal(numberInputValue(null), '');
    assert.equal(numberInputValue(undefined), '');
  });

  it('keeps typed zero visible by default', () => {
    assert.equal(numberInputValue(0), 0);
  });

  it('can blank zeros when opted in', () => {
    assert.equal(numberInputValue(0, { emptyWhenZero: true }), '');
  });
});

describe('numberDraftToNumber / optional', () => {
  it('coerces blank to fallback', () => {
    assert.equal(numberDraftToNumber('', 0), 0);
    assert.equal(numberDraftToNumber(null, 7), 7);
    assert.equal(numberDraftToOptional(''), null);
  });

  it('passes through finite numbers', () => {
    assert.equal(numberDraftToNumber(4.2), 4.2);
    assert.equal(numberDraftToOptional(0), 0);
  });
});
