import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const ui=readFileSync(new URL('../src/components/admin/pricing-workspace/MealChoiceDrafts.tsx',import.meta.url),'utf8');
const workspace=readFileSync(new URL('../src/pages/admin/PricingWorkspace.tsx',import.meta.url),'utf8');
// Source guards only, not browser interaction tests.
test('meal workspace reads catalogue only and never writes backend or calls quote RPC',()=>{
  assert.match(ui,/\.from\('meals'\)/);
  assert.doesNotMatch(ui,/\.(insert|update|upsert|delete|rpc)\(/);
  assert.doesNotMatch(ui,/\.from\(['"](?:rate_plan_anchors|bookings|meal_plan_rules|meal_supplement_versions)/);
  assert.match(ui,/DRAFT_NOT_APPROVED_NOT_LIVE/);
  assert.match(ui,/Session simulation only/);
});
test('shared price requires confirmation, valid changed amount and clears acknowledgment on edits/close',()=>{
  assert.match(ui,/!editing \|\| !confirmed \|\| parsedPrice === undefined \|\| priceError \|\| parsedPrice === editing.pricePaise/);
  assert.match(ui,/function closePrice\(\) \{ setEditingId\(null\); setConfirmed\(false\)/);
  assert.match(ui,/setNextPrice\(e.target.value\); setConfirmed\(false\)/);
});
test('actual choices are calculated independently; incomplete impacts are disclosed',()=>{
  assert.match(ui,/calculateMealChoices\(plan, catalogue, guests\)/);
  assert.match(ui,/Full plan range unavailable/);
  assert.match(ui,/Ranges describe allowed alternatives, not a chosen price/);
  assert.match(ui,/linked in another group/);
});
test('draft tab preserves state across tab switches and warns calendar remains separate',()=>{
  assert.match(workspace,/<TabsContent value="plans" forceMount[^>]*><MealChoiceDrafts\/>/);
  assert.match(workspace,/separate from the Meal Plans & Choices simulation/);
  assert.match(ui,/previous plan selections have been cleared/);
});
