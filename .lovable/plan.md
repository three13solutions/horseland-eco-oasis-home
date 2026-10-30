# Switch Razorpay to live keys

## What happens
1. A secure form opens in chat with two boxes: **Razorpay Live Key ID** (`rzp_live_...`) and **Razorpay Live Key Secret**. The keys are saved encrypted. They never appear in chat or in the code.
2. The website's payment flow uses these live keys first. The keys saved earlier in Admin → Integrations stay in place as a backup.
3. The Admin → Integrations → Razorpay card shows **Live mode** or **Test mode**, so you can see which keys are active.
4. Check: I create one live payment order without charging it, to confirm Razorpay accepts the keys. You then make a small real booking to confirm the whole flow.

## Important
- Once this is on, every payment is real money. Test cards will stop working.
- Your Razorpay account must be activated, and its live keys come from Razorpay Dashboard → Live Mode → Settings → API Keys.

## Technical details
- Request secrets `RAZORPAY_LIVE_KEY_ID` and `RAZORPAY_LIVE_KEY_SECRET` with add_secret, using the format hint `^rzp_live_`.
- In `supabase/functions/_shared/distributionRazorpay.ts` and the public-key lookup, use the env secrets when they are set. Otherwise fall back to the `api_integration_secrets` keys.
- Redeploy `create-razorpay-order-v3`, `finalize-booking-v3`, `reconcile-distribution-hold`, and the key-fetch function.
- Set `ALLOW_TEST_BOOKINGS` to false so that test payments cannot create confirmed bookings in live mode.
