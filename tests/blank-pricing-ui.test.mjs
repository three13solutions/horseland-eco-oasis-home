import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
test('new and cleared room types use blank prices instead of zero', () => {
 const source=read('src/pages/admin/RoomManagement.tsx');
 assert.match(source, /base_price: '' as string/);
 assert.match(source, /base_price: !editingRoom \|\| editingRoom.pricing_status/);
 assert.match(source, /room.base_price == null \? 'Not configured'/);
 assert.doesNotMatch(source, /base_price: 0,/);
});
test('assigning first unit prompts complete pricing configuration', () => {
 const source=read('src/pages/admin/RoomManagement.tsx');
 assert.match(source, /setPricingSetupType\(unitFormData.room_type_id\)/);
 assert.match(source, /Complete pricing configuration/);
 assert.match(source, /rate-plans\?room_type_id=/);
});
test('rate plan editor rejects empty types and supports setup deep link', () => {
 const source=read('src/pages/admin/RatePlans.tsx');
 assert.match(source, /Assign a unit to this room type before configuring pricing/);
 assert.match(source, /disabled={!unitCount\(item.id\)}/);
 assert.match(source, /searchParams.get\('room_type_id'\)/);
 assert.match(source, /Empty — pricing blank/);
 assert.match(source, /Uncovered dates remain unavailable/);
});
test('legacy pricing type selectors require inventory', () => {
 for(const file of ['PricingConstraintsTab','GuestCompositionTab','ChannelRulesTab','TacticalOverridesTab']) {
  assert.match(read(`src/components/admin/pricing-rules/${file}.tsx`), /room_units!inner\(id\)/, file);
 }
});

test('new and unconfigured room types cannot be published through the form', () => {
 const source=read('src/pages/admin/RoomManagement.tsx');
 assert.match(source, /is_published: !editingRoom \|\| editingRoom.pricing_status === 'configuration_required' \? false/);
 assert.match(source, /disabled={!editingRoom \|\| editingRoom.pricing_status === 'configuration_required'}/);
});

test('cleanup UI previews first and sends fingerprint with exact confirmation', () => {
 const source=read('src/pages/admin/RatePlans.tsx');
 assert.match(source, /get_room_type_pricing_cleanup_preview/);
 assert.match(source, /p_confirmation_name: cleanupName/);
 assert.match(source, /p_expected_fingerprint: preview.fingerprint/);
 assert.match(source, /canConfirmPricingCleanup\(preview, cleanupName, cleanupAcknowledged\)/);
 assert.match(source, /unitCount\(type.id\)<=1/);
 assert.match(source, /setCleanupAcknowledged\(false\); }, \[cleanupPreview.data\?\.fingerprint\]/);
 assert.match(source, /Publication status is unchanged/);
});
