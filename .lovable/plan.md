# Fix: Booking summary total does not match Pay Now popup amount

## Root cause (confirmed in code)

The booking summary on `/booking` and the Razorpay "Pay Now" popup use **two different formulas**:

**Booking summary** (`src/pages/Booking.tsx`, `calculateTotal()`):
- Uses `selectedVariant.total_price` — which is already the **total for the whole stay** (all nights, meals, policy included)
- Adds add-ons + pickup + bedding
- Applies GST from the **database GST tiers** based on per-night rate (e.g. 12% or 18%)

**Pay Now popup** (`src/components/PaymentModal.tsx` + `calculateBookingAmount` in `src/lib/razorpay.ts`):
- Receives `roomPrice = selectedVariant.total_price` (a total), then multiplies it by nights again → **price gets multiplied by nights twice**
- Applies a **hardcoded 18% GST** (`RAZORPAY_CONFIG.GST_RATE`) instead of the tier rate

So for a 2-night stay the popup shows roughly double the room cost, plus a different GST percentage. The final `finalize-booking` step also re-saves whatever amount it is sent, so the stored booking amount can inherit this wrong figure.

## Fix

1. **`src/pages/Booking.tsx`** — pass the payment popup the same numbers the summary uses:
   - `roomPrice: selectedVariant?.price_per_night` (per-night rate, since the popup multiplies by nights), **or** better: compute the breakdown once in Booking.tsx and pass the final totals through. Chosen approach: pass per-night rate + the same GST rate used in the summary so both places always agree.
2. **`src/components/PaymentModal.tsx`** — accept an optional pre-computed `totalAmount` / `gstRate` from the parent; when provided, use it verbatim instead of recalculating with the hardcoded 18%. Fall back to existing behaviour for other callers (`PaymentOptionsModal`).
3. **`src/lib/razorpay.ts`** — make `calculateBookingAmount` accept an optional `gstRate` parameter (default 18%) so no caller is forced into the wrong rate.
4. Verify the Razorpay order amount (via `create-razorpay-order`) equals the summary total, and that `finalize-booking` stores that same amount.

## Verification

- Test 1-night and 2-night bookings with a rate-variant that triggers a non-18% GST tier: summary total == Pay Now total == Razorpay order amount == stored booking amount.
- Confirm existing flows (cash payment via `PaymentOptionsModal`, admin payment modal) still work unchanged.

## Files to change

- `src/pages/Booking.tsx`
- `src/components/PaymentModal.tsx`
- `src/lib/razorpay.ts`

No changes to UI/design, booking flow structure, or admin pages.
