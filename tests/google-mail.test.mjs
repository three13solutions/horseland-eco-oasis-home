import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleEmail } from '../supabase/functions/_shared/googleMail.ts';

const input = { from: 'saif@313s.com', name: 'Horseland Hotel', to: 'guest@example.com', subject: 'Booking ₹1 — confirmed', html: '<p>Paid ₹1 ✓</p>', eventId: 'event-123' };
test('Google sender uses the connected mailbox and UTF-8 booking content', () => {
  const message = Buffer.from(createGoogleEmail(input), 'base64url').toString('utf8');
  assert.match(message, /<saif@313s.com>/);
  assert.match(message, /Message-ID: <horseland-event-123@313s.com>/);
  assert.ok(message.includes(Buffer.from(input.subject).toString('base64')));
  assert.equal(Buffer.from(message.split('\r\n\r\n')[1].replace(/\r\n/g, ''), 'base64').toString('utf8'), input.html);
});
test('Google sender rejects injected headers and multiple recipients', () => {
  assert.throws(() => createGoogleEmail({ ...input, subject: 'Hello\r\nBcc: intruder@example.com' }));
  assert.throws(() => createGoogleEmail({ ...input, to: 'one@example.com,two@example.com' }));
});