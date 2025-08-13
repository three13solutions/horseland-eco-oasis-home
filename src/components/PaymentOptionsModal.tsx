import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { CreditCard, Banknote, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PaymentModal } from './PaymentModal';

interface PaymentOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentComplete: () => void;
  booking: {
    id: string;
    booking_id: string;
    guest_name: string;
    guest_email?: string;
    guest_phone?: string;
    total_amount: number;
    check_in: string;
    check_out: string;
    room_units?: { unit_name?: string; unit_number: string };
    room_types?: { name: string };
  };
}

export const PaymentOptionsModal: React.FC<PaymentOptionsModalProps> = ({
  isOpen,
  onClose,
  onPaymentComplete,
  booking,
}) => {
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [processingCash, setProcessingCash] = useState(false);
  const { toast } = useToast();

  const handleCashPayment = async () => {
    setProcessingCash(true);
    
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          payment_status: 'confirmed',
          payment_method: 'cash',
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      if (error) throw error;

      toast({
        title: "Cash Payment Recorded",
        description: `Payment of ₹${booking.total_amount.toLocaleString()} recorded for booking ${booking.booking_id}`,
      });

      onPaymentComplete();
      onClose();
    } catch (error) {
      console.error('Error recording cash payment:', error);
      toast({
        title: "Error",
        description: "Failed to record cash payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingCash(false);
    }
  };

  const handleRazorpayPayment = () => {
    setShowRazorpayModal(true);
  };

  const handleRazorpaySuccess = async (paymentId: string, orderId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          payment_status: 'confirmed',
          payment_method: 'razorpay',
          payment_id: paymentId,
          payment_order_id: orderId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      if (error) throw error;

      toast({
        title: "Online Payment Successful",
        description: `Payment completed for booking ${booking.booking_id}`,
      });

      setShowRazorpayModal(false);
      onPaymentComplete();
      onClose();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: "Payment Update Failed",
        description: "Payment was successful but failed to update booking status",
        variant: "destructive",
      });
    }
  };

  const calculateNights = () => {
    const checkIn = new Date(booking.check_in);
    const checkOut = new Date(booking.check_out);
    return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Choose Payment Method
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Booking Summary */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h3 className="font-medium text-sm text-muted-foreground">Booking Details</h3>
              <p className="font-semibold">{booking.guest_name}</p>
              <p className="text-sm">Booking ID: {booking.booking_id}</p>
              <p className="text-lg font-bold text-primary">
                Amount: ₹{booking.total_amount.toLocaleString()}
              </p>
            </div>

            {/* Payment Options */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleCashPayment}
                disabled={processingCash}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 border-border hover:bg-accent hover:text-accent-foreground"
              >
                {processingCash ? (
                  <div className="animate-spin h-6 w-6 border-2 border-muted-foreground border-t-primary rounded-full" />
                ) : (
                  <Banknote className="h-6 w-6 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">Cash Payment</span>
                <span className="text-xs text-muted-foreground">Collect at front desk</span>
              </Button>

              <Button
                onClick={handleRazorpayPayment}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 border-border hover:bg-accent hover:text-accent-foreground"
              >
                <CreditCard className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm font-medium">Online Payment</span>
                <span className="text-xs text-muted-foreground">Via Razorpay</span>
              </Button>
            </div>

            <div className="text-center">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Razorpay Payment Modal */}
      {showRazorpayModal && (
        <PaymentModal
          isOpen={showRazorpayModal}
          onClose={() => setShowRazorpayModal(false)}
          onSuccess={handleRazorpaySuccess}
          bookingDetails={{
            roomName: booking.room_units?.unit_name || 
                     booking.room_types?.name || 
                     'Room',
            roomPrice: booking.total_amount / calculateNights() || 0,
            nights: calculateNights(),
            addonTotal: 0, // This should be calculated based on the booking
            guestName: booking.guest_name,
            guestEmail: booking.guest_email || '',
            guestPhone: booking.guest_phone || '',
            checkIn: new Date(booking.check_in).toLocaleDateString(),
            checkOut: new Date(booking.check_out).toLocaleDateString(),
          }}
        />
      )}
    </>
  );
};