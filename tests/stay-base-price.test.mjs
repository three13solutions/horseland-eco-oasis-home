import test from 'node:test';
import assert from 'node:assert/strict';
import { savedRoomOnlyBasePrice, basePriceForTwoPeople, BASE_PRICE_COVERED_PEOPLE } from '../src/lib/stay-base-price.ts';

test('Stay cards preserve each saved room base price without recalculation', () => {
  assert.equal(savedRoomOnlyBasePrice(7000), 7000);
  assert.equal(savedRoomOnlyBasePrice(6000), 6000);
  assert.equal(savedRoomOnlyBasePrice(5000), 5000);
  assert.equal(savedRoomOnlyBasePrice(4000), 4000);
});

test('a missing or invalid saved base price never displays a made-up rate', () => {
  for (const value of [null, undefined, 0, -1, NaN, Infinity]) {
    assert.equal(savedRoomOnlyBasePrice(value), null);
  }
});

test('the saved base price covers 2 people per night and is never split per guest', () => {
  assert.equal(BASE_PRICE_COVERED_PEOPLE, 2);
  // The configured rate already covers two people, so extra guests must not shrink it.
  assert.equal(basePriceForTwoPeople(5000), 5000);
  assert.equal(basePriceForTwoPeople(7000), 7000);
  assert.equal(basePriceForTwoPeople(null), null);
});
