// Payment/order references are not payment credentials. Never store a signature,
// guest identity document, contact information or raw payment response here.
export const PAYMENT_RESOLUTION_KEY = 'horseland.websiteBookingPaymentResolution';

export interface BookingPaymentResolution {
  paymentId: string;
  orderId: string;
  code: string;
  outcome: 'not_confirmed' | 'unknown';
  recordedAt: string;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function loadPaymentResolution(storage?: StorageLike): BookingPaymentResolution | null {
  try {
    const raw = (storage ?? window.localStorage).getItem(PAYMENT_RESOLUTION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (typeof value.paymentId !== 'string' || !value.paymentId ||
        typeof value.orderId !== 'string' || !value.orderId ||
        typeof value.recordedAt !== 'string' || typeof value.code !== 'string' ||
        !['not_confirmed', 'unknown'].includes(value.outcome)) return null;
    // Pick fields explicitly, rather than retaining unexpected data from storage.
    return { paymentId: value.paymentId, orderId: value.orderId, code: value.code,
      outcome: value.outcome, recordedAt: value.recordedAt };
  } catch {
    return null;
  }
}

export function savePaymentResolution(value: BookingPaymentResolution, storage?: StorageLike): boolean {
  try {
    const { paymentId, orderId, code, outcome, recordedAt } = value;
    (storage ?? window.localStorage).setItem(PAYMENT_RESOLUTION_KEY,
      JSON.stringify({ paymentId, orderId, code, outcome, recordedAt }));
    return true;
  } catch {
    return false;
  }
}

export function clearPaymentResolution(storage?: StorageLike): boolean {
  try {
    (storage ?? window.localStorage).removeItem(PAYMENT_RESOLUTION_KEY);
    return true;
  } catch {
    return false;
  }
}

// Supabase returns non-2xx bodies on FunctionsHttpError.context, not in data.
export async function getFinalizationFailure(data: unknown, error: unknown): Promise<Pick<BookingPaymentResolution, 'code' | 'outcome'>> {
  let body = data as Record<string, unknown> | null;
  if (error && typeof error === 'object' && 'context' in error) {
    const context = error.context;
    if (context instanceof Response) {
      try { body = await context.clone().json(); } catch { /* keep unknown outcome */ }
    }
  }
  if (body?.success === false && body?.resolution_required === true) {
    return {
      code: typeof body.code === 'string' ? body.code : 'FINALIZATION_REQUIRES_REVIEW',
      outcome: body.booking_status === 'not_confirmed' ? 'not_confirmed' : 'unknown',
    };
  }
  return { code: 'FINALIZATION_OUTCOME_UNKNOWN', outcome: 'unknown' };
}
