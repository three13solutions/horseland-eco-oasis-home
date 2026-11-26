# Let guests clear a saved checkout that was never paid

## Why the message appears
Opening the Pay Now window creates a payment order with Razorpay. Clear Booking currently refuses any checkout that has a payment order, even when the guest closed the window without paying. That is the case here.

## What will change
- Clear Booking will work for checkouts where Pay Now was opened but no money was taken.
- Before clearing, the hotel server asks Razorpay whether any payment exists on that order.
  - No payment (or only failed attempts): the room hold is released, the order is marked abandoned, and the guest can start a new booking.
  - A payment is successful, authorised or still processing: clearing stays blocked and the guest sees a message to contact the hotel. Paid bookings are never cancelled.
- Safety net: Razorpay orders cannot be cancelled. If a payment arrives later on an abandoned order, it is not turned into a booking silently; it is flagged for hotel review in admin (and auto-refunded if you prefer — see question below, default: flag for review).
- The confirmation text on the button will explain this in plain words.

## Technical details
- `src/pages/Booking.tsx`: drop the client-side `saved.orderId` block; keep the `paid` block; send `order_id` with the `clear` action.
- `create-razorpay-order-v3` `clear` action: verify checkout capability, fetch `GET /v1/orders/{id}/payments` with server keys; allow only when every payment is `failed` (or none). Then, in one DB call, mark the payment order `abandoned`, release the inventory hold, close the attempt. Any Razorpay fetch error keeps the current block (fail safe).
- New/updated SQL fence function to accept an abandoned-order clear, admin-audited via existing triggers.
- Finalizer/webhook: payment on an `abandoned` order creates a review record instead of a booking.
- Update the AGENTS.md rule for saved checkout clearing; extend `tests/ep-promo-endpoint.test.mjs` for: no payments clears, captured/authorized blocks, Razorpay error blocks.
