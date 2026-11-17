import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const ui=read('src/components/admin/LiveMealPricing.tsx'),client=read('src/lib/meal-pricing-client.ts');
test('both production screens use the same secure shared meal component',()=>{
 assert.match(read('src/pages/admin/MealsManagement.tsx'),/<LiveMealPricing catalogueOnly onSaved={loadMeals}/);
 assert.match(read('src/pages/admin/MealPlansManagement.tsx'),/<LiveMealPricing \/>/);
 assert.match(client,/save_shared_meal_prices/);assert.match(client,/p_expected_revision: workspace.revision/);
 assert.match(client,/normalizeMealWorkspace\(data\)/);
});
test('metadata edits cannot silently write old price or supplement values',()=>{
 const meals=read('src/pages/admin/MealsManagement.tsx'),plans=read('src/pages/admin/MealPlansManagement.tsx');
 assert.match(meals,/price: _price, \.\.\.metadata/);assert.match(meals,/\.update\(metadata\)/);
 assert.match(plans,/supplement_per_person_inr: _amount/);assert.match(plans,/included_meal_types: _included/);assert.match(plans,/\.update\(metadata\)/);
});
test('live mutations require review acknowledgment reason and not busy',()=>{
 assert.match(ui,/!priceEdit \|\| !ack \|\| !reason.trim\(\) \|\| validation/);
 assert.match(ui,/!planEdit \|\| !reviewPlan \|\| !ack \|\| !reason.trim\(\)/);
 assert.match(ui,/!statusEdit \|\| !ack \|\| !reason.trim\(\) \|\| busy/);
 assert.match(ui,/if \(busy\) return;/);
});
test('OR batch expansion is opt-in and unequal groups block go-live',()=>{
 assert.match(ui,/useState\(false\)/);assert.match(ui,/applyAlternatives \? relatedIds : \[priceEdit.mealId\]/);
 assert.match(ui,/if \(impacts.some\(i => i.next.min !== i.next.max\)\)/);
 assert.match(ui,/explicit batch change, not automatic propagation/);
});
test('captures opening revision, resets approvals, and reports success only after RPC',()=>{
 assert.match(ui,/workspace: structuredClone\(workspace\)/);
 assert.match(ui,/setAmount\(e.target.value\); setAck\(false\)/);
 assert.match(ui,/setApplyAlternatives\(e.target.checked\); setAck\(false\)/);
 assert.match(ui,/await saved\(await saveSharedMealPrices/);
 assert.match(ui,/await saved\(await saveLiveMealGroups/);
});
