import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readQuickInventoryRequest, persistQuickInventoryRequest } from '../src/lib/inventoryQuickUpdate.ts';
const request={schema:1,id:'00000000-0000-4000-8000-000000000001',change:{category_id:'00000000-0000-4000-8000-000000000002',date:'2026-11-01',remaining:3,expected_version:7}};
const storage=()=>{const m=new Map();return{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
test('unknown save persists exact UUID, count and old revision for reload and retry',()=>{
 const s=storage();persistQuickInventoryRequest(s,'user-key',request);
 assert.deepEqual(readQuickInventoryRequest(s,'user-key'),request);
 assert.equal(readQuickInventoryRequest(s,'different-user'),null);
});
test('blocked or silently failed storage prevents submission',()=>{
 assert.throws(()=>persistQuickInventoryRequest({getItem:()=>null,setItem:()=>{throw Error('blocked')}},'key',request),/blocked/);
 assert.throws(()=>persistQuickInventoryRequest({getItem:()=>null,setItem:()=>{}},'key',request),/No save was sent/);
});
test('malformed saved requests are not replaced by new operations',()=>{
 for(const value of [{...request,id:'not-an-id'},{...request,change:{...request.change,remaining:-1}},{...request,change:{...request.change,date:'2026-02-30'}},{...request,change:{...request.change,expected_version:1.5}}]) {
  const s=storage();s.setItem('key',JSON.stringify(value));assert.throws(()=>readQuickInventoryRequest(s,'key'));
 }
});
test('full page and widget use identical RPC API, query invalidation and optimistic revision guards',()=>{
 const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const full=get('src/pages/admin/WebsiteAvailability.tsx'),quick=get('src/components/admin/QuickRoomInventory.tsx'),api=get('src/lib/distributionInventoryApi.ts');
 assert.match(full,/saveDistributionInventory\(canonicalChanges, saveRequest.current.id\)/);
 assert.match(quick,/saveDistributionInventory\(\[request.change\], request.id\)/);
 assert.match(api,/rpc\('save_distribution_inventory', \{ p_changes: changes, p_request_id: requestId \}\)/);
 assert.match(quick,/makeChange\(original \|\| cell, count\)/);
 assert.match(quick,/const locked = !!pending/);
 assert.match(quick,/queryKey: \['distribution-inventory'\]/);
 assert.doesNotMatch(quick,/from\('room_units'\)|management_block|operational_status|\.update\(/);
 assert.ok(quick.indexOf('persistQuickInventoryRequest(sessionStorage')<quick.indexOf('save.mutate(request)'));
});
test('inventory has one Channels entrypoint, legacy route alias and dashboard shortcut',()=>{
 const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 assert.match(get('src/App.tsx'),/path="distribution\/availability" element={<WebsiteAvailability/);
 assert.match(get('src/App.tsx'),/path="distribution\/inventory" element={<WebsiteAvailability/);
 const sidebar=get('src/components/admin/AdminSidebar.tsx');
 const group=sidebar.slice(sidebar.indexOf('const distributionMenuItems'),sidebar.indexOf('const distributionMenuItems')+220);
 assert.match(group,/label: 'Channels'/);assert.doesNotMatch(group,/label: 'Website Availability'|label: 'Room Inventory'/);
 assert.match(get('src/pages/admin/DistributionChannels.tsx'),/Room Inventory/);
 assert.match(get('src/components/admin/DashboardContent.tsx'),/<QuickRoomInventory \/>/);
});
