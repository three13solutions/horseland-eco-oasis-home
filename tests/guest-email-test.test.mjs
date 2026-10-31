import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEmailTest, renderEmailTest } from '../supabase/functions/_shared/guestEmailTest.ts';

const input = { template_id: '12345678-1234-1234-1234-123456789abc', to: 'admin@example.com', subject: 'Booking {{booking_id}}', html_body: '<h1>{{guest_name}}</h1><p>{{total_amount}}</p>' };
test('test email accepts one valid recipient and rejects multiple recipients', () => {
  assert.equal(validateEmailTest(input), true);
  for (const to of ['', 'invalid', 'a@example.com,b@example.com', 'a@example.com\nb@example.com']) assert.equal(validateEmailTest({ ...input, to }), false);
});
test('test email validates selected template and draft content', () => {
  for (const patch of [{ template_id: 'bad' }, { subject: '' }, { subject: 'Hi\nBcc: x' }, { html_body: '' }, { html_body: 'x'.repeat(200001) }]) assert.equal(validateEmailTest({ ...input, ...patch }), false);
});
test('test email renders current draft with sample booking and payment data', () => {
  assert.deepEqual(renderEmailTest(input.subject, input.html_body), { subject: 'Booking HL-SAMPLE123', html: '<h1>Priya Sharma</h1><p>₹5,350.60</p>' });
  assert.equal(renderEmailTest('Refund', '{{refund_amount}} {{payment_id}}').html, '₹5,350.60 pay_SAMPLE');
});