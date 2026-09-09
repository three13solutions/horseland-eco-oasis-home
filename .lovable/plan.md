# Fix "Your Perfect Stay Awaits" — show 3 room types

## Root cause (confirmed)
`src/components/StayPreview.tsx` filters published room types by the exact names `Standard`, `Deluxe`, `Superior`. In the database there is no room type named `Standard` — the Standard room is named `Standard AC` (published). So only `Deluxe` and `Superior` match, and the section renders 2 cards instead of 3.

Published room types currently: Basement Hideouts, Deluxe, Standard (Non-AC), Standard AC, Superior, Superior (Loft).

## Fix
Update `src/components/StayPreview.tsx`:
- Change the query filter from `['Standard', 'Deluxe', 'Superior']` to `['Standard AC', 'Deluxe', 'Superior']`.
- Update the sort order array to match so the cards appear in the order: Standard AC, Deluxe, Superior (Deluxe stays the featured "Most Popular" middle card).

No other pages, CMS data, or room types are changed.

## Result
Homepage shows 3 cards: Standard AC (₹5,000), Deluxe (₹6,000, "Most Popular"), Superior (₹7,000).
