import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { PAYMENT_RESOLUTION_KEY, loadPaymentResolution, savePaymentResolution, clearPaymentResolution, getFinalizationFailure } from '../src/lib/bookingPaymentResolution.ts';

function storage() {
  const data = new Map();
  return { data, getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
}
const record = { paymentId: 'pay_test', orderId: 'order_test', code: 'ROOM_TYPE_NOT_PUBLISHED', outcome: 'not_confirmed', recordedAt: '2026-10-25T00:00:00Z' };
const denied = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };

test('recovery storage explicitly persists only safe reference fields', () => {
  const s = storage(); assert.equal(savePaymentResolution({ ...record, signature: 'secret', guest: { email: 'private' } }, s), true);
  assert.deepEqual(loadPaymentResolution(s), record);
  assert.ok(!s.getItem(PAYMENT_RESOLUTION_KEY).includes('secret')); assert.ok(!s.getItem(PAYMENT_RESOLUTION_KEY).includes('private'));
  assert.equal(clearPaymentResolution(s), true); assert.equal(loadPaymentResolution(s), null);
});
test('unavailable/corrupt storage is nonthrowing and disclosed via false result', () => {
  assert.equal(loadPaymentResolution(denied), null); assert.equal(savePaymentResolution(record, denied), false); assert.equal(clearPaymentResolution(denied), false);
  const s = storage(); for (const v of ['{', 'null', '{}', '{"paymentId":42}']) { s.setItem(PAYMENT_RESOLUTION_KEY, v); assert.equal(loadPaymentResolution(s), null); }
});
test('non-2xx publication response is parsed from FunctionsHttpError context', async () => {
  const body = { success: false, resolution_required: true, booking_status: 'not_confirmed', code: 'ROOM_TYPE_NOT_PUBLISHED' };
  assert.deepEqual(await getFinalizationFailure(null, { context: new Response(JSON.stringify(body), { status: 409 }) }), { code: body.code, outcome: 'not_confirmed' });
});
test('network/unrecognized/malformed failure never claims definite rejection', async () => {
  for (const [data, error] of [[null, new Error('offline')], [null, { context: new Response('not-json', { status: 503 }) }], [{ error: 'failed' }, null]]) {
    assert.deepEqual(await getFinalizationFailure(data, error), { code: 'FINALIZATION_OUTCOME_UNKNOWN', outcome: 'unknown' });
  }
});

const page = readFileSync(new URL('../src/pages/Booking.tsx', import.meta.url), 'utf8');
const start = page.indexOf('  const handleProceedToPayment =');
const end = page.indexOf('  const handleSearchCriteriaUpdate =', start);
const handlers = stripTypeScriptTypes(page.slice(start, end), { mode: 'strip' }) + '\nglobalThis.callback = handlePaymentSuccess; globalThis.proceed = handleProceedToPayment;';
function setup({ result = { data: { success: true, booking_id: 'CONFIRMED' }, error: null }, throwInvoke, store = storage(), invoke } = {}) {
  const observed = { state: null, saved: null, modal: null, navigations: [], toasts: [], invokes: [], pending: { current: null } };
  const context = vm.createContext({
    pendingPaymentRef: observed.pending, paymentResolution: null,
    savePaymentResolution: v => savePaymentResolution(v, store),
    loadPaymentResolution: () => loadPaymentResolution(store), clearPaymentResolution: () => clearPaymentResolution(store), getFinalizationFailure,
    setResolutionSaved: v => { observed.saved = v; }, setPaymentResolution: v => { observed.state = v; },
    setShowPaymentModal: v => { observed.modal = v; },
    localStorage: store, Response, Date, console,
    guestDetails: { name: 'Local Test', email: 'local@example.invalid', phone: 'local', specialRequests: '' },
    calculateTotal: () => 100, calculateNights: () => 1,
    selectedRoomType: { id: 'type-test' }, checkIn: '2099-01-01', checkOut: '2099-01-02', adultsCount: 2, childrenCount: 0, infantsCount: 0,
    selectedMealPlan: 'BB', selectedCancellationPolicy: 'refundable_credit', selectedVariant: {}, selectedAddons: [], selectedBedding: [],
    supabase: { functions: { invoke: async (...args) => { observed.invokes.push(args); if (throwInvoke) throw new Error('offline'); return invoke ? invoke() : result; } } },
    toast: t => observed.toasts.push(t), navigate: url => observed.navigations.push(url),
    setTimeout: () => { throw new Error('A second payment must not be opened'); },
  });
  vm.runInContext(handlers, context);
  return { observed, store, context };
}

