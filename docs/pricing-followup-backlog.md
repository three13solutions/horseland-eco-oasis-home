# Pricing follow-up backlog

User decisions for the current production integration:
- Shared meal prices edited securely from either Meal Management or Meal Plans; linked supplements derived from required AND groups / equal-priced OR alternatives.
- FB/AP includes high tea. Current HB/MAP retains breakfast + dinner; no arbitrary lunch/dinner choice.
- Adults, children and infants all pay the same full meal price for now.
- Booking currently collects the primary guest and selected plan; individual meal selections are deferred.
- Weekend rules are configurable and stay-date effective, with no historical backdating. Saturday-only activation is coordinated with confirmed EP rates.

Deferred, not represented as live functionality:
1. Collect separate choices for every guest and occupied date, persist selected component/price revisions in authoritative quote and booking snapshots, support unequal OR alternatives end-to-end.
2. Age-specific child/infant meal pricing after explicit policy approval.
3. Activate the proposed ₹300/night EP promotion only as a separately configured promotion, not by reducing EP base prices; verify guest display, eligibility and payment quote integration.
4. Complete the broader EP calendar's durable persistence, override/reset and coverage workflow. Its separate experimental workspace remains explicitly session-only.
5. Browser interaction and visual QA in an environment where Chromium can run; server-render smoke and source guards are not a substitute.

Before the current production rollout: coordinate meal supplement refresh, approved EP anchors and effective weekend activation in one reviewed sequence; do not invent 24 December 2026–1 January 2027 festive rates or change existing confirmed bookings/payment snapshots. Check the deployment report for actual completed rollout state.
