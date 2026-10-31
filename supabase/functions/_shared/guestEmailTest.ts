import { fillEmail } from './guestEmail.ts';

export const EMAIL_TEST_SAMPLE: Record<string, string> = {
  guest_name: 'Priya Sharma', guest_email: 'priya@example.com', guest_phone: '+91 98765 43210',
  booking_id: 'HL-SAMPLE123', room_type: 'Deluxe', check_in: '10 Dec 2026', check_out: '12 Dec 2026',
  nights: '2', guests: '2', meal_plan: 'ROOM ONLY', gst_amount: '₹573.30', total_amount: '₹5,350.60',
  payment_id: 'pay_SAMPLE', payment_amount: '₹5,350.60', refund_amount: '₹5,350.60', payment_order_id: 'order_SAMPLE',
};

export function validateEmailTest(input: unknown): input is { template_id: string; to: string; subject: string; html_body: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const value = input as Record<string, unknown>;
  return typeof value.template_id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.template_id)
    && typeof value.to === 'string' && value.to.length <= 254 && /^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(value.to)
    && typeof value.subject === 'string' && value.subject.trim().length > 0 && value.subject.length <= 998 && !/[\r\n]/.test(value.subject)
    && typeof value.html_body === 'string' && value.html_body.trim().length > 0 && value.html_body.length <= 200000;
}

export function renderEmailTest(subject: string, html: string) {
  return { subject: fillEmail(subject, EMAIL_TEST_SAMPLE), html: fillEmail(html, EMAIL_TEST_SAMPLE, true) };
}