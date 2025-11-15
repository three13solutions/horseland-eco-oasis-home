-- Update Non-Refundable Rate policy discount to 5%
UPDATE cancellation_policy_rules 
SET 
  adjustment_value = -5,
  description = 'Best price, but no refund on cancellation. Save 5% on your booking.'
WHERE policy_code = 'non_refundable';

-- Update Refundable as Credit Voucher policy description
UPDATE cancellation_policy_rules 
SET 
  description = 'Tiered cancellation charges apply based on cancellation timings/booking days, please read cancellation policy for more details, and refund is issued as a credit voucher valid for redemption within 6 months.'
WHERE policy_code = 'refundable_credit';