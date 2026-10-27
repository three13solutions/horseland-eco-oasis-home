import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MEAL_PLANS, normalizeMealPlanCode } from '../src/lib/mealPlans.ts';
const read = p => readFileSync(new URL('../'+p, import.meta.url), 'utf8');
test('exactly four canonical plans with approved names and descriptions', () => {
  assert.deepEqual(MEAL_PLANS.map(p => [p.code, p.name, p.description]), [
    ['RO', 'Room Only', 'Accommodation only; no meals included.'],
    ['BB', 'Breakfast Included', 'Accommodation with breakfast included.'],
    ['HB', 'Half Board', 'Accommodation with breakfast and dinner included.'],
    ['FB', 'Full Board', 'Accommodation with breakfast, lunch and dinner included.'],
  ]);
});
for (const plan of MEAL_PLANS) test(`${plan.code}: canonical code/name and all aliases normalize to one identity`, () => {
  for (const alias of [plan.code, plan.name, ...plan.aliases]) assert.equal(normalizeMealPlanCode(' '+alias.toLowerCase()+' '), plan.code);
});
test('unknown or missing codes do not invent a fifth plan', () => {
 for(const value of [null,undefined,'','breakfast_and_lunch','invalid']) assert.equal(normalizeMealPlanCode(value),null);
});
test('website renders saved plan descriptions and canonical selection, without tea or alias promises', () => {
 const booking=read('src/pages/Booking.tsx');
 assert.match(booking,/mealPlans\.filter\(plan => rateVariants\.some\(variant => normalizeMealPlanCode\(variant\.meal_plan_code\) === normalizeMealPlanCode\(plan\.plan_code\)\)\)\.map\(\(plan\)/);
 assert.match(booking,/\{plan\.plan_name\}/); assert.match(booking,/\{plan\.description\}/);
 assert.doesNotMatch(booking,/Hi Tea & Dinner included|all_meals_inclusive|breakfast_and_dinner/);
 assert.match(booking,/normalizeMealPlanCode\(urlMealPlan\)/);
 assert.match(booking,/setSelectedVariant\(matchingVariant \|\| null\)/);
 assert.match(booking,/normalizeMealPlanCode\(selectedVariant.meal_plan_code\) !== selectedMealPlan/);
});
test('admin displays stored aliases without merging them into descriptions',()=>{
 const admin=read('src/pages/admin/MealPlansManagement.tsx');
 assert.match(admin,/Aliases \(admin only\)/);assert.match(admin,/plan.alias_names\?\.join/);assert.match(admin,/plan.alias_codes\?\.join/);
});
test('rate popup recognizes canonical plans and omits nonexistent fifth plan',()=>{
 const selector=read('src/components/booking/RateVariantSelector.tsx');
 assert.match(selector,/normalizeMealPlanCode\(v.meal_plan_code\) === filterMealPlan/);
 assert.doesNotMatch(selector,/breakfast_and_lunch|With Breakfast/);
});
