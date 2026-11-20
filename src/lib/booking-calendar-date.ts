import { differenceInCalendarDays, format, parseISO } from 'date-fns';

const calendarDayPattern = /^\d{4}-\d{2}-\d{2}$/;
const serializedDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// A selected booking date is a calendar day, not a moment in UTC.
export function formatBookingDay(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function parseBookingDay(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !calendarDayPattern.test(value)) return undefined;
  const date = parseISO(value);
  return Number.isFinite(date.getTime()) && formatBookingDay(date) === value ? date : undefined;
}

// Older local drafts sometimes saved a Date through JSON. Decode that instant
// in the same way the picker displayed it locally, then save a date-only string.
export function parseSavedBookingDay(value: unknown): Date | undefined {
  if (typeof value === 'string' && serializedDatePattern.test(value)) {
    const date = parseISO(value);
    return Number.isFinite(date.getTime()) ? date : undefined;
  }
  return parseBookingDay(value);
}

export function countBookingNights(checkIn: Date | string | undefined, checkOut: Date | string | undefined): number {
  const start = typeof checkIn === 'string' ? parseBookingDay(checkIn) : checkIn;
  const end = typeof checkOut === 'string' ? parseBookingDay(checkOut) : checkOut;
  if (!start || !end || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return 0;
  return Math.max(0, differenceInCalendarDays(end, start));
}
