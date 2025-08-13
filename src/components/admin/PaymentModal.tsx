import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Banknote, Calculator, Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  booking: any;
}

interface Invoice {
  id: string;
  invoice_number: string;
  subtotal_amount: number;
  gst_amount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  status: string;
}

export function PaymentModal({ isOpen, onClose, onSuccess, booking }: PaymentModalProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && booking) {
      loadOrCreateInvoice();
    }
  }, [isOpen, booking]);

  const calculateInvoiceAmount = () => {
    // Calculate base amount from booking
    const baseAmount = booking.total_amount || 0;
    
    // Calculate addons total
    const mealsTotal = (booking.selected_meals || []).reduce((sum: number, meal: any) => 
      sum + (meal.price * meal.quantity), 0);
    const activitiesTotal = (booking.selected_activities || []).reduce((sum: number, activity: any) => 
      sum + (activity.price * activity.quantity), 0);
    const spaTotal = (booking.selected_spa_services || []).reduce((sum: number, spa: any) => 
      sum + (spa.price * spa.quantity), 0);
    
    const subtotal = baseAmount + mealsTotal + activitiesTotal + spaTotal;
    const gstAmount = Math.round(subtotal * 0.18 * 100) / 100; // 18% GST
    const totalAmount = subtotal + gstAmount;
    
    return { subtotal, gstAmount, totalAmount };
  };

  const loadOrCreateInvoice = async () => {
    setGeneratingInvoice(true);
    try {
      // Check if invoice already exists
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('*')
        .eq('booking_id', booking.id)
        .single();

      if (existingInvoice) {
        setInvoice(existingInvoice);
        setPaymentAmount(existingInvoice.due_amount);
      } else {
        // Create new invoice
        const { subtotal, gstAmount, totalAmount } = calculateInvoiceAmount();
        
        // Generate invoice number
        const { data: invoiceNumberData } = await supabase.rpc('generate_invoice_number');
        
        // Create line items
        const lineItems = [
          {
            description: `Room booking - ${booking.room_types?.name || 'Room'}`,
            quantity: 1,
            rate: booking.total_amount,
            amount: booking.total_amount
          }
        ];

        // Add addon line items
        (booking.selected_meals || []).forEach((meal: any) => {
          lineItems.push({
            description: `Meal - ${meal.title}`,
            quantity: meal.quantity,
            rate: meal.price,
            amount: meal.price * meal.quantity
          });
        });

        (booking.selected_activities || []).forEach((activity: any) => {
          lineItems.push({
            description: `Activity - ${activity.title}`,
            quantity: activity.quantity,
            rate: activity.price,
            amount: activity.price * activity.quantity
          });
        });

        (booking.selected_spa_services || []).forEach((spa: any) => {
          lineItems.push({
            description: `Spa Service - ${spa.title}`,
            quantity: spa.quantity,
            rate: spa.price,
            amount: spa.price * spa.quantity
          });
        });

        const { data: newInvoice, error } = await supabase
          .from('invoices')
          .insert({
            booking_id: booking.id,
            invoice_number: invoiceNumberData,
            subtotal_amount: subtotal,
            gst_amount: gstAmount,
            total_amount: totalAmount,
            due_amount: totalAmount,
            line_items: lineItems
          })
          .select()
          .single();

        if (error) throw error;
        
        setInvoice(newInvoice);
        setPaymentAmount(newInvoice.due_amount);
      }
    } catch (error) {
      console.error('Error loading/creating invoice:', error);
      toast({
        title: "Error",
        description: "Failed to load invoice details",
        variant: "destructive",
      });
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handlePayment = async () => {
    if (!invoice || paymentAmount <= 0) return;

    setProcessing(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate transaction reference if not provided
      const txnRef = transactionRef || `TXN-${Date.now()}`;

      // Record payment
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          invoice_id: invoice.id,
          booking_id: booking.id,
          amount: paymentAmount,
          payment_method: paymentMethod,
          transaction_reference: txnRef,
          received_by: user?.id,
          notes: notes || null
        });

      if (paymentError) throw paymentError;

      // Update booking payment status if fully paid
      const newPaidAmount = invoice.paid_amount + paymentAmount;
      if (newPaidAmount >= invoice.total_amount) {
        await supabase
          .from('bookings')
          .update({
            payment_status: 'confirmed',
            payment_method: paymentMethod,
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.id);
      }

      toast({
        title: "Payment Recorded",
        description: `Payment of ₹${paymentAmount.toLocaleString()} recorded successfully`,
      });

      onSuccess();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (generatingInvoice) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-4">
              <Receipt className="h-12 w-12 mx-auto animate-pulse text-primary" />
              <p>Generating invoice...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Record Payment - {booking.booking_id}
          </DialogTitle>
        </DialogHeader>

        {invoice && (
          <div className="space-y-6">
            {/* Invoice Summary */}
            <Card className="bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Invoice: {invoice.invoice_number}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>₹{invoice.subtotal_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST (18%):</span>
                      <span>₹{invoice.gst_amount.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Total Amount:</span>
                      <span>₹{invoice.total_amount.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-green-600">
                      <span>Paid Amount:</span>
                      <span>₹{invoice.paid_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-red-600 font-medium">
                      <span>Due Amount:</span>
                      <span>₹{invoice.due_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {invoice.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Form */}
            {invoice.due_amount > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Record Payment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="amount">Payment Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                        max={invoice.due_amount}
                        min={0}
                        step="0.01"
                      />
                    </div>
                    <div>
                      <Label htmlFor="method">Payment Method</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="net_banking">Net Banking</SelectItem>
                          <SelectItem value="razorpay">Razorpay</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="txnRef">Transaction Reference (Optional)</Label>
                    <Input
                      id="txnRef"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      placeholder="Enter transaction ID/reference"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes about this payment"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {invoice.due_amount > 0 && (
                <Button
                  onClick={handlePayment}
                  disabled={processing || paymentAmount <= 0 || paymentAmount > invoice.due_amount}
                  className="min-w-32"
                >
                  {processing ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-muted-foreground border-t-primary rounded-full" />
                      Recording...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {paymentMethod === 'cash' ? <Banknote className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                      Record Payment
                    </div>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}