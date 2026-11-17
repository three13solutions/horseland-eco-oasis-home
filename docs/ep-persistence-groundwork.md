# Isolated draft-save boundary

`src/lib/ep-draft-persistence.ts` adds a pure application-service contract, not a deployed endpoint, SQL migration, durable store or UI connection. It only accepts EP **draft** documents and never publishes them.

Implemented and tested with an in-memory test double:
- Explicit trusted pricing-manager principal required before reads.
- Integer revision checks and atomic compare-and-swap contract to prevent lost edits.
- Category/date uniqueness, ISO date and existing EP draft amount validation.
- One atomic document + audit transaction required from an adapter.
- Complete before/after snapshots with server-principal actor and mandatory reason.
- Defensive cloning and failure propagation.

## Mandatory adapter work before use

The principal argument is NOT authentication: an HTTP adapter must derive it from verified session and database-authorized role, never request fields. Validate request schema and payload size, category existence/permissions and override authorization separately. Override actor text in imported drafts is NOT trusted audit identity; only the verified principal is the save actor.

Implement a private draft document store with RLS and the repository's append-only generic admin audit trigger. Use one transaction for conditional revision write and audit, enforcing uniqueness in SQL. The TypeScript interface cannot guarantee database atomicity or audit immutability. It must reject revision 0 if a record already exists. Do not use separate read/update calls as a replacement for compare-and-swap. Audit timestamps must come from the database. Test concurrent sessions and authenticated/anonymous/non-admin access in an isolated database.

No local Postgres, Docker, psql or Supabase CLI runtime was available in this executor. Consequently no schema or migration is added, and no RLS/database/concurrency-in-Postgres pass is claimed. The in-memory race test verifies the service's use of an adapter, not database isolation.

Drafts may have missing meal supplements so staff can save work in progress. Draft validation is deliberately NOT a publication or checkout validator. Real rates, festive exclusions, occupancy/meal policy, tax and override ordering rules still require confirmation and authoritative resolution. Do not import draft JSON directly into live pricing.
