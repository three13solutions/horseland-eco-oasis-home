import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BookingConfirmationRequest {
  booking_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { booking_id }: BookingConfirmationRequest = await req.json();

    if (!booking_id) {
      throw new Error("Booking ID is required");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        room_type:room_types(name, description)
      `)
      .eq('booking_id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('Error fetching booking:', bookingError);
      throw new Error('Booking not found');
    }

    // Calculate nights
    const checkIn = new Date(booking.check_in);
    const checkOut = new Date(booking.check_out);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    // Format currency
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
      }).format(amount);
    };

    // Calculate GST breakdown
    const gstAmount = (booking.total_amount || 0) * 0.18 / 1.18;
    const subtotal = (booking.total_amount || 0) - gstAmount;

    // Create email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .content {
              background: #f8f9fa;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .section {
              background: white;
              padding: 20px;
              margin-bottom: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .section h2 {
              color: #667eea;
              font-size: 18px;
              margin-top: 0;
              margin-bottom: 15px;
              border-bottom: 2px solid #f0f0f0;
              padding-bottom: 10px;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #f0f0f0;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-label {
              color: #666;
              font-weight: 500;
            }
            .detail-value {
              color: #333;
              font-weight: 600;
            }
            .total-row {
              background: #f8f9fa;
              padding: 15px;
              margin-top: 15px;
              border-radius: 6px;
              font-size: 18px;
              font-weight: bold;
            }
            .success-badge {
              background: #10b981;
              color: white;
              padding: 6px 12px;
              border-radius: 4px;
              font-size: 14px;
              display: inline-block;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #f0f0f0;
              color: #666;
              font-size: 14px;
            }
            .button {
              display: inline-block;
              background: #667eea;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 6px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>✓ Booking Confirmed!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Booking ID: ${booking.booking_id}</p>
          </div>
          
          <div class="content">
            <div class="section">
              <h2>Booking Status</h2>
              <div class="detail-row">
                <span class="detail-label">Status</span>
                <span class="success-badge">CONFIRMED</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Booking Date</span>
                <span class="detail-value">${new Date(booking.created_at).toLocaleDateString()}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Payment Method</span>
                <span class="detail-value">${booking.payment_method?.toUpperCase()}</span>
              </div>
            </div>

            <div class="section">
              <h2>Guest Information</h2>
              <div class="detail-row">
                <span class="detail-label">Name</span>
                <span class="detail-value">${booking.guest_name}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Email</span>
                <span class="detail-value">${booking.guest_email}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Phone</span>
                <span class="detail-value">${booking.guest_phone}</span>
              </div>
            </div>

            <div class="section">
              <h2>Stay Details</h2>
              <div class="detail-row">
                <span class="detail-label">Room Type</span>
                <span class="detail-value">${booking.room_type?.name || 'N/A'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Check-in</span>
                <span class="detail-value">${checkIn.toLocaleDateString()}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Check-out</span>
                <span class="detail-value">${checkOut.toLocaleDateString()}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Number of Guests</span>
                <span class="detail-value">${booking.guests_count}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Number of Nights</span>
                <span class="detail-value">${nights}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Meal Plan</span>
                <span class="detail-value">${booking.meal_plan_code?.replace(/_/g, ' ').toUpperCase() || 'N/A'}</span>
              </div>
            </div>

            <div class="section">
              <h2>Payment Summary</h2>
              <div class="detail-row">
                <span class="detail-label">Room Cost</span>
                <span class="detail-value">${formatCurrency(booking.room_cost || 0)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">GST (18%)</span>
                <span class="detail-value">${formatCurrency(gstAmount)}</span>
              </div>
              <div class="total-row detail-row">
                <span class="detail-label">Total Paid</span>
                <span class="detail-value" style="color: #10b981;">${formatCurrency(booking.total_amount || 0)}</span>
              </div>
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #f0f0f0;">
                <div class="detail-row">
                  <span class="detail-label" style="font-size: 13px;">Payment ID</span>
                  <span class="detail-value" style="font-size: 12px; font-family: monospace;">${booking.payment_id}</span>
                </div>
              </div>
            </div>

            <div class="footer">
              <p><strong>Thank you for your booking!</strong></p>
              <p>We look forward to welcoming you.</p>
              <p style="margin-top: 20px; font-size: 13px;">
                For any queries, please reply to this email or contact us with your booking ID.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Bookings <onboarding@resend.dev>", // Update with your verified domain
      to: [booking.guest_email],
      subject: `Booking Confirmation - ${booking.booking_id}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, email_id: emailResponse.id }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-booking-confirmation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
