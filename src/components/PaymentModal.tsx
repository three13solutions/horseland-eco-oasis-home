import React, { useEffect, useRef, useState } from 'react';
import { distributionCheckoutEnabled } from '@/lib/websiteInventory';
import { checkoutSelectionKey, checkoutErrorBody, discardSafelyRejectedWebsiteCheckout, getOrCreateWebsiteCheckout, readWebsiteCheckout, updateWebsiteCheckout, withWebsiteCheckoutLock, type WebsiteCheckoutContext } from '@/lib/websiteCheckoutAttempt';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { CreditCard, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  RAZORPAY_CONFIG, 
  calculateBookingAmount, 
  formatCurrency, 
  toPaise,
  type PaymentData,
  type BookingPaymentDetails 
} from '@/lib/razorpay';

type RetainedCheckout = {
  request_id: string;
  state: 'payable' | 'paid' | 'confirmed' | 'pending';
  order: { id: string; amount: number; currency: string } | null;
  quote_request: { room_type_id?: string; check_in: string; check_out: string; adults_count: number; children_count: number; infants_count: number; meal_plan_code: string };
  room_type_name?: string;
  key_id?: string;
  guest: { first_name: string; last_name: string; email: string; phone: string };
  booking_id?: string;
};

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentId: string, orderId: string, signature: string, checkout?: WebsiteCheckoutContext) => void | Promise<void>;

  bookingDetails: {
    roomName: string;
    roomPrice: number; // per-night rate; multiplied by nights
    nights: number;
    exactStayTotal?: number; // authoritative variant total, never reconstructed from rounded nightly display
    addonTotal?: number;
    quoteRequest?: Record<string, unknown>;
    quoteFingerprint?: string;
    existingBookingId?: string;
    gstRate?: number; // optional GST rate override (e.g. from DB tiers)
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    guestGender?: string;
    guestIdType?: string;
    guestIdNumber?: string;
    bookingNotes?: string;
    checkIn: string;
    checkOut: string;
  };
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  bookingDetails,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [razorpayOpen, setRazorpayOpen] = useState(false);
  const processingRef = useRef(false);
  const isOpenRef = useRef(isOpen);
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [checkoutReference, setCheckoutReference] = useState<string | null>(null);
  const [retained, setRetained] = useState<RetainedCheckout | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewRequired, setReviewRequired] = useState(false);
  const [reviewAccepted, setReviewAccepted] = useState(false);
  const { toast } = useToast();

  const loadRetainedCheckout = async (requestId: string, checkoutToken: string): Promise<RetainedCheckout> => {
    const { data, error } = await supabase.functions.invoke('create-razorpay-order-v3', {
      body: { action: 'resume', request_id: requestId, checkout_token: checkoutToken },
    });
    if (error || data?.request_id !== requestId || !['payable', 'paid', 'confirmed', 'pending'].includes(data.state) ||
        !data.quote_request || !data.guest ||
        (data.state === 'payable' && (!data.order?.id || !Number.isSafeInteger(data.order.amount) || data.order.amount <= 0 || data.order.currency !== 'INR'))) {
      throw new Error('Your saved checkout could not be verified. Its room hold remains. Contact the hotel with your checkout reference; do not start another payment.');
    }
    return data as RetainedCheckout;
  };

  useEffect(() => {
    if (!isOpen || bookingDetails.existingBookingId) return;
    let active = true;
    setReviewAccepted(false);
    try {
      const saved = readWebsiteCheckout();
      if (!saved || saved.state === 'session') return;
      setReviewRequired(true);
      if (saved.state === 'paid') setConfirmationPending(true);
      setCheckoutReference(saved.requestId);
      setReviewLoading(true);
      loadRetainedCheckout(saved.requestId, saved.checkoutToken!).then(data => {
        if (active) { setRetained(data); setPaymentMessage(null); }
      }).catch(error => { if (active) setPaymentMessage(error.message); })
        .finally(() => { if (active) setReviewLoading(false); });
    } catch (error) {
      setReviewRequired(true);
      setPaymentMessage(error instanceof Error ? error.message : 'Saved checkout cannot be read safely. Contact the hotel.');
    }
    return () => { active = false; };
  }, [isOpen, bookingDetails.existingBookingId]);

  const gstRate = bookingDetails.gstRate ?? RAZORPAY_CONFIG.GST_RATE;
  const paymentBreakdown: BookingPaymentDetails = calculateBookingAmount(
    bookingDetails.roomPrice,
    bookingDetails.nights,
    bookingDetails.addonTotal || 0,
    gstRate,
    bookingDetails.exactStayTotal
  );

  const [promoInput, setPromoInput] = useState('');
  const [promoApplied, setPromoApplied] = useState<string | null>(null);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  // TEMPORARY: live test promo. Server validates the code and sets the order to ₹1.
  const payableAmount = promoApplied ? 1 : paymentBreakdown.totalAmount;
  const applyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    const { data } = await supabase.functions.invoke('create-razorpay-order-v3', { body: { action: 'promo', promo_code: code } });
    if (data?.valid) { setPromoApplied(code); setPromoMessage('Promo applied. Total is now ₹1.'); }
    else setPromoMessage('This promo code is not valid.');
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (processingRef.current || confirmationPending) return;
    processingRef.current = true;
    setIsProcessing(true);
    setPaymentMessage(null);

    try {
      // Load the gateway before reserving inventory. A failed SDK load must not
      // create another payable order or unnecessarily start a new hold.
      const { loadRazorpayConfig } = await import('@/lib/razorpay');
      const config = await loadRazorpayConfig();
      if (!await loadRazorpayScript()) throw new Error('The payment gateway could not load. No new checkout was started; an existing checkout, if any, remains unchanged.');
      if (!isOpenRef.current) { processingRef.current = false; setIsProcessing(false); return; }
      let checkout: WebsiteCheckoutContext | undefined;
      let gatewayGuest = { name: bookingDetails.guestName, email: bookingDetails.guestEmail, contact: bookingDetails.guestPhone };
      let gatewayDescription = `${bookingDetails.roomName} - ${bookingDetails.nights} night(s)`;
      const orderData = await withWebsiteCheckoutLock(async () => {
        if (!isOpenRef.current) return null;
        // Staff collection for an already saved booking retains its bound
        // server path. A new website attempt may never fall back after v3 starts.
        const saved = bookingDetails.existingBookingId ? null : readWebsiteCheckout();
        const useInventory = !bookingDetails.existingBookingId && (saved?.state !== undefined || await distributionCheckoutEnabled());
        if (!isOpenRef.current) return null;
        if (useInventory) {
          if (saved && saved.state !== 'session') {
            if (!reviewAccepted || !retained || retained.request_id !== saved.requestId) {
              setReviewRequired(true);
              setRetained(await loadRetainedCheckout(saved.requestId, saved.checkoutToken!));
              throw new Error('Review and confirm the retained checkout below before resuming. It may differ from your current search.');
            }
            // Recheck provider state immediately before showing payment. Never
            // reprice or submit today's selection for an existing payable order.
            const current = await loadRetainedCheckout(saved.requestId, saved.checkoutToken!);
            setRetained(current);
            if (saved.state === 'paid' || current.state !== 'payable') throw new Error('This checkout is not available for another payment. Contact the hotel to confirm its payment and booking status.');
            if (!current.order || current.order.id !== retained.order?.id || current.order.amount !== retained.order.amount ||
                JSON.stringify(current.quote_request) !== JSON.stringify(retained.quote_request)) {
              setReviewAccepted(false);
              throw new Error('The saved checkout details changed. Review them again before continuing.');
            }
            checkout = { requestId: saved.requestId, checkoutToken: saved.checkoutToken! };
            updateWebsiteCheckout(saved.requestId, { state: 'ready', orderId: current.order.id });
            gatewayGuest = { name: `${current.guest.first_name} ${current.guest.last_name}`.trim(), email: current.guest.email, contact: current.guest.phone };
            gatewayDescription = `Saved checkout: ${current.quote_request.check_in} to ${current.quote_request.check_out} · ${current.quote_request.meal_plan_code}`;
            return { ...current.order, key_id: current.key_id };
          }
          const nameParts = bookingDetails.guestName.trim().split(/\s+/);
          const guest = { first_name: nameParts[0], last_name: nameParts.slice(1).join(' '),
            email: bookingDetails.guestEmail, phone: bookingDetails.guestPhone,
            gender: bookingDetails.guestGender || null, id_type: bookingDetails.guestIdType || null,
            id_number: bookingDetails.guestIdNumber || null };
          const request = { amount: payableAmount, currency: 'INR', promo_code: promoApplied || undefined,
            quote_request: bookingDetails.quoteRequest, quote_fingerprint: bookingDetails.quoteFingerprint,
            guest, booking_notes: bookingDetails.bookingNotes || null };
          const selectionKey = await checkoutSelectionKey(request);
          let attempt = getOrCreateWebsiteCheckout(selectionKey);
          setCheckoutReference(attempt.requestId);
          if (!attempt.checkoutToken) {
            const { data, error } = await supabase.functions.invoke('create-razorpay-order-v3', {
              body: { action: 'session', request_id: attempt.requestId },
            });
            if (error || typeof data?.checkout_token !== 'string' || data.request_id !== attempt.requestId) throw new Error('The checkout session could not be established. Retry only this same checkout or contact the hotel.');
            // Persist capability BEFORE the request that can create a payable order.
            attempt = updateWebsiteCheckout(attempt.requestId, { checkoutToken: data.checkout_token });
          }
          checkout = { requestId: attempt.requestId, checkoutToken: attempt.checkoutToken! };
          if (!isOpenRef.current) return null;
          updateWebsiteCheckout(attempt.requestId, { state: 'preparing' });
          const { data, error } = await supabase.functions.invoke('create-razorpay-order-v3', {
            body: { action: 'prepare', request_id: attempt.requestId, checkout_token: attempt.checkoutToken, ...request },
          });
          if (error || !data?.id || !Number.isSafeInteger(data.amount) || data.currency !== 'INR') {
            const evidence = await checkoutErrorBody(data, error);
            if (discardSafelyRejectedWebsiteCheckout(attempt.requestId, evidence)) {
              setCheckoutReference(null);
              throw new Error('This selection or quote is no longer available. The server confirmed that this request created no payment or room hold. Review availability and your price before continuing.');
            }
            // A lost response can follow provider order creation. Keep both the
            // request and capability; the server will not issue another order.
            throw new Error('Payment preparation is not confirmed. Your checkout reference and any room hold are retained. Resume only this same checkout, or contact the hotel; do not start another payment.');
          }
          updateWebsiteCheckout(attempt.requestId, { state: 'ready', orderId: data.id });
          return data;
        }
        const { data, error } = await supabase.functions.invoke('create-razorpay-order-v2', {
          body: { amount: paymentBreakdown.totalAmount, currency: 'INR',
            quote_request: bookingDetails.quoteRequest, quote_fingerprint: bookingDetails.quoteFingerprint,
            existing_booking_id: bookingDetails.existingBookingId,
            notes: { booking_guest: bookingDetails.guestName, booking_room: bookingDetails.roomName, booking_nights: bookingDetails.nights.toString() } },
        });
        if (error || !data?.id) throw new Error('Payment preparation could not be confirmed. Refresh availability or contact the hotel before attempting another payment.');
        return data;
      });

      // Closing our dialog while preparation is in flight must not open a
      // gateway later. Any already-created order/hold remains safely resumable.
      if (!orderData || !isOpenRef.current) { processingRef.current = false; setIsProcessing(false); return; }

      // Step 3: Open Razorpay checkout with server-generated order
      const options = {
        key: orderData.key_id || config.KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Hotel Booking',
        description: gatewayDescription,
        order_id: orderData.id,
        handler: async function (response: any) {
          setRazorpayOpen(false);
          setConfirmationPending(true);
          if (checkout) {
            try { updateWebsiteCheckout(checkout.requestId, { state: 'paid' }); } catch { /* Still finalize the captured callback with the in-memory capability. */ }
          }
          try {
            // Public checkout persists its paid-but-unconfirmed marker immediately
            // in onSuccess, then finalize-booking verifies signature and capture.
            // Staff collection uses the bound existing-booking verifier instead.
            if (bookingDetails.existingBookingId) {
            // Step 4: Verify payment through secure edge function
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment-v2', {
              body: {
                razorpay_order_id: orderData.id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                booking_id: bookingDetails.existingBookingId,
              }
            });

            if (verifyError || !verifyData?.success) {
              toast({
                title: "Payment Verification Failed",
                description: "Your payment could not be verified. Please contact support.",
                variant: "destructive",
              });
              throw new Error('Payment verification failed');
            }

            }

            // Payment verified successfully - hand over to the success handler
            // (which persists the booking) BEFORE closing the modal.
            await onSuccess(
              response.razorpay_payment_id,
              orderData.id,
              response.razorpay_signature,
              checkout
            );
            processingRef.current = false;
            onClose();
          } catch (verificationError) {
            console.error('Payment verification error:', verificationError);
            toast({
              title: "Payment Processing Error",
              description: "Payment confirmation could not be completed. Do not pay again; contact the hotel with your existing payment reference.",
              variant: "destructive",
            });
            processingRef.current = false;
            setIsProcessing(false);
          }
        },
        prefill: gatewayGuest,
        theme: {
          color: '#6366f1',
        },
        modal: {
          ondismiss: () => {
            setRazorpayOpen(false);
            processingRef.current = false;
            setIsProcessing(false);
            setPaymentMessage(checkout ? "Payment window closed. Your saved checkout and room hold remain; resume the same checkout or contact the hotel for reconciliation." : "Payment window closed. Check your existing payment status before trying again.");
            toast({
              title: "Payment window closed",
              description: checkout ? "The room hold has not been released. Use the same checkout to resume." : "Please check the existing payment status before continuing.",
            });
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', function (response: any) {
        console.error('Razorpay payment failed:', response?.error);
        // Razorpay can keep its checkout open for another attempt on this same
        // order. Do not remount our modal over the gateway or create a new order.
        // Only its dismiss/success callbacks end this interaction.
        setPaymentMessage("This payment attempt was not completed. Any existing room hold remains. Resume the same checkout or contact the hotel; do not create a different payment.");
        toast({
          title: "Payment attempt not completed",
          description: "Any room hold is retained. Resume only the same checkout or contact the hotel.",
          variant: "destructive",
        });
      });
      // Hide our dialog before opening Razorpay so its iframe/overlay
      // becomes the top interactive layer (no overlay/focus-trap conflicts).
      setRazorpayOpen(true);
      razorpay.open();

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment preparation could not be confirmed. Contact the hotel before paying again.';
      setPaymentMessage(message);
      toast({ title: 'Checkout needs attention', description: message, variant: 'destructive' });
      processingRef.current = false;
      setIsProcessing(false);
    }
  };

  // While Razorpay checkout is open, don't render our dialog at all —
  // Radix's overlay, focus trap and body pointer-events lock would otherwise
  // sit above the Razorpay iframe and make it unclickable.
  if (razorpayOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) { isOpenRef.current = false; onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {reviewRequired ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3">
              <h3 className="font-semibold">Review your saved checkout</h3>
              <p className="text-sm">These are the original held dates, guests and price—not your current search. Resuming uses the same payment order.</p>
              {reviewLoading && <p role="status">Checking your saved checkout…</p>}
              {retained && <>
                <p className="font-medium">{retained.room_type_name || `Room type ${retained.quote_request.room_type_id || 'held for this checkout'}`}</p>
                <p>{retained.quote_request.check_in} to {retained.quote_request.check_out}</p>
                <p className="text-sm">{retained.quote_request.adults_count} adults · {retained.quote_request.children_count} children · {retained.quote_request.infants_count} infants</p>
                <p className="text-sm">Meal plan: {retained.quote_request.meal_plan_code}</p>
                <p className="text-sm">Guest: {retained.guest.first_name} {retained.guest.last_name}</p>
                {retained.order && <p className="font-semibold">Original total (including taxes): {formatCurrency(retained.order.amount / 100)}</p>}
                {retained.state === 'payable' ? <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={reviewAccepted} onChange={event => setReviewAccepted(event.target.checked)} />
                  <span>I confirm these saved details and want to resume this checkout.</span>
                </label> : <p role="status" className="font-medium">{retained.state === 'confirmed' ? 'This booking is already confirmed.' : 'Payment or booking confirmation needs review. Do not pay again.'}</p>}
                {retained.state === 'confirmed' && retained.booking_id && <a className="underline" href={`/booking/confirmation?booking_id=${encodeURIComponent(retained.booking_id)}`}>View booking confirmation</a>}
              </>}
            </div>
          ) : <>
          {/* Booking Summary */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h3 className="font-medium text-sm text-muted-foreground">Booking Summary</h3>
            <p className="font-semibold">{bookingDetails.roomName}</p>
            <p className="text-sm text-muted-foreground">
              {bookingDetails.checkIn} to {bookingDetails.checkOut} ({bookingDetails.nights} night{bookingDetails.nights > 1 ? 's' : ''})
            </p>
          </div>

          {/* Payment Breakdown */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Room charges ({bookingDetails.nights} night{bookingDetails.nights > 1 ? 's' : ''})</span>
              <span>{formatCurrency(paymentBreakdown.baseAmount)}</span>
            </div>

            {paymentBreakdown.addonAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Add-on services</span>
                <span>{formatCurrency(paymentBreakdown.addonAmount)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(paymentBreakdown.subtotal)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>GST ({Math.round(gstRate * 100)}%)</span>
              <span>{formatCurrency(paymentBreakdown.gstAmount)}</span>
            </div>

            <Separator />

            <div className="flex justify-between font-semibold">
              <span>Total Amount</span>
              <span>{formatCurrency(payableAmount)}</span>
            </div>
            {!reviewRequired && <div className="space-y-1 pt-2">
              <div className="flex gap-2">
                <input aria-label="Promo code" value={promoInput} onChange={e => setPromoInput(e.target.value)} disabled={!!promoApplied || isProcessing}
                  placeholder="Promo code" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm uppercase" />
                {promoApplied
                  ? <Button type="button" variant="outline" size="sm" onClick={() => { setPromoApplied(null); setPromoInput(''); setPromoMessage(null); }} disabled={isProcessing}>Remove</Button>
                  : <Button type="button" variant="outline" size="sm" onClick={applyPromo} disabled={!promoInput.trim() || isProcessing}>Apply</Button>}
              </div>
              {promoMessage && <p className="text-xs text-muted-foreground">{promoMessage}</p>}
            </div>}
          </div>

          </>}
          {paymentMessage && <p role="status" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{paymentMessage}</p>}
          {checkoutReference && <p className="break-all text-xs text-muted-foreground">Checkout reference: {checkoutReference}</p>}
          {/* Payment Button */}
          <Button 
            onClick={handlePayment} 
            disabled={isProcessing || confirmationPending || reviewLoading || (reviewRequired && (!reviewAccepted || retained?.state !== 'payable'))}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                {reviewRequired ? 'Resume saved checkout' : checkoutReference ? 'Review saved checkout' : `Pay ${formatCurrency(payableAmount)}`}
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Secure payment powered by Razorpay
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
