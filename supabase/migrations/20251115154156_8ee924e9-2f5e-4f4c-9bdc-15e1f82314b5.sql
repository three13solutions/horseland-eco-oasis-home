-- Update Non-Refundable Rate policy
UPDATE cancellation_policy_rules 
SET 
  policy_name = 'Non-Refundable Rate',
  description = 'Best price, but no refund on cancellation. Save 10% on your booking.',
  adjustment_type = 'percentage',
  adjustment_value = -10,
  cancellation_terms = jsonb_build_object(
    'terms', 'No refund on cancellation',
    'refund_percentage', 0,
    'notice_hours', 0
  ),
  is_featured = false,
  display_order = 1
WHERE policy_code = 'non_refundable';

-- Update Flexible Rate to become Refundable as Credit Voucher policy
UPDATE cancellation_policy_rules 
SET 
  policy_code = 'refundable_credit',
  policy_name = 'Refundable as Credit Voucher',
  description = 'Full refund as credit voucher valid for 6 months. Tiered cancellation charges apply based on timing.',
  adjustment_type = 'percentage',
  adjustment_value = 0,
  cancellation_terms = jsonb_build_object(
    'terms', 'Refund as credit voucher valid for 6 months. Cancellation charges: Free if 15+ days before, 25% if 7-3 days before, 50% if 2 days-24 hours before, 100% within 24 hours.',
    'refund_tiers', jsonb_build_array(
      jsonb_build_object('days_before', 15, 'charge_percentage', 0),
      jsonb_build_object('days_before', 7, 'charge_percentage', 25),
      jsonb_build_object('days_before', 2, 'charge_percentage', 50),
      jsonb_build_object('days_before', 0, 'charge_percentage', 100)
    ),
    'credit_validity_months', 6,
    'refund_type', 'credit_note'
  ),
  is_featured = true,
  display_order = 2
WHERE policy_code = 'flexible';

-- Deactivate the Standard/Moderate rate policy
UPDATE cancellation_policy_rules 
SET is_active = false
WHERE policy_code = 'moderate';