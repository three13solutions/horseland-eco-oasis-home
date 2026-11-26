import { InventoryPaymentError, type IntentRecord, type ProviderOrder, type ProviderPayment } from './distributionPaymentCoordinator.ts';

// A provider read is not order cancellation. The atomic database fence retains
// the order permanently and blocks fulfillment if a later payment arrives.
export async function verifyUnpaidCheckout(
  record: IntentRecord & { orderId: string },
  provider: { getOrder(id: string): Promise<ProviderOrder>; listOrderPayments(id: string): Promise<{ items: ProviderPayment[] }> },
): Promise<{ order: ProviderOrder; payments: ProviderPayment[] }> {
  const order = await provider.getOrder(record.orderId);
  if (order.id !== record.orderId || order.amount !== record.amountPaise || order.currency !== record.currency || order.receipt !== record.receipt) {
    throw new InventoryPaymentError('CHECKOUT_CLEAR_BLOCKED', 'This payment order could not be matched to your checkout. Contact the hotel.');
  }
  const payments = await provider.listOrderPayments(record.orderId);
  if (!['created', 'attempted'].includes(order.status) || order.amount_paid !== 0 || !Array.isArray(payments.items) || payments.items.length >= 100 || payments.items.some(payment => payment.order_id !== record.orderId || payment.status !== 'failed')) {
    throw new InventoryPaymentError('CHECKOUT_CLEAR_BLOCKED', 'A payment is successful, processing, or needs review. Your checkout has not been cleared. Contact the hotel before paying again.');
  }
  return { order, payments: payments.items };
}