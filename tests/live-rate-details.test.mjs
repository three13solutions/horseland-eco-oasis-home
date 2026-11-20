import test from 'node:test';
import assert from 'node:assert/strict';
import { appliedOverrideIds, stayDateRange, promoMatchesLiveRate, couponPreviewUnavailable } from '../src/lib/live-rate-details.ts';

test('show only applied overrides, once across a multi-night stay', () => {
  assert.deepEqual(appliedOverrideIds([
    { date: '2026-11-20', source_override_id: 'override-a' },
    { date: '2026-11-21', source_override_id: 'override-a', dynamic_rules: [{ type: 'channel', id: 'not-an-override' }] },
    { date: '2026-11-22', dynamic_rules: [{ type: 'tactical_override', override_id: 'override-b' }] },
  ]), ['override-a', 'override-b']);
});
test('stay nights determines checkout, excluding the checkout night', () => {
  const { checkOut } = stayDateRange(new Date(2026, 10, 20), 3);
  assert.deepEqual([checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate()], [2026, 10, 23]);
});
const quote = { promotion: { code: 'DIRECT1000', discount_amount: 1000 }, original_variant: { quote_fingerprint: 'current' }, variant: { total_price: 8500, price_per_night: 4250 } };
test('accept only a server coupon quote matching the displayed variant', () => {
  assert.equal(promoMatchesLiveRate(quote, 'DIRECT1000', 'current'), true);
  assert.equal(promoMatchesLiveRate(quote, 'EP300', 'current'), false);
  assert.equal(promoMatchesLiveRate(quote, 'DIRECT1000', 'stale'), false);
  assert.equal(promoMatchesLiveRate(quote, 'DIRECT1000', undefined), false);
  assert.equal(promoMatchesLiveRate({ ...quote, variant: { total_price: -1, price_per_night: 0 } }, 'DIRECT1000', 'current'), false);
});
const published = { is_published: true, room_categories: { is_active: true } };
const variant = { meal_plan_code: 'RO', cancellation_policy_code: 'refundable_credit', quote_fingerprint: 'current' };
test('unpublished room types cannot request website coupon quotes', () => {
  assert.match(couponPreviewUnavailable({ ...published, is_published: false }, variant, [variant]), /unpublished/);
});
test('inactive categories cannot request website coupon quotes', () => {
  assert.match(couponPreviewUnavailable({ ...published, room_categories: { is_active: false } }, variant, [variant]), /inactive/);
});
test('hidden meal plans cannot request website coupon quotes', () => {
  assert.match(couponPreviewUnavailable(published, { ...variant, meal_plan_code: 'FB' }, [variant]), /unavailable/);
});
test('only the current website variant is eligible for coupon preview', () => {
  assert.equal(couponPreviewUnavailable(published, variant, [variant]), null);
  assert.match(couponPreviewUnavailable(published, variant, [{ ...variant, quote_fingerprint: 'changed' }]), /changed/);
});