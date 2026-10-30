# Add a Test / Live switch for Razorpay

## Current state
The admin panel has no switch for this. The website uses the live keys automatically whenever they are saved, so to go back to test mode the live keys have to be removed.

## What to build
1. Add a **Payment Mode** switch (Test / Live) to Admin → Integrations → Razorpay.
   - **Live**: uses the live keys you just saved. Real money is charged.
   - **Test**: uses the test keys saved in the Razorpay Configure form. No real money is charged.
2. Before switching to Live, show a confirmation: "Real payments will be charged."
3. Show a clear badge on the Razorpay card: **Live mode** (red) or **Test mode** (amber).
4. Checkout, booking confirmation and payment checks all follow the switch. Test-card bookings are accepted only in Test mode.

## Technical details
- Add a `payment_mode` column ('test' | 'live', default 'live') to the Razorpay row in `api_integrations`. Only admins can update it.
- `getDistributionRazorpayCredentials` and `get-razorpay-public-key` read `payment_mode`:
  - live: env `RAZORPAY_LIVE_KEY_*`
  - test: the encrypted `api_integration_secrets` keys
- Test bookings are allowed only when `payment_mode = 'test'`.
- Redeploy the four Razorpay functions. Then verify that each mode returns the matching key type.