test('actual public callback: publication failure retains refs, no clear/success/navigation', async () => {
  const s = storage(); s.setItem('currentBooking', 'existing-booking-state');
  const error = { context: new Response(JSON.stringify({ success: false, resolution_required: true, code: 'ROOM_TYPE_NOT_PUBLISHED', booking_status: 'not_confirmed' }), { status: 409 }) };
  const t = setup({ store: s, result: { data: null, error } });
  await t.context.callback('pay_test', 'order_test', 'signature-never-store');
  assert.equal(t.observed.state.outcome, 'not_confirmed'); assert.equal(t.observed.modal, false);
  assert.equal(loadPaymentResolution(s).paymentId, 'pay_test'); assert.equal(s.getItem('currentBooking'), 'existing-booking-state');
  assert.equal(t.observed.navigations.length, 0); assert.equal(t.observed.toasts.length, 0);
  assert.ok(!s.getItem(PAYMENT_RESOLUTION_KEY).includes('signature-never-store'));
  t.context.proceed(); assert.equal(t.observed.invokes.length, 1);
});
test('actual public callback: explicit confirmation clears marker and navigates', async () => {
  const t = setup(); await t.context.callback('pay_test', 'order_test', 'signature');
  assert.equal(loadPaymentResolution(t.store), null); assert.equal(t.observed.pending.current, null);
  assert.equal(t.observed.navigations[0], '/booking/confirmation?booking_id=CONFIRMED');
  assert.equal(t.observed.toasts[0].title, 'Booking Confirmed!');
});
test('actual public callback: timeout retains unknown outcome and safe refs', async () => {
  const t = setup({ throwInvoke: true }); await t.context.callback('pay_test', 'order_test', 'signature');
  assert.equal(t.observed.state.outcome, 'unknown'); assert.equal(loadPaymentResolution(t.store).orderId, 'order_test');
  assert.equal(t.observed.navigations.length, 0);
});
test('actual public callback: booking_id without explicit success is not confirmation', async () => {
  const t = setup({ result: { data: { booking_id: 'UNTRUSTED' }, error: null } }); await t.context.callback('pay_test', 'order_test', 'signature');
  assert.equal(t.observed.state.outcome, 'unknown'); assert.equal(t.observed.navigations.length, 0);
});
test('actual public callback: slow finalizer plus blocked storage cannot reopen payment', async () => {
  let resolve; const wait = new Promise(r => { resolve = r; });
  const t = setup({ store: denied, invoke: () => wait }); const pending = t.context.callback('pay_test', 'order_test', 'signature');
  assert.equal(t.observed.pending.current.paymentId, 'pay_test'); assert.equal(t.observed.saved, false);
  t.context.proceed(); assert.equal(t.observed.state.paymentId, 'pay_test'); assert.equal(t.observed.modal, false);
  resolve({ data: { success: false, resolution_required: true, code: 'ROOM_TYPE_NOT_PUBLISHED', booking_status: 'not_confirmed' }, error: null }); await pending;
  assert.equal(t.observed.invokes.length, 1); assert.equal(t.observed.state.outcome, 'not_confirmed');
});
test('actual public callback: blocked storage cleanup does not reverse confirmed result', async () => {
  const t = setup({ store: denied }); await t.context.callback('pay_test', 'order_test', 'signature');
  assert.equal(t.observed.state, null); assert.equal(t.observed.pending.current, null);
  assert.equal(t.observed.navigations[0], '/booking/confirmation?booking_id=CONFIRMED');
  assert.equal(t.observed.toasts[0].title, 'Booking Confirmed!');
});
test('refresh marker is independent of selected room, date and clear-booking UI', () => {
  assert.ok(page.indexOf('if (paymentResolution) {') < page.indexOf('if (showBookingForm && selectedRoomType) {'));
  assert.ok(page.includes('useState<BookingPaymentResolution | null>(loadPaymentResolution)'));
  const s = storage(); savePaymentResolution(record, s); assert.equal(loadPaymentResolution(s).paymentId, record.paymentId);
});
