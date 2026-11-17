import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../src/pages/admin/PricingWorkspace.tsx',import.meta.url),'utf8');
test('draft workspace does not mutate the backend or use legacy AP anchors',()=>{
  assert.doesNotMatch(ui,/\.from\(['"]rate_plan_anchors/);
  assert.doesNotMatch(ui,/\.(insert|update|upsert|delete|rpc)\(/);
  assert.match(ui,/DRAFT_NOT_APPROVED_NOT_LIVE/);
  assert.match(ui,/EP room-only rate/);
});
test('review acknowledgment resets and category changes clear selection',()=>{
  assert.match(ui,/setReview\(null\);setAccepted\(false\)/);
  assert.match(ui,/if\(!review \|\| !accepted\) return/);
  assert.match(ui,/setCategory\(e.target.value\);setDates\(\[\]\)/);
});
