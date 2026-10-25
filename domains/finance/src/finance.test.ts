import assert from 'node:assert/strict';
import test from 'node:test';
import { FinanceValidationError, financeEffectiveAt } from './index.js';

test('financeEffectiveAt accepts UTC Z and numeric offsets', () => {
  assert.equal(financeEffectiveAt('2026-10-12T00:00:00Z'), '2026-10-12T00:00:00Z');
  assert.equal(financeEffectiveAt('2026-10-12T00:00:00.123Z'), '2026-10-12T00:00:00.123Z');
  assert.equal(financeEffectiveAt('2026-10-12T02:00:00+02:00'), '2026-10-12T02:00:00+02:00');
  assert.equal(financeEffectiveAt('2026-10-11T17:00:00-07:00'), '2026-10-11T17:00:00-07:00');
  assert.equal(financeEffectiveAt('2026-10-12T00:00Z'), '2026-10-12T00:00Z');
});

test('financeEffectiveAt rejects timezone-less, date-only, and empty values', () => {
  for (const value of [
    '',
    '   ',
    '2026-10-12',
    '2026-10-12T00:00:00',
    '2026-10-12T00:00',
    '2026-10-12 00:00:00Z',
    '2026-10-12T00:00:00+0200',
    'not-a-date',
  ]) {
    assert.throws(() => financeEffectiveAt(value), (error: unknown) => {
      assert.ok(error instanceof FinanceValidationError);
      assert.match(error.message, /effectiveAt/);
      return true;
    }, `expected rejection for ${JSON.stringify(value)}`);
  }
});
