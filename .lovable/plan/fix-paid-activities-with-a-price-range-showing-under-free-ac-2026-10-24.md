# Fix: Paid activities with a price range showing under "Free Activities"

## Cause
"Hand-Pulled Rickshaw Ride" uses a price range (500 to 5550), so its single fixed price is empty. The "Free Activities / Paid Activities" buttons on the Activities page only look at the fixed price, so the ride counts as free.

## Change
On the Activities page (`src/pages/Activities.tsx`, the filter logic around line 126), decide free or paid from the price type set in admin:
- **Free**: price type is "free".
- **Paid**: price type is "fixed" or "range".
- If an older activity has no price type, fall back to the prices: paid if it has a fixed price, or a range price above 0.

## Not changed
- Admin panel, saved data, and the other price filters (Under 500, 500–1000, and so on).

## Check
- The rickshaw ride shows under Paid Activities and no longer under Free.
- Activities set to Free still show under Free Activities.
