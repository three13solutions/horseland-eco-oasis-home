# Promo Codes: status and remaining cleanup

## Current status (checked)
- Admin: Pricing -> Promotions lists the promo codes. Admins can create, edit and preview them, set limits (booking/stay dates, weekdays/weekends, minimum nights, meal plans, room categories, usage limits) and choose Active and Public.
- Live: website promo codes are switched ON. EP300 (Rs 300 off per room-only night) and DIRECT1000 (Rs 1,000 off per booking) are both active and public.
- Live Rate Card: the Promo Codes dropdown uses the same list.

## How guests see it at checkout
- Promo codes only appear in the payment window, not on the booking page itself.
- An "Available offers" dropdown lists every active, public code with its label. Picking one shows its rules (dates, days, minimum nights, eligible plans).
- Apply sends the code to the server, which checks it and returns the new price. The discount line then shows, and the server records the discount on the payment order. Only one code can be used at a time, and the total never drops below Rs 1.
- The dropdown is hidden when resuming an existing booking or when the quote needs re-review.

## Still pending
1. Remove the leftover support for the temporary HLTEST1 Rs 1 test code from the payment server code. It is kept only so old test checkouts still work.
2. Optional: show available offers on the booking page before checkout, so guests see discounts earlier.
3. Not yet checked end-to-end: a real signed-in checkout with DIRECT1000, through to a payment order. No booking has been created to test this.

## Technical details
- Data: `website_promotions` + `website_promo_rollout` (enabled = true).
- Checkout: `PaymentModal.tsx` calls `create-razorpay-order-v3` with `promotions` and `promo` actions.
- Item 1: remove the `HLTEST1` branch near line 72 of `create-razorpay-order-v3/index.ts` and redeploy.
