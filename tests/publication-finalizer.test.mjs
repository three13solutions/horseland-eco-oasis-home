import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { webcrypto, createHmac } from 'node:crypto';

const source = readFileSync(new URL('../supabase/functions/finalize-booking/index.ts', import.meta.url), 'utf8');
// Execute the actual finalizer with injected I/O, not a reimplementation of its logic.
const runnable = stripTypeScriptTypes(source.replace(/^import .*\n/gm, ''), { mode: 'strip' });
const typeId = '11111111-1111-4111-8111-111111111111';
const otherType = '22222222-2222-4222-8222-222222222222';
const unitId = '33333333-3333-4333-8333-333333333333';
const secret = 'local-test-secret-not-a-real-credential';
const signature = createHmac('sha256', secret).update('order_test|pay_test').digest('hex');

async function run(config = {}) {
  const calls = [], logs = [];
  let publicationReads = 0, handler;
  class Query {
    constructor(table) { this.table = table; this.operation = 'select'; this.filters = []; }
    select(fields) { this.fields = fields; return this; }
    eq(key, value) { this.filters.push([key, value]); return this; }
    neq() { return this; } in() { return this; } lt() { return this; }
    gt() { return this; } or() { return this; } limit() { return this; }
    order() { return this; }
    insert(value) { this.operation = 'insert'; this.value = value; return this; }
    update(value) { this.operation = 'update'; this.value = value; return this; }
    maybeSingle() { return this.execute(); }
    single() { return this.execute(); }
    then(resolve, reject) { return this.execute().then(resolve, reject); }
    async execute() {
      calls.push({ table: this.table, operation: this.operation, fields: this.fields, value: this.value, filters: this.filters });
      if (this.table === 'api_integrations') return { data: null, error: null };
      if (this.table === 'room_types') {
        publicationReads++;
        if (config.lookupThrows) throw new Error('network unavailable');
        if (config.lookupError) return { data: null, error: { message: 'lookup failed' } };
        const published = config.unpublishBeforeInsert && publicationReads > 1 ? false : ('published' in config ? config.published : true);
        return { data: config.missingRow ? null : { id: typeId, is_published: published }, error: null };
      }
      if (this.table === 'bookings' && this.operation === 'select' && this.fields.includes('booking_id')) {
        return { data: config.existing ?? null, error: config.existingError ? { message: 'idempotency lookup failed' } : null };
      }
      if (this.table === 'bookings' && this.operation === 'select') return { data: [], error: null };
      if (this.table === 'bookings' && this.operation === 'insert') return { data: { ...this.value[0], id: 'booking-db-id' }, error: null };
      if (this.table === 'room_units' && this.fields === 'room_type_id') {
        return { data: config.missingUnit ? null : { room_type_id: config.unitType ?? typeId }, error: null };
      }
      if (this.table === 'room_units' && this.operation === 'select') return { data: [{ id: unitId, unit_number: '101' }], error: null };
      if (this.table === 'guests' && this.operation === 'select') return { data: [], error: null };
      if (this.table === 'guests' && this.operation === 'insert') return { data: { id: 'guest-test' }, error: null };
      return { data: null, error: null };
    }
  }
  const client = {
    from: table => new Query(table),
    functions: { invoke: async name => { calls.push({ table: name, operation: 'invoke' }); return { data: {}, error: null }; } },
  };
  const context = vm.createContext({
    serve: fn => { handler = fn; }, createClient: () => client,
    Deno: { env: { get: key => ({ RAZORPAY_KEY_ID: 'rzp_test_local', RAZORPAY_SECRET: secret })[key] } },
    crypto: webcrypto, TextEncoder, TextDecoder, Uint8Array, Response, Request, atob,
    console: { error: (...args) => logs.push(args), log: (...args) => logs.push(args) },
  });
  vm.runInContext(runnable, context);
  const booking = { booking_id: 'BOOK_LOCAL_TEST', room_type_id: typeId, check_in: '2099-01-01', check_out: '2099-01-02', total_amount: 100, ...config.booking };
  const payload = { razorpay_order_id: 'order_test', razorpay_payment_id: 'pay_test', razorpay_signature: signature,
    guest: { first_name: 'Local', last_name: 'Test', email: 'local-test@example.invalid', phone: 'local-test-only', id_type: 'other', id_number: 'never-log-me' }, booking,
    ...config.payload };
  const response = await handler(new Request('http://localhost/finalize-booking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }));
  return { status: response.status, body: await response.json(), calls, logs, publicationReads };
}
function assertNoWrites(result) {
  assert.deepEqual(result.calls.filter(c => ['insert', 'update', 'invoke'].includes(c.operation)), []);
}
function assertResolution(result, code, status = 409) {
  assert.equal(result.status, status); assert.equal(result.body.success, false);
  assert.equal(result.body.code, code); assert.equal(result.body.resolution_required, true);
  assert.equal(result.body.payment_reference, 'pay_test'); assert.equal(result.body.order_reference, 'order_test');
  assert.equal(result.body.booking_id, undefined);
  const evidence = JSON.stringify([result.body, result.logs]);
  assert.ok(!evidence.includes(signature)); assert.ok(!evidence.includes('never-log-me'));
  assert.ok(!evidence.includes('local-test@example.invalid'));
}

test('published room follows existing booking/payment/email path', async () => {
  const r = await run(); assert.equal(r.status, 200); assert.equal(r.body.success, true);
  assert.equal(r.body.booking_id, 'BOOK_LOCAL_TEST'); assert.equal(r.publicationReads, 2);
  assert.equal(r.calls.filter(c => c.table === 'bookings' && c.operation === 'insert').length, 1);
  assert.equal(r.calls.filter(c => c.table === 'send-booking-confirmation').length, 1);
});
for (const [label, config] of [['unpublished', { published: false }], ['null publication', { published: null }], ['string publication', { published: 'true' }], ['missing row', { missingRow: true }]]) {
  test(`${label} is rejected before any writes`, async () => { const r = await run(config); assertResolution(r, 'ROOM_TYPE_NOT_PUBLISHED'); assertNoWrites(r); });
}
for (const room_type_id of [null, undefined, '', ' ', 123]) {
  test(`missing/invalid type ${String(room_type_id)} fails closed`, async () => { const r = await run({ booking: { room_type_id } }); assertResolution(r, 'ROOM_TYPE_REQUIRED'); assertNoWrites(r); });
}
for (const config of [{ lookupError: true }, { lookupThrows: true }]) {
  test(`room lookup failure ${JSON.stringify(config)} rejects`, async () => { const r = await run(config); assertResolution(r, 'ROOM_PUBLICATION_CHECK_FAILED', 503); assertNoWrites(r); });
}
test('published type cannot disguise explicit unit of another type', async () => {
  const r = await run({ booking: { room_unit_id: unitId }, unitType: otherType }); assertResolution(r, 'ROOM_SELECTION_MISMATCH'); assertNoWrites(r);
});
test('missing explicit unit rejects', async () => {
  const r = await run({ booking: { room_unit_id: unitId }, missingUnit: true }); assertResolution(r, 'ROOM_SELECTION_MISMATCH'); assertNoWrites(r);
});
test('matching explicit unit on published type passes', async () => {
  const r = await run({ booking: { room_unit_id: unitId } }); assert.equal(r.body.success, true); assert.equal(r.body.room_unit_id, unitId);
});
test('caller publication/staff flags cannot override server unpublished state', async () => {
  const r = await run({ published: false, booking: { is_published: true, channel: 'admin', is_admin: true } }); assertResolution(r, 'ROOM_TYPE_NOT_PUBLISHED'); assertNoWrites(r);
});
test('confirmed payment replay survives later unpublication without writes', async () => {
  const r = await run({ published: false, existing: { booking_id: 'EXISTING', room_unit_id: unitId, payment_status: 'confirmed' } });
  assert.equal(r.body.success, true); assert.equal(r.body.booking_id, 'EXISTING'); assert.equal(r.publicationReads, 0); assertNoWrites(r);
});
for (const payment_status of ['pending', 'cancelled']) {
  test(`${payment_status} payment replay is not falsely confirmed`, async () => { const r = await run({ existing: { booking_id: 'EXISTING', payment_status } }); assertResolution(r, 'EXISTING_BOOKING_REQUIRES_REVIEW'); assertNoWrites(r); });
}
test('idempotency lookup error preserves unknown outcome and fails closed', async () => {
  const r = await run({ existingError: true }); assertResolution(r, 'BOOKING_LOOKUP_FAILED', 503); assert.equal(r.body.booking_status, 'unknown'); assertNoWrites(r);
});
test('invalid signature never reaches publication or writes', async () => {
  const r = await run({ payload: { razorpay_signature: 'forged' } }); assert.equal(r.status, 400); assert.equal(r.publicationReads, 0); assertNoWrites(r);
});
test('unpublished during guest processing is caught before booking insert', async () => {
  const r = await run({ unpublishBeforeInsert: true }); assertResolution(r, 'ROOM_TYPE_NOT_PUBLISHED');
  assert.equal(r.publicationReads, 2);
  assert.equal(r.calls.filter(c => ['bookings', 'payments', 'room_units', 'send-booking-confirmation'].includes(c.table) && ['insert', 'update', 'invoke'].includes(c.operation)).length, 0);
});
