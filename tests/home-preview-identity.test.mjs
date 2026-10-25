import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/components/StayPreview.tsx', import.meta.url), 'utf8');
const ids = ['47b2ee9c-bd3b-4cbf-9795-ff9ca4c02d55', '2fd9b1b5-d067-49af-a47d-64a17ce524eb', '73dbc09f-64c2-4498-b58f-549151605ee4'];
const constants = source.match(/const HOME_PREVIEW_ROOM_TYPE_IDS = \[[\s\S]*?\];/)[0];
const query = source.match(/queryFn: (async \(\) => \{[\s\S]*?)\n    }\n  }\);/)[1] + '\n}';
async function run(rows, error = null) {
  const calls = [];
  let selected = rows;
  const chain = {
    from(table) { calls.push(['from', table]); return this; },
    select(fields) { calls.push(['select', fields]); return this; },
    eq(key, value) { calls.push(['eq', key, value]); selected = selected?.filter(row => row[key] === value); return this; },
    in(key, values) { calls.push(['in', key, [...values]]); selected = selected?.filter(row => values.includes(row[key])); return Promise.resolve({ data: selected, error }); },
  };
  const result = await vm.runInNewContext(`${constants}\n(${query})()`, { supabase: chain });
  return { result, calls };
}
test('home preview keeps the same ordered identities after display-name changes', async () => {
  const rows = [2, 0, 1].map(i => ({ id: ids[i], name: ['Standard', 'Deluxe renamed', 'Superior renamed'][i], is_published: true }));
  rows.push({ id: 'other', name: 'Standard AC', is_published: true });
  const { result, calls } = await run(rows);
  assert.deepEqual(Array.from(result, row => row.id), ids);
  assert.deepEqual(calls, [['from', 'room_types'], ['select', '*'], ['eq', 'is_published', true], ['in', 'id', ids]]);
});
test('unpublished selected types remain excluded', async () => {
  const { result } = await run(ids.map((id, i) => ({ id, is_published: i !== 0 })));
  assert.deepEqual(Array.from(result, row => row.id), ids.slice(1));
});
test('null results remain safe and database errors propagate', async () => {
  assert.equal((await run(null)).result.length, 0);
  const error = new Error('database unavailable');
  await assert.rejects(run([], error), error);
});
