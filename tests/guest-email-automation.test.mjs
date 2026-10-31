import test from 'node:test';
import assert from 'node:assert/strict';
import { fillEmail, maySendEmail, EMAIL_TRIGGERS, EMAIL_PLACEHOLDERS } from '../supabase/functions/_shared/guestEmail.ts';

const booking = { id: 'b1', payment_status: 'confirmed', check_in: '2026-12-10', check_out: '2026-12-12' };
const template = { is_active: true, trigger_enabled: true, trigger_event: 'booking_confirmed' };
const event = { template_key: 'booking_confirmation', event_type: 'booking_confirmed' };
test('enabled confirmation sends only for a confirmed booking', () => {
  assert.equal(maySendEmail(event, template, booking, {}), true);
  assert.equal(maySendEmail(event, template, { ...booking, payment_status: 'pending' }, {}), false);
});
test('template disable prevents automated sending', () => assert.equal(maySendEmail(event, { ...template, is_active: false }, booking, {}), false));
test('automatic trigger disable prevents sending', () => assert.equal(maySendEmail(event, { ...template, trigger_enabled: false }, booking, {}), false));
test('existing confirmation master toggle remains authoritative', () => assert.equal(maySendEmail(event, template, booking, { send_booking_confirmation: false }), false));
test('changing the configured trigger cancels a queued old event', () => assert.equal(maySendEmail(event, { ...template, trigger_event: 'payment_completed' }, booking, {}), false));
test('date reminders skip cancelled bookings and changed stay dates', () => {
  const reminder = { event_type: 'before_check_in', template_key: 'check_in_reminder', event_key: 'reminder:b1:check_in_reminder:2026-12-10:2026-12-12' };
  const t = { ...template, trigger_event: 'before_check_in' };
  assert.equal(maySendEmail(reminder, t, booking, {}), true);
  assert.equal(maySendEmail(reminder, t, { ...booking, payment_status: 'cancelled' }, {}), false);
  assert.equal(maySendEmail(reminder, t, { ...booking, check_in: '2026-12-11' }, {}), false);
});
test('guest values are substituted and HTML escaped', () => {
  assert.equal(fillEmail('Hello {{guest_name}} — {{booking_id}}', { guest_name: '<Ali>', booking_id: 'HL-123' }, true), 'Hello &lt;Ali&gt; — HL-123');
  assert.equal(fillEmail('Hello {{guest_name}}', { guest_name: '<Ali>' }), 'Hello <Ali>');
});
test('booking payment and stay events and payment placeholders are supported', () => {
  for (const e of ['booking_confirmed', 'booking_cancelled', 'payment_completed', 'payment_failed', 'payment_pending', 'payment_refunded', 'before_check_in', 'before_check_out', 'after_check_out']) assert.ok(EMAIL_TRIGGERS.some(([key]) => key === e));
  for (const p of ['guest_name', 'booking_id', 'check_in', 'check_out', 'total_amount', 'payment_amount', 'refund_amount']) assert.ok(EMAIL_PLACEHOLDERS.includes(p));
});