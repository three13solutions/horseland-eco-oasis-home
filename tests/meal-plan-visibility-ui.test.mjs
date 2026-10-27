import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateVisibilityRule, validVisibilityDate, mealPlanCodesOffered, variantStillOffered } from '../src/lib/mealPlanVisibility.ts';
const id='00000000-0000-4000-8000-000000000001',meal='00000000-0000-4000-8000-000000000002',unit='00000000-0000-4000-8000-000000000003';
const rule=()=>({id,name:'Hide FB on selected nights',is_active:false,scope_kind:'all',meal_plan_ids:[meal],room_type_ids:[],room_unit_ids:[],start_date:null,end_date:null});
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('visibility editor defaults to disabled, accepts all dates and exact selected-unit scope',()=>{
 assert.doesNotThrow(()=>validateVisibilityRule(rule()));
 assert.doesNotThrow(()=>validateVisibilityRule({...rule(),scope_kind:'units',room_unit_ids:[unit],start_date:'2026-11-01',end_date:'2026-11-03'}));
 assert.doesNotThrow(()=>validateVisibilityRule({...rule(),scope_kind:'types',room_type_ids:[unit]}));
 const component=src('src/components/admin/WebsiteMealPlanVisibility.tsx');assert.match(component,/is_active:false/);assert.match(component,/Save disabled draft/);assert.match(component,/including Room Only/);assert.match(component,/checkout day is excluded/);assert.match(component,/already payable checkout holds are preserved/);
});
test('invalid scope selections and incomplete/impossible date windows are rejected',()=>{
 for(const change of [{meal_plan_ids:[]},{meal_plan_ids:[meal,meal]},{scope_kind:'units'},{scope_kind:'all',room_unit_ids:[unit]},{scope_kind:'types',room_type_ids:[unit],room_unit_ids:[unit]},{start_date:'2026-11-01'},{start_date:'2026-02-30',end_date:'2026-03-02'},{start_date:'2026-11-03',end_date:'2026-11-01'}])assert.throws(()=>validateVisibilityRule({...rule(),...change}));
 assert.equal(validVisibilityDate('2026-02-30'),false);assert.equal(validVisibilityDate('2028-02-29'),true);
});
test('hidden selected plan or changed quote invalidates selection without choosing another',()=>{
 const selected={meal_plan_code:'FB',cancellation_policy_code:'credit',quote_fingerprint:'q1'};
 const alternatives=[{meal_plan_code:'RO',cancellation_policy_code:'credit',quote_fingerprint:'q2'}];
 assert.equal(variantStillOffered(selected,alternatives),false);assert.equal(variantStillOffered(selected,[{...selected,quote_fingerprint:'changed'}]),false);
 assert.equal(variantStillOffered(selected,[selected]),true);assert.deepEqual([...mealPlanCodesOffered(alternatives)],['RO']);assert.equal(selected.meal_plan_code,'FB');
});
test('public callers use filtered website RPC while staff/manual pricing retains legacy mode',()=>{
 const hook=src('src/hooks/useDynamicPricing.ts');assert.match(hook,/website = false/);assert.match(hook,/website \? 'calculate_website_rate_variants' : 'calculate_rate_variants_v2'/);assert.match(hook,/query.isError \|\| query.isFetching \? undefined : query.data/);
 for(const file of ['src/components/booking/AvailableRoomCard.tsx','src/components/stay/CategoryCard.tsx','src/components/stay/CategoryBookingModal.tsx'])assert.match(src(file),/website: true/);
 assert.doesNotMatch(src('src/components/admin/ManualBookingModal.tsx'),/website: true|calculate_website_rate_variants/);
 const booking=src('src/pages/Booking.tsx');assert.match(booking,/rpc\('calculate_website_rate_variants'/);assert.match(booking,/mealPlans.filter\(plan => rateVariants.some/);assert.match(booking,/disabled=\{websiteRatesChecking \|\| websiteRatesError/);
});
test('dated card cannot invent a fallback price or continue with a hidden plan',()=>{
 const card=src('src/components/stay/CategoryCard.tsx');assert.doesNotMatch(card,/applyMealPlanAdjustment|variants\.map\(v => v.meal_plan_code\) : MEAL_PLANS/);
 assert.match(card,/if \(checkIn && checkOut && \(!selectedVariant \|\| isLoading\)\) return/);
 assert.match(card,/selectedVariant \|\| !checkIn \|\| !checkOut \? `₹\$\{displayPrice.toLocaleString\(\)\}` : '—'/);
 assert.match(card,/no replacement was selected/);
 assert.match(src('src/components/stay/CategoryBookingModal.tsx'),/!variantStillOffered\(selectedVariant, variants\)/);
});
test('visibility saves persist stable ID/payload before RPC; retries retain full arrays and revision',()=>{
 const component=src('src/components/admin/WebsiteMealPlanVisibility.tsx');assert.match(component,/id:crypto.randomUUID\(\)/);assert.match(component,/p_rule:payload.rule,p_expected_revision:payload.expectedRevision/);
 assert.match(component,/const payload=pending\|\|/);assert.ok(component.indexOf('sessionStorage.setItem(storageKey,raw)')<component.indexOf('save.mutate(payload)'));
 assert.match(component,/meal_plan_ids:\[\.\.\.rule.meal_plan_ids\]/);assert.match(component,/room_unit_ids:\[\.\.\.rule.room_unit_ids\]/);assert.match(component,/earlier save may already have completed/);
 assert.doesNotMatch(component,/\.from\('rate_plan_anchors'\)|\.from\('bookings'\)|\.from\('room_units'\)\.update/);
});
