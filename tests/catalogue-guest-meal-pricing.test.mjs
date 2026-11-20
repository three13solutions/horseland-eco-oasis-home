import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCatalogueMealGuestPriceRow as row,
  catalogueMealBands,
  catalogueMealBandName,
  catalogueMealPriceForGuest as price,
  mealGuestPricePaise as paise,
  parseMealGuestPriceSnapshot as parse,
  rollUpCatalogueGuestMealPrices as rollup,
} from '../src/lib/catalogue-guest-meal-pricing.ts';

const bands = [
  { key: 'infant', min_age: 0, max_age: 3, accommodation_rule: 'free', meal_rule: 'free' },
  { key: 'child', min_age: 4, max_age: 9, accommodation_rule: 'child', meal_rule: 'full' },
  { key: 'adult', min_age: 10, max_age: null, accommodation_rule: 'adult', meal_rule: 'full' },
];
const [infant, child, adult] = bands;
const meal = (seq, price) => ({
  id: `bdc003fb-413d-45d0-8c88-6746f487d21${seq}`, title: `Meal ${seq}`, meal_type: 'dinner', variant: 'veg',
  price, is_active: true, updated_at: '2026-11-21T00:00:00Z',
});
const breakfast = meal(1, 270), veg = meal(2, 650), jain = meal(3, 650);
const meals = new Map([breakfast, veg, jain].map(item => [item.id, item]));
const plan = { plan_code: 'HB', groups: [
  { id: 'breakfast', label: 'Breakfast', meal_ids: [breakfast.id] },
  { id: 'dinner', label: 'Dinner', meal_ids: [veg.id, jain.id] },
]};
const rates = parse({revision: 1, guest_policy_revision: 8,
  prices: {[breakfast.id]: {child: 135}, [veg.id]: {child: 325}, [jain.id]: {child: 325}},
});

test('adult first, configured ages retained, disabled guest types hidden', () => {
  assert.deepEqual(catalogueMealBands([...bands, {...child, key: 'teen', enabled: false}]).map(b => b.key), ['adult', 'child', 'infant']);
  assert.equal(catalogueMealBandName(infant), 'Under 4');
  assert.equal(catalogueMealBandName({...infant, max_age: 5, name: 'Toddlers'}), 'Toddlers');
});
test('missing and intentional zero differ', () => {
  assert.equal(price(veg, child), undefined);
  assert.equal(price(veg, child, {...rates, prices: {[veg.id]: {child: 0}}}), 0);
  assert.equal(price(veg, infant, {...rates, prices: {[veg.id]: {infant: 700}}}), 0);
  assert.deepEqual(row(bands, {adult: '270', child: '0', infant: '325'}), {child: 0});
  assert.deepEqual(row(bands, {child: ''}), {});
});
test('positive decimal rupees convert to exact bounded paise', () => {
  for (const invalid of ['', -1, '1.239', '1e3', '100000000', undefined, Infinity]) assert.equal(paise(invalid), undefined);
  assert.equal(paise('250.50'), 25050);
  assert.equal(paise('99999999.99'), 9999999999);
  assert.throws(() => row(bands, {child: '-1'}), /Enter a price/);
});
test('validated RPC contract rejects invalid prices and reserved adult entries', () => {
  assert.throws(() => parse({revision: 0.2, guest_policy_revision: 8, prices: {}}), /could not be verified/);
  assert.throws(() => parse({revision: 1, guest_policy_revision: 8, prices: {[veg.id]: {adult: 650}}}), /could not be verified/);
  assert.throws(() => parse({revision: 1, guest_policy_revision: 8, prices: {[veg.id]: {child: null}}}), /could not be verified/);
  assert.deepEqual(parse({revision: '1', guest_policy_revision: '8', prices: {[veg.id]: {child: '0.00'}}}).prices[veg.id], {child: 0});
});
test('AND groups sum; equal OR alternatives are charged once for each guest type', () => {
  assert.deepEqual(rollup(plan, meals, adult, rates), {kind: 'fixed', paise: 92000});
  assert.deepEqual(rollup(plan, meals, child, rates), {kind: 'fixed', paise: 46000});
  assert.deepEqual(rollup(plan, meals, infant, rates), {kind: 'fixed', paise: 0});
  assert.deepEqual(rollup({...plan, plan_code: 'RO', groups: []}, meals, child), {kind: 'fixed', paise: 0});
});
test('different OR prices stay an indicative range; missing prices/invalid link never fall back to adult', () => {
  const spread = {...rates, prices: {...rates.prices, [jain.id]: {child: 375}}};
  assert.deepEqual(rollup(plan, meals, child, spread), {kind: 'range', minPaise: 46000, maxPaise: 51000});
  assert.deepEqual(rollup(plan, meals, child), {kind: 'unavailable', reason: 'missing_price'});
  const bad = new Map(meals);
  bad.delete(veg.id);
  assert.deepEqual(rollup(plan, bad, child, rates), {kind: 'unavailable', reason: 'unavailable_meal'});
});
