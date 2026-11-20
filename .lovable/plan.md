# Dynamic guest types and linked pricing

## Result

Guest Type Policy will become the single source of guest names and age ranges for Horseland’s own booking and pricing screens. Adding a type such as Toddler or Senior will expose that type in the relevant price editors automatically; activating a complete policy will expose it in guest selection. No additional code change will be needed for each new guest type.

Each policy row will have an expandable **Linked Pricing** table showing its saved accommodation and meal prices, where they apply, and links to edit the original pricing record.

## 1. Configured types and price entries

- Keep stable internal identifiers when names change, so linked rates remain attached.
- Make the accommodation editors in **Rate Plans**, **Guest Composition**, and **Rate Overrides** fetch configured types, including types awaiting activation in drafts.
- For each type, retain **Enter Rate** and **Same as Adult**. Distinguish an explicitly entered zero from a missing price; do not invent rates for new types.
- Make **Meal Plans → Meal prices by guest type** use the same types for EP/RO, CP/BB, MAP/HB and AP/FB. Retain the configured fixed, adult-linked and percentage rules. EP keeps zero meal charges.
- Preserve existing amounts, scopes, date rules, overrides and shared adult meal charges.

## 2. Expandable linked-pricing table

Add an expand arrow beside each Guest Type in the existing policy table. Its expanded row will show:

| Column | Content |
| --- | --- |
| Pricing record | Rate-plan, guest-composition, override or meal-plan name |
| Charge | Accommodation or Meal |
| Applies to | Room category, room type, individual unit, or shared meal plan |
| Dates / stay | Applicable dates, day and stay-length restrictions |
| Rate | Saved amount or Same as Adult; resolved amount when its source is available |
| Status | Enabled, disabled, staged or missing configuration |
| Edit | Open the owning pricing editor |

Show only actual linked records, not fabricated prices. For **No Charge**, show the policy override separately while retaining the saved mapped rates. Drafts and older versions sharing a guest-type identifier use its current linked configuration; historical booking prices remain in their original snapshots.

## 3. Guest selection and rate calculation

Replace the fixed Adult/Child/Infant fields with configured active types across:

- Homepage booking search.
- Available Accommodations search and room-rate selection.
- Stay-page booking windows and individual room pages.
- Booking-page search/edit controls and guest summaries.
- Live Rate Card guest selector and calculation breakdown.
- Admin manual booking and the guest-type selection in meal-choice previews.

Carry the complete guest breakdown between pages, through search changes, and into every quote. Display configured names and completed-year age ranges. Drafts never appear as selectable live guest types.

Prices remain calculated by the authoritative rate engine—not by multiplying new prices in the browser. The breakdown will expose each type’s quantity, mapped accommodation charge and meal charge.

**Compatibility:** The separate STAAH booking widget is not controlled by Horseland’s pricing configuration and will remain unchanged.

## 4. Checkout, payments and saved bookings

- Include all guest types and the policy revision in quote requests and checkout identity.
- Validate type identifiers, counts, revision and mapped prices on the server. Reject unknown types, missing charges and conflicting old/new guest counts rather than silently dropping guests.
- Keep promo previews and payment-order validation on the same quoted party and fingerprint.
- Persist the complete guest breakdown and its policy labels through inventory holds, finalization, manual bookings, confirmation and reporting.
- Resume existing payment intents using their stored selection and price. Do not reinterpret or reprice historical bookings after a policy change.

## 5. Policy activation and pricing safeguards

- Retain unique guest names, contiguous age coverage, no overlapping active policies, coordinated draft activation, stale-edit checks, and the alternate-policy safeguard for deactivation.
- Replace the “matching booking and pricing support” restriction only after the keyed guest-selection, pricing and payment paths are implemented and tested together.
- Use the existing included-adult allowance once per room. Extra-person **Same as Adult** remains a link to the adult extra-person charge; it does not silently grant another included-adult allowance to every newly named type.
- Keep capacity checks separate from free-charge rules: “No Charge” must not automatically remove a guest from room occupancy.
- Where an older package has no reliable accommodation/meal split, do not infer a custom price. Return a clear configuration-needed result and link administrators to the owning rate editor.
- Keep production pricing unchanged until the matching public version is published and the coordinated release is verified; flipping a status alone must never imply the new engine is installed.

## Verification

Test a fourth type and a bounded Adult range with a separate upper-age type, including:

- Dynamic selector and price-editor rows, linked-pricing expansion and saved-rate read-back.
- Fixed and Same-as-Adult accommodation and meal prices; adult edits update linked prices.
- Multi-night stays, room/unit scopes, override precedence, free-charge policies and missing-price rejection.
- Search/booking navigation preserving every count and invalidating stale quotes after changes.
- Promo previews, retained-checkout identity and finalization preserving the saved party without creating a real charge.
- No gaps for 0–3 / 4–9 / 10+, no duplicate names, and no deactivation without a replacement.
- Existing three-type pricing and historical booking snapshots remaining unchanged.

The connected external Supabase project does not provide an administrator test session. Verify public flows and isolated authenticated scenarios automatically; report connected administrator and payment checks as unverified unless an approved session/test environment becomes available. No real booking or payment will be created just to test this change.

## Technical implementation

- Introduce one canonical keyed guest-party contract shared by URL helpers, selectors, queries, server quotes and persistence; retain legacy numeric fields only as compatibility projections.
- Add distinctly named keyed SQL pricing entry points, preserving existing visibility, date-preservation, modifier and cancellation logic. Do not use ambiguous defaulted overloads or replace authoritative pricing with browser calculations.
- Extend tactical override storage and lookups with stable guest-type identifiers, preserving atomic conflict handling and linked-rate dependencies.
- Keep draft price configuration separate from authoritative versioned policies; preserve grants, administrator-only writes, audit logging and immutable booking history.
- Update the database-backed distribution finalization path as well as the general quote adapter—both store booking data.