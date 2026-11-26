# Room pages: show the prices set in Room Rate Management

## What I found
- The room pages (Superior, Deluxe, Standard, Basement Hideouts) do **not** read the prices you edit in Room Rate Management.
- They show an old fixed "base price" stored on the room type (Superior ₹7,000, Deluxe ₹6,000, Standard ₹5,000, Basement Hideouts ₹4,000) and an older "seasonal rates" list.
- Room Rate Management saves to the rate plan pricing that the booking search and checkout use. So a change you make there will reach the booking price, but the room page will keep showing the old number.

## What I'll change
1. The price box on each room page will show the Room Only (EP) rate from Room Rate Management:
   - Tonight's rate by default; once the guest picks dates, the average nightly rate for those dates.
   - Label: "From ₹X / night (Room only)", plus a small note that meal plans are added at booking.
2. Replace the old "See seasonal rates" list with a next-7-days strip read from the same rates (weekday/weekend differences show automatically).
3. If no rate is set for a date, fall back to the current base price so the box never shows blank.
4. Leave booking, checkout, promo codes and the admin pages unchanged.

## Check
- Change a rate in Room Rate Management, open the room page, and confirm the same number appears.

## Technical details
- `src/pages/RoomDetail.tsx`: replace `room_types.base_price` / `seasonal_pricing` display with the public website rate entry point already used by search (`calculate_website_rate_variants`, EP variant, refundable), via a small hook with React Query.
- No database changes.
