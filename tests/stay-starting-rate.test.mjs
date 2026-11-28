import test from 'node:test';
import assert from 'node:assert/strict';
import { findStartingRate, isBookableStartingVariant, hotelToday, startingRateDates, STARTING_RATE_DAYS, STARTING_RATE_GUESTS } from '../src/lib/stay-starting-rate.ts';

const variant = (price, extra = {}) => ({ price_per_night: price, total_price: price, pricing_status: 'verified', quote_fingerprint: 'server-quote', meal_plan_code: 'RO', cancellation_policy_code: 'non_refundable', ...extra });

test('starting prices use two adults and a 30-day window of one-night stays', () => {
  assert.deepEqual(STARTING_RATE_GUESTS, { adult: 2, child: 0, infant: 0 });
  assert.equal(STARTING_RATE_DAYS, 30);
  const dates = startingRateDates('2026-11-28');
  assert.equal(dates.length, 30);
  assert.deepEqual(dates[0], { checkIn: '2026-11-28', checkOut: '2026-11-29' });
  assert.deepEqual(dates[29], { checkIn: '2026-12-27', checkOut: '2026-12-28' });
});
test('hotel day does not include yesterday for visitors in another time zone', () => {
  assert.equal(hotelToday(new Date('2026-11-27T20:00:00Z')), '2026-11-28');
});
test('lowest eligible meal/cancellation variant wins, with its real stay retained', async () => {
  const rate = await findStartingRate('2026-11-28', async day => day === '2026-11-29' ? [variant(2000), variant(1700, { meal_plan_code: 'BB' })] : [variant(3500)], 3);
  assert.equal(rate.variant.price_per_night, 1700);
  assert.equal(rate.variant.meal_plan_code, 'BB');
  assert.equal(rate.checkIn, '2026-11-29');
  assert.equal(rate.checkOut, '2026-11-30');
});
test('sold-out and hidden plans returned as no public variants cannot lower the starting price', async () => {
  const rate = await findStartingRate('2026-11-28', async day => day === '2026-11-28' ? [] : [variant(3500)], 2);
  assert.equal(rate.variant.price_per_night, 3500);
  assert.equal(rate.checkIn, '2026-11-29');
});
test('no publicly bookable stay produces no price rather than an old base price', async () => {
  assert.equal(await findStartingRate('2026-11-28', async () => [], 3), null);
});
test('preview, invalid, unsupported and unfingerprinted rates are rejected', () => {
  for (const change of [{ pricing_status: 'preview' }, { quote_fingerprint: '' }, { price_per_night: NaN }, { price_per_night: -1 }, { total_price: -1 }, { meal_plan_code: 'PRIVATE' }, { cancellation_policy_code: '' }, { total_price: 100 }]) {
    assert.equal(isBookableStartingVariant(variant(2000, change)), false);
  }
  assert.equal(isBookableStartingVariant(variant(0)), true);
});
test('a failed date fails closed instead of claiming a minimum from incomplete data', async () => {
  await assert.rejects(findStartingRate('2026-11-28', async day => { if (day === '2026-11-29') throw new Error('offline'); return [variant(2000)]; }, 3), /offline/);
});
test('room-specific scanners do not reuse a sibling type rate', async () => {
  const [deluxe, standard] = await Promise.all([findStartingRate('2026-11-28', async () => [variant(3500)], 2), findStartingRate('2026-11-28', async () => [variant(2500)], 2)]);
  assert.equal(deluxe.variant.price_per_night, 3500);
  assert.equal(standard.variant.price_per_night, 2500);
});
test('read requests stay bounded and every date is checked', async () => {
  let active = 0, max = 0;
  const seen = new Set();
  await findStartingRate('2026-11-28', async day => { active++; max = Math.max(max, active); seen.add(day); await new Promise(resolve => setTimeout(resolve, 2)); active--; return [variant(2000)]; }, 10);
  assert.equal(seen.size, 10);
  assert.ok(max <= 4);
});