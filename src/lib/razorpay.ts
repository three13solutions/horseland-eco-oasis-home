// Razorpay configuration and utilities
export const RAZORPAY_CONFIG = {
  // Test keys for development - replace with actual keys later
  KEY_ID: 'rzp_test_1DP5mmOlF5G5ag', // Demo test key
  CURRENCY: 'INR',
  GST_RATE: 0.18, // 18% GST
} as const;

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