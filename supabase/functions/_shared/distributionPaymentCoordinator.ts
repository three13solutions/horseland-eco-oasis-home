/**
 * LOCAL CANDIDATE — not connected to any deployed endpoint.
 * The Store contract must be backed by one transactional SQL implementation.
 * These orchestration safeguards are not substitutes for DB unique constraints,
 * common legacy/manual reservation bridges, or provider-backed reconciliation.
 */
export class InventoryPaymentError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.code = code; this.name = 'InventoryPaymentError'; }
}
export type PaymentIntent = {
  requestId: string;
  ownerScope: string; // server-derived authenticated identity or signed checkout capability
  quoteFingerprint: string;
  amountPaise: number;
  currency: 'INR';
  selection: { roomTypeId: string; unitId: string | null; checkIn: string; checkOut: string };
  admission?: {sourceKey:string;contactKey:string;sourceVerified:boolean};
  bookingMetadata?: Readonly<Record<string, unknown>>; // canonical guest and notes, persisted before payment
  quoteSnapshot: Readonly<Record<string, unknown>>; // already server-calculated; never recalculate after payment
};
export type ProviderOrder = { id: string; amount: number; currency: string; receipt: string; status: string; amount_paid: number; notes?: Record<string,unknown> };
export type ProviderPayment = { id: string; order_id: string; amount: number; currency: string; status: string; amount_refunded?: number; refund_status?: string | null };
export type IntentRecord = { holdId: string; requestId: string; ownerScope: string; amountPaise: number; currency: string; receipt: string; quoteFingerprint: string };
export type BeginResult =
  | { state: 'create_owned'; record: IntentRecord; operationToken: string }
  | { state: 'ready'; record: IntentRecord; order: ProviderOrder }
  | { state: 'creating' | 'review_required' | 'confirmed' | 'released'; record: IntentRecord };
export interface InventoryPaymentStore {
  /** Atomic: same request+owner must match immutable quote/selection; hold BEFORE returning ownership.
   * Never grant create ownership twice, including after timeouts. */
  begin(intent: PaymentIntent): Promise<BeginResult>;
  /** Atomic: ownership token match; unique provider order; persist immutable quote, order and hold binding.
   * No payable order may be returned before this commits. */
  bindOrder(record: IntentRecord, operationToken: string, order: ProviderOrder): Promise<void>;
  /** Durable review flag only; MUST NOT release held unit/quota. */
  markUnknown(record: IntentRecord, reason: string): Promise<void>;
  /** Reads only by server-verified owner/capability; quote amount is server stored. */
  findBoundOrder(orderId: string, ownerScope: string): Promise<IntentRecord & { orderId: string }>;
  /** Atomic: unique payment+order, recheck exact bound hold, insert booking/payment and convert
   * held→confirmed once; no second unit allocation, tariff calculation or quota debit. */
  confirmCaptured(record: IntentRecord & { orderId: string }, payment: ProviderPayment): Promise<{ bookingId: string; unitId: string; reused: boolean }>;
}
export interface InventoryPaymentProvider {
  createOrder(input: { amount: number; currency: 'INR'; receipt: string; notes: { inventory_hold: string } }): Promise<ProviderOrder>;
  getOrder(id: string): Promise<ProviderOrder>;
  getPayment(id: string): Promise<ProviderPayment>;
}
export function assertIntent(intent: PaymentIntent): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(intent.requestId)) throw new InventoryPaymentError('INVALID_REQUEST_ID', 'A stable request ID is required.');
  if (!intent.ownerScope || !intent.quoteFingerprint || !Number.isSafeInteger(intent.amountPaise) || intent.amountPaise < 100 || intent.currency !== 'INR') throw new InventoryPaymentError('INVALID_INTENT', 'A server-validated quote and checkout identity are required.');
}
export function receiptFor(requestId: string): string { return `hl_${requestId.replaceAll('-', '')}`; }
function assertOrder(order: ProviderOrder, record: IntentRecord): void {
  if (!order.id || order.amount !== record.amountPaise || order.currency !== record.currency || order.receipt !== record.receipt || !['created', 'attempted', 'paid'].includes(order.status)) {
    throw new InventoryPaymentError('ORDER_MISMATCH', 'Provider order does not match the reserved quote. Reconciliation required.');
  }
}
export async function prepareWebsitePayment(store: InventoryPaymentStore, provider: InventoryPaymentProvider, intent: PaymentIntent): Promise<ProviderOrder> {
  assertIntent(intent);
  const begun = await store.begin(intent);
  if (begun.state === 'ready') {
    const order = await provider.getOrder(begun.order.id);
    assertOrder(order, begun.record);
    if (order.status === 'paid' || order.amount_paid > 0) throw new InventoryPaymentError('PAYMENT_RECONCILIATION_REQUIRED', 'A payment already exists. Do not pay again.');
    return order;
  }
  if (begun.state !== 'create_owned') throw new InventoryPaymentError('PAYMENT_INTENT_PENDING', 'This payment attempt is being prepared or requires reconciliation. No new order was created.');
  const { record, operationToken } = begun;
  try {
    const order = await provider.createOrder({ amount: record.amountPaise, currency: 'INR', receipt: record.receipt, notes: { inventory_hold: record.holdId } });
    assertOrder(order, record);
    if (order.amount_paid !== 0 || order.status === 'paid') throw new InventoryPaymentError('UNEXPECTED_PAID_ORDER', 'An unexpected payment requires reconciliation.');
    await store.bindOrder(record, operationToken, order);
    return order;
  } catch (error) {
    // Network timeout, malformed response, and DB failure all have uncertain provider outcomes.
    // Never infer "no order created", retry POST automatically, or free the physical room.
    try { await store.markUnknown(record, 'provider_order_outcome_unconfirmed'); } catch { /* The durable creating intent still fences retries. */ }
    throw new InventoryPaymentError('ORDER_OUTCOME_UNCONFIRMED', 'Payment preparation was not confirmed. Do not start a new payment attempt; the existing reservation requires reconciliation.');
  }
}

export async function confirmWebsitePayment(
  store: InventoryPaymentStore,
  provider: InventoryPaymentProvider,
  input: { orderId: string; paymentId: string; ownerScope: string; signature: string },
  verifySignature: (orderId: string, paymentId: string, signature: string) => Promise<boolean>,
): Promise<{ bookingId: string; unitId: string; reused: boolean }> {
  if (!input.orderId || !input.paymentId || !input.ownerScope || !input.signature || !await verifySignature(input.orderId, input.paymentId, input.signature)) throw new InventoryPaymentError('INVALID_PAYMENT_SIGNATURE', 'Payment verification failed.');
  const bound = await store.findBoundOrder(input.orderId, input.ownerScope);
  const payment = await provider.getPayment(input.paymentId);
  if (payment.id !== input.paymentId || payment.order_id !== bound.orderId || payment.currency !== bound.currency || payment.amount !== bound.amountPaise || payment.status !== 'captured' || Number(payment.amount_refunded ?? 0) !== 0 || Boolean(payment.refund_status)) {
    throw new InventoryPaymentError('PAYMENT_RECONCILIATION_REQUIRED', 'The captured payment could not be matched. Do not pay again.');
  }
  return store.confirmCaptured(bound, payment);
}

/** A clock timeout, quote expiry, failed payment, or empty payment list is never evidence
 * that an existing provider order cannot accept another payment. No timed release here. */
export function releaseDecision(input: {
  providerCreateEverStarted: boolean;
  paymentCaptured: boolean;
  bookingCancellationAuthorized: boolean;
}): 'safe_pre_provider_release' | 'confirmed_booking_cancellation' | 'retain_for_reconciliation' {
  if (input.paymentCaptured) return input.bookingCancellationAuthorized ? 'confirmed_booking_cancellation' : 'retain_for_reconciliation';
  if (!input.providerCreateEverStarted) return 'safe_pre_provider_release';
  return 'retain_for_reconciliation';
}
