import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseMealPlanAliases, mealPlanAliasPayload, findMealPlanAliasConflict } from '../src/lib/mealPlanAliases.ts';
test('alias input trims, drops blanks and deduplicates without altering spelling', () => {
 assert.deepEqual(parseMealPlanAliases(' CP, cp,\n EP , , '), ['CP', 'EP']);
});
test('alias save payload preserves separate arrays and supports clearing', () => {
 assert.deepEqual(mealPlanAliasPayload('Bed & Breakfast, Continental Plan','CP'), { alias_names:['Bed & Breakfast','Continental Plan'], alias_codes:['CP'] });
 assert.deepEqual(mealPlanAliasPayload('',''), {alias_names:[],alias_codes:[]});
});
test('another plan code, name or alias cannot be reused ambiguously', () => {
 const other = [{ plan_code:'BB',plan_name:'Breakfast Included',alias_names:['Continental Plan'],alias_codes:['CP'] }];
 for(const alias of ['bb','breakfast included','continental plan','cp']) assert.equal(findMealPlanAliasConflict([alias],other),alias);
 assert.equal(findMealPlanAliasConflict(['EP'],other),undefined);
});
test('metadata edits preserve editable alias payload without bypassing shared pricing', () => {
 const source = readFileSync(new URL('../src/pages/admin/MealPlansManagement.tsx',import.meta.url),'utf8');
 assert.match(source,/mealPlanAliasPayload\(alias_names_text, alias_codes_text\)/);
 assert.match(source,/\.update\(metadata\)/); assert.match(source,/\.\.\.aliases/);
 assert.match(source,/supplement_per_person_inr: _amount/);
 assert.doesNotMatch(source,/\.insert\(/);
 assert.match(source,/id="alias-names" value=\{formData.alias_names_text\}/);
 assert.match(source,/id="alias-codes" value=\{formData.alias_codes_text\}/);
 assert.doesNotMatch(source,/editingPlan && \(/);
});
test('existing plan supplements are derived through shared-price review, not metadata edits', () => {
 const source = readFileSync(new URL('../src/pages/admin/MealPlansManagement.tsx',import.meta.url),'utf8');
 assert.match(source,/supplement_per_person_inr: supplement/);
 assert.match(source,/Number\.isFinite\(supplement\)/);
 assert.match(source,/Linked required groups below derive the plan supplements/);
 assert.match(source,/included_meal_types: _included/);
 assert.match(source,/<LiveMealPricing \/>/);
 assert.doesNotMatch(source,/supplement_pricing_enabled: (true|false)/);
});
