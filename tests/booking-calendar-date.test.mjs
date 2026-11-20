import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseBookingDay, countBookingNights } from '../src/lib/booking-calendar-date.ts';

const moduleUrl = new URL('../src/lib/booking-calendar-date.ts', import.meta.url).href;
function timezoneProbe(tz, program) {
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { parseBookingDay, parseSavedBookingDay, formatBookingDay, countBookingNights } from ${JSON.stringify(moduleUrl)};
    ${program}
  `], { env: { ...process.env, TZ: tz }, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr ?? String(r.error));
}

test('selected dates round-trip from room search through URL/picker to a quote under IST', () => {
  timezoneProbe('Asia/Kolkata', `
    for (const [day, key] of [[23,'2026-12-23'], [24,'2026-12-24'], [25,'2026-12-25'], [26,'2026-12-26']]) {
      const selected = new Date(2026, 11, day);
      assert.notEqual(selected.toISOString().slice(0,10), key, 'reproduce old UTC rollover');
      const params = new URLSearchParams({checkIn:formatBookingDay(selected)});
      const parsed = parseBookingDay(params.get('checkIn'));
      assert.equal(parsed.getDate(), day);
      assert.equal(parsed.getHours(), 0);
      assert.equal(formatBookingDay(parsed), key);
      assert.equal(formatBookingDay(parseSavedBookingDay(selected.toJSON())), key);
    }
    assert.equal(parseBookingDay('2026-12-25').getDay(), 5);
    assert.equal(parseBookingDay('2026-12-26').getDay(), 6);
    assert.equal(countBookingNights('2026-12-23','2026-12-25'),2);
  `);
});

test('negative-offset picker hydration and DST night counts are calendar-based', () => {
  timezoneProbe('America/New_York', `
    assert.equal(new Date('2026-12-24').getDate(), 23, 'reproduce old URL hydration rollover');
    assert.equal(parseBookingDay('2026-12-24').getDate(), 24);
    assert.equal(formatBookingDay(parseBookingDay('2026-12-24')), '2026-12-24');
    assert.equal(countBookingNights('2026-03-07','2026-03-09'), 2);
    const start = parseBookingDay('2026-10-31');
    const end = parseBookingDay('2026-11-02');
    assert.equal((end-start)/3600000, 49, 'includes fall-back day');
    assert.equal(countBookingNights(start,end), 2);
  `);
});

test('malformed and impossible URL days never become normalized into a different date', () => {
  for (const value of [null, undefined, 0, 'tomorrow', '2026-12-24T00:00:00Z', '2026-12-24 ', '2026-2-03', '2026-02-29', '2026-12-32', '2026-13-01']) {
    assert.equal(parseBookingDay(value), undefined, String(value));
  }
  assert.ok(parseBookingDay('2028-02-29'));
  assert.equal(countBookingNights('2026-12-25','2026-12-24'), 0);
  assert.equal(countBookingNights('bad','2026-12-24'), 0);
});

test('public availability, rate cards and booking handoffs use the date-only contract', () => {
  const load = (file) => readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');
  for (const f of ['pages/SearchAvailability.tsx','pages/RoomDetail.tsx','components/stay/CategoryCard.tsx','components/stay/CategoryBookingModal.tsx']) {
    const s = load(f);
    assert.doesNotMatch(s, /toISOString\(\)\.(split|slice)/, f);
    assert.match(s,/checkIn:\s*formatBookingDay\(/, f);
    assert.match(s,/checkOut:\s*formatBookingDay\(/, f);
  }
  for (const f of ['pages/SearchAvailability.tsx','pages/Booking.tsx','components/booking/AvailableRoomCard.tsx','pages/BookingConfirmation.tsx']) {
    const s=load(f);
    assert.match(s,/parseBookingDay\(/,f);
    assert.doesNotMatch(s,/new Date\([^\n]*(checkIn|checkOut|check_in|check_out)/,f);
  }
  assert.match(load('pages/Booking.tsx'),/parseSavedBookingDay\(booking\.checkIn\)/);
  assert.match(load('pages/Booking.tsx'),/checkIn: checkIn \|\| \(searchCheckIn \? formatBookingDay\(searchCheckIn\)/);
});
