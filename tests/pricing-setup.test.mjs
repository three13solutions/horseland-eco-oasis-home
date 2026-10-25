import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSetupExtraRates } from '../src/lib/pricing-setup.ts';
test('configured lifecycle requires explicit adult and child extras before verified activation', () => {
 for (const status of ['configuration_required', 'ready']) {
  for (const rates of [['', '100'], ['100', ''], [' ', ' ']]) {
   assert.throws(() => validateSetupExtraRates(status, true, true, ...rates), /Enter 0 explicitly if free/);
  }
  assert.doesNotThrow(() => validateSetupExtraRates(status, true, true, '0', '0'));
  assert.doesNotThrow(() => validateSetupExtraRates(status, true, true, '4500', '3000'));
 }
});
test('drafts and legacy plans retain existing validation semantics', () => {
 assert.doesNotThrow(() => validateSetupExtraRates('configuration_required', false, true, '', ''));
 assert.doesNotThrow(() => validateSetupExtraRates('configuration_required', false, false, '', ''));
 assert.doesNotThrow(() => validateSetupExtraRates('legacy', true, true, '', ''));
});

import { canConfirmPricingCleanup } from '../src/lib/pricing-setup.ts';
const cleanup = {type_id:'type-a',name:'Loft',unit_count:1,counts:{anchors:2},base_price:100,fingerprint:'current'};
test('permanent cleanup requires exact name, acknowledgement and zero/one units', () => {
 assert.equal(canConfirmPricingCleanup(cleanup,'Loft',true),true);
 assert.equal(canConfirmPricingCleanup({...cleanup,unit_count:0},'Loft',true),true);
 for (const name of ['', 'loft', 'Loft ']) assert.equal(canConfirmPricingCleanup(cleanup,name,true),false);
 assert.equal(canConfirmPricingCleanup(cleanup,'Loft',false),false);
 for (const unit_count of [2,-1,0.5]) assert.equal(canConfirmPricingCleanup({...cleanup,unit_count},'Loft',true),false);
 assert.equal(canConfirmPricingCleanup({...cleanup,fingerprint:''},'Loft',true),false);
 assert.equal(canConfirmPricingCleanup(undefined,'Loft',true),false);
});
