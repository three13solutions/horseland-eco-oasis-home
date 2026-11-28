import test from 'node:test';
import assert from 'node:assert/strict';
import { savedRoomOnlyBasePrice, basePriceForTwoPeople, BASE_PRICE_COVERED_PEOPLE, savedStayEpPrice } from '../src/lib/stay-base-price.ts';

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

const anchor = (changes = {}) => ({ id: 'base', room_type_id: 'basement', room_unit_id: null, amount: 2000, quoted_nights: 1, included_adults: 2, source_meal_plan_code: 'RO', source_override_id: null, is_active: true, verified_basis: true, start_date: '2026-11-17', end_date: '2026-12-23', min_nights: 1, max_nights: null, day_type: 'weekday', priority: 200, updated_at: '2026-11-17T00:00:00Z', ...changes });

test('Basement Hideouts displays the saved EP ₹2000 for two people, not the old ₹4000 listing price', () => {
  assert.equal(savedStayEpPrice([anchor(), anchor({ id: 'weekend', day_type: 'weekend', amount: 3500 })], 'basement', '2026-11-28'), 2000);
});

test('saved EP selection excludes other rooms, packages, overrides and ineligible anchors', () => {
  for (const changes of [{ room_type_id: 'other' }, { room_unit_id: 'unit' }, { source_meal_plan_code: 'FB' }, { source_override_id: 'override' }, { is_active: false }, { verified_basis: false }, { included_adults: 1 }, { quoted_nights: 2 }, { min_nights: 2 }, { max_nights: 0 }, { start_date: '2026-11-29' }, { end_date: '2026-11-27' }, { day_type: 'weekend' }]) {
    assert.equal(savedStayEpPrice([anchor(changes)], 'basement', '2026-11-28'), null);
  }
});

test('saved EP selection follows priority and weekday specificity rather than choosing the lowest amount', () => {
  const anchors = [anchor({ priority: 100, amount: 1000 }), anchor({ day_type: 'all', amount: 1500 }), anchor()];
  assert.equal(savedStayEpPrice(anchors, 'basement', '2026-11-28'), 2000);
  assert.equal(savedStayEpPrice([], 'basement', '2026-11-28'), null);
});
