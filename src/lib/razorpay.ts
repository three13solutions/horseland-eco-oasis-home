// Razorpay configuration and utilities
let razorpayConfig = {
  KEY_ID: 'rzp_test_1DP5mmOlF5G5ag', // Default test key
  CURRENCY: 'INR',
  GST_RATE: 0.18, // 18% GST
};

// Function to load Razorpay config from integrations
export const loadRazorpayConfig = async () => {
  try {
    const response = await fetch(`https://mmmogqappdtnwqkvzxih.supabase.co/functions/v1/get-razorpay-public-key`);

    if (response.ok) {
      const data = await response.json();
      if (data.key_id) {
        razorpayConfig.KEY_ID = data.key_id;
      }
    }
  } catch (error) {
    console.log('Using default Razorpay config');
  }
  return razorpayConfig;
};

export const RAZORPAY_CONFIG = razorpayConfig

export interface PaymentData {
  amount: number; // in paise (multiply by 100)
  currency: string;
  orderId: string;
  description: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
}

export interface BookingPaymentDetails {
  baseAmount: number;
  addonAmount: number;
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
}

export const calculateBookingAmount = (
  roomPrice: number,
  nights: number,
  addonTotal: number = 0
): BookingPaymentDetails => {
  const baseAmount = roomPrice * nights;
  const subtotal = baseAmount + addonTotal;
  const gstAmount = subtotal * RAZORPAY_CONFIG.GST_RATE;
  const totalAmount = subtotal + gstAmount;

  return {
    baseAmount,
    addonAmount: addonTotal,
    subtotal,
    gstAmount,
    totalAmount,
  };
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

// Convert amount to paise for Razorpay
export const toPaise = (amount: number): number => {
  return Math.round(amount * 100);
};

// Convert paise to rupees
export const fromPaise = (paise: number): number => {
  return paise / 100;
};