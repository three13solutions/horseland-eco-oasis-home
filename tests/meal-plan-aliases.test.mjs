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
test('add and update use the same editable alias payload', () => {
 const source = readFileSync(new URL('../src/pages/admin/MealPlansManagement.tsx',import.meta.url),'utf8');
 assert.match(source,/mealPlanAliasPayload\(alias_names_text, alias_codes_text\)/);
 assert.match(source,/\.update\(data\)/); assert.match(source,/\.insert\(\[data\]\)/);
 assert.match(source,/id="alias-names" value=\{formData.alias_names_text\}/);
 assert.match(source,/id="alias-codes" value=\{formData.alias_codes_text\}/);
 assert.doesNotMatch(source,/editingPlan && \(/);
});
