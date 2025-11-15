import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Printer, Download, Home } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/razorpay";

interface BookingDetails {
  id: string;
  booking_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in: string;
  check_out: string;
  guests_count: number;
  total_amount: number;
  payment_status: string;
  payment_method: string;
  payment_id: string;
  payment_order_id: string;
  room_cost: number;
  meal_cost: number;
  meal_plan_code: string;
  cancellation_policy_code: string;
  rate_breakdown: any;
  created_at: string;
  room_type?: {
    name: string;
    description: string;
  };
}

export default function BookingConfirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = searchParams.get("booking_id");
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) {
      toast({
        title: "Invalid Booking",
        description: "No booking ID provided",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          room_type:room_types(name, description)
        `)
        .eq("booking_id", bookingId)
        .single();

      if (error) throw error;

      setBooking(data);
    } catch (error) {
      console.error("Error fetching booking:", error);
      toast({
        title: "Error",
        description: "Failed to load booking details",
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a printable version
    const printWindow = window.open("", "_blank");
    if (printWindow && booking) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Booking Confirmation - ${booking.booking_id}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; }
              h1 { color: #2c3e50; }
              .section { margin: 20px 0; }
              .label { font-weight: bold; }
              .value { margin-left: 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
              th { background-color: #f8f9fa; }
              .total { font-size: 18px; font-weight: bold; }
            </style>
          </head>
          <body>
            <h1>Booking Confirmation</h1>
            <div class="section">
              <p><span class="label">Booking ID:</span><span class="value">${booking.booking_id}</span></p>
              <p><span class="label">Booking Date:</span><span class="value">${new Date(booking.created_at).toLocaleDateString()}</span></p>
              <p><span class="label">Status:</span><span class="value">${booking.payment_status.toUpperCase()}</span></p>
            </div>
            
            <h2>Guest Information</h2>
            <div class="section">
              <p><span class="label">Name:</span><span class="value">${booking.guest_name}</span></p>
              <p><span class="label">Email:</span><span class="value">${booking.guest_email}</span></p>
              <p><span class="label">Phone:</span><span class="value">${booking.guest_phone}</span></p>
            </div>
            
            <h2>Stay Details</h2>
            <div class="section">
              <p><span class="label">Room:</span><span class="value">${booking.room_type?.name || 'N/A'}</span></p>
              <p><span class="label">Check-in:</span><span class="value">${new Date(booking.check_in).toLocaleDateString()}</span></p>
              <p><span class="label">Check-out:</span><span class="value">${new Date(booking.check_out).toLocaleDateString()}</span></p>
              <p><span class="label">Guests:</span><span class="value">${booking.guests_count}</span></p>
              <p><span class="label">Nights:</span><span class="value">${Math.ceil((new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / (1000 * 60 * 60 * 24))}</span></p>
            </div>
            
            <h2>Payment Summary</h2>
            <table>
              <tr>
                <th>Description</th>
                <th>Amount</th>
              </tr>
              <tr>
                <td>Room Cost</td>
                <td>${formatCurrency(booking.room_cost || 0)}</td>
              </tr>
              <tr>
                <td>GST (18%)</td>
                <td>${formatCurrency((booking.total_amount || 0) * 0.18 / 1.18)}</td>
              </tr>
              <tr class="total">
                <td>Total Paid</td>
                <td>${formatCurrency(booking.total_amount || 0)}</td>
              </tr>
            </table>
            
            <div class="section">
              <p><span class="label">Payment Method:</span><span class="value">${booking.payment_method?.toUpperCase()}</span></p>
              <p><span class="label">Payment ID:</span><span class="value">${booking.payment_id}</span></p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  const nights = Math.ceil(
    (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const gstAmount = (booking.total_amount || 0) * 0.18 / 1.18;
  const subtotal = (booking.total_amount || 0) - gstAmount;

  return (
    <div className="min-h-screen bg-background py-12 px-4 print:py-4">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8 print:mb-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 print:hidden" />
          <h1 className="text-3xl font-bold mb-2">Booking Confirmed!</h1>
          <p className="text-muted-foreground">
            A confirmation email has been sent to {booking.guest_email}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6 print:hidden justify-center flex-wrap">
          <Button onClick={handlePrint} variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleDownload} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button onClick={() => navigate("/")} variant="default">
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        {/* Booking Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Booking ID</p>
                <p className="font-semibold">{booking.booking_id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Booking Date</p>
                <p className="font-semibold">
                  {new Date(booking.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-semibold text-green-600">
                  {booking.payment_status.toUpperCase()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <p className="font-semibold">{booking.payment_method?.toUpperCase()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Guest Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Guest Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-semibold">{booking.guest_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-semibold">{booking.guest_email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-semibold">{booking.guest_phone}</p>
            </div>
          </CardContent>
        </Card>

        {/* Stay Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Stay Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Room Type</p>
              <p className="font-semibold">{booking.room_type?.name || 'N/A'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Check-in</p>
                <p className="font-semibold">
                  {new Date(booking.check_in).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Check-out</p>
                <p className="font-semibold">
                  {new Date(booking.check_out).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Number of Guests</p>
                <p className="font-semibold">{booking.guests_count}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Number of Nights</p>
                <p className="font-semibold">{nights}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Meal Plan</p>
              <p className="font-semibold capitalize">
                {booking.meal_plan_code?.replace(/_/g, ' ') || 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Room Cost</span>
              <span className="font-semibold">{formatCurrency(booking.room_cost || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GST (18%)</span>
              <span className="font-semibold">{formatCurrency(gstAmount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total Paid</span>
              <span className="text-green-600">{formatCurrency(booking.total_amount || 0)}</span>
            </div>
            <Separator />
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment ID</span>
                <span className="font-mono text-xs">{booking.payment_id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Order ID</span>
                <span className="font-mono text-xs">{booking.payment_order_id}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Print Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground print:block hidden">
          <p>Thank you for your booking! We look forward to welcoming you.</p>
          <p className="mt-2">
            For any queries, please contact us with your booking ID: {booking.booking_id}
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:py-4 { padding-top: 1rem; padding-bottom: 1rem; }
          .print\\:mb-4 { margin-bottom: 1rem; }
        }
      `}</style>
    </div>
  );
}
