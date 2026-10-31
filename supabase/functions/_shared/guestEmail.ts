export const EMAIL_TRIGGERS = [
  ['booking_confirmed', 'Booking confirmed'], ['booking_cancelled', 'Booking cancelled'],
  ['payment_completed', 'Payment completed'], ['payment_failed', 'Payment failed'],
  ['payment_pending', 'Payment pending'], ['payment_refunded', 'Payment refunded'],
  ['before_check_in', 'Before check-in date'], ['before_check_out', 'Before check-out date'],
  ['after_check_out', 'After check-out date'],
] as const;

export const EMAIL_PLACEHOLDERS = ['guest_name', 'guest_email', 'guest_phone', 'booking_id', 'room_type', 'check_in', 'check_out', 'nights', 'guests', 'meal_plan', 'gst_amount', 'total_amount', 'payment_amount', 'refund_amount', 'payment_id', 'payment_order_id'];

export function fillEmail(template: string, values: Record<string, string>, html = false) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const value = values[key] ?? '';
    return html ? value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c)) : value;
  });
}

export function maySendEmail(event: any, template: any, booking: any, settings: any) {
  if (!template?.is_active || !template.trigger_enabled || template.trigger_event !== event.event_type) return false;
  if (event.template_key === 'booking_confirmation' && settings?.send_booking_confirmation === false) return false;
  if (event.event_type === 'booking_confirmed' && !['confirmed', 'paid', 'completed'].includes(booking.payment_status)) return false;
  if (event.event_type === 'booking_cancelled' && booking.payment_status !== 'cancelled') return false;
  if (['before_check_in', 'before_check_out', 'after_check_out'].includes(event.event_type)) {
    if (!['confirmed', 'paid', 'completed'].includes(booking.payment_status)) return false;
    if (event.event_key !== `reminder:${booking.id}:${event.template_key}:${booking.check_in}:${booking.check_out}`) return false;
  }
  return true;
}