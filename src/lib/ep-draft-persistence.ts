/** Isolated draft persistence boundary, NOT a deployed API or database adapter.
 * Callers must derive principal from verified server authentication/authorization.
 * An adapter must atomically compare revision, write document and append audit.
 */
import { previewDraftRate, selectDates } from './rate-calendar-draft.ts';
import type { DraftRate } from './rate-calendar-draft.ts';

export interface DraftDocument {
  id: string;
  revision: number;
  basis: 'EP';
  status: 'draft';
  rates: DraftRate[];
}
export interface DraftPrincipal { actorId: string; canManagePricing: boolean }
export interface DraftAudit {
  draftId: string; actorId: string; reason: string;
  fromRevision: number; toRevision: number;
  before: DraftDocument | null; after: DraftDocument;
}
export interface DraftStore {
  read(id: string): Promise<DraftDocument | null>;
  /** MUST be one transaction including audit. false means revision conflict.
   * Expected revision 0 means document does not exist; never an unconditional upsert.
   */
  compareAndSwap(id: string, expectedRevision: number, document: DraftDocument, audit: DraftAudit): Promise<boolean>;
}
function nonempty(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > 500) throw new Error(`Invalid ${label}.`);
}
/** Whole-document replacement of DRAFTS only; transport/auth adapter intentionally absent. */
export async function saveEpDraft(store: DraftStore, principal: DraftPrincipal, input: {
  id: string; expectedRevision: number; reason: string; rates: DraftRate[];
}): Promise<DraftDocument> {
  if (principal?.canManagePricing !== true) throw new Error('Pricing authorization required.');
  nonempty(principal.actorId, 'actor');
  nonempty(input.id, 'draft ID');
  nonempty(input.reason, 'audit reason');
  if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0 || input.expectedRevision === Number.MAX_SAFE_INTEGER) throw new Error('Invalid revision.');
  if (!Array.isArray(input.rates) || !input.rates.length || input.rates.length > 10000) throw new Error('Draft must contain 1–10000 rate rows.');
  const rates = structuredClone(input.rates);
  const keys = new Set<string>();
  for (const rate of rates) {
    nonempty(rate.categoryId, 'category');
    selectDates(rate.date, rate.date);
    const key = JSON.stringify([rate.categoryId, rate.date]);
    if (keys.has(key)) throw new Error('Duplicate category/date.');
    keys.add(key);
    previewDraftRate(rate); // Missing meals may be saved in a draft, never published.
  }
  const previous = await store.read(input.id);
  if ((previous?.revision ?? 0) !== input.expectedRevision) throw new Error('Draft changed; reload before saving.');
  if (previous && (previous.status !== 'draft' || previous.basis !== 'EP')) throw new Error('Only EP draft documents may be replaced.');
  const document: DraftDocument = { id: input.id, revision: input.expectedRevision + 1, basis: 'EP', status: 'draft', rates };
  const audit: DraftAudit = { draftId: input.id, actorId: principal.actorId, reason: input.reason.trim(), fromRevision: input.expectedRevision, toRevision: document.revision, before: structuredClone(previous), after: structuredClone(document) };
  if (!await store.compareAndSwap(input.id, input.expectedRevision, structuredClone(document), audit)) throw new Error('Draft changed; reload before saving.');
  return document;
}
