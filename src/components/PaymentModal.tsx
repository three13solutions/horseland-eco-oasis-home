import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { CreditCard, Loader2 } from 'lucide-react';
import { 
  RAZORPAY_CONFIG, 
  calculateBookingAmount, 
  formatCurrency, 
  toPaise,
  type PaymentData,
  type BookingPaymentDetails 
} from '@/lib/razorpay';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentId: string, orderId: string) => void;
  bookingDetails: {
    roomName: string;
    roomPrice: number;
    nights: number;
    addonTotal?: number;
    guestName: string;
    guestEmail: string;
    guestPhone: string;
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

  const paymentBreakdown: BookingPaymentDetails = calculateBookingAmount(
    bookingDetails.roomPrice,
    bookingDetails.nights,
    bookingDetails.addonTotal || 0
  );

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
    setIsProcessing(true);

    try {
      // Load Razorpay configuration
      const { loadRazorpayConfig } = await import('@/lib/razorpay');
      const config = await loadRazorpayConfig();
      
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay SDK');
      }

      // Generate order ID (in production, this should come from backend)
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const options = {
        key: config.KEY_ID,
        amount: toPaise(paymentBreakdown.totalAmount),
        currency: config.CURRENCY,
        name: 'Hotel Booking',
        description: `${bookingDetails.roomName} - ${bookingDetails.nights} night(s)`,
        order_id: orderId,
        handler: function (response: any) {
          onSuccess(response.razorpay_payment_id, orderId);
          onClose();
        },
        prefill: {
          name: bookingDetails.guestName,
          email: bookingDetails.guestEmail,
          contact: bookingDetails.guestPhone,
        },
        theme: {
          color: '#6366f1',
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment error:', error);
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
              <span>GST (18%)</span>
              <span>{formatCurrency(paymentBreakdown.gstAmount)}</span>
            </div>

            <Separator />

            <div className="flex justify-between font-semibold">
              <span>Total Amount</span>
              <span>{formatCurrency(paymentBreakdown.totalAmount)}</span>
            </div>
          </div>

          {/* Payment Button */}
          <Button 
            onClick={handlePayment} 
            disabled={isProcessing}
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
                Pay {formatCurrency(paymentBreakdown.totalAmount)}
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