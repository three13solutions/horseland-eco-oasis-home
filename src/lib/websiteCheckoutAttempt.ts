// This opaque capability is scoped to one checkout, not an account password.
// Never log it or place it in URLs. No guest identity/contact details are stored.
export const WEBSITE_CHECKOUT_KEY = 'horseland.websiteCheckoutAttempt.v1';
export type WebsiteCheckoutAttempt = {
  version: 1;
  requestId: string;
  selectionKey: string;
  checkoutToken: string | null;
  orderId: string | null;
  state: 'session' | 'preparing' | 'ready' | 'paid';
  createdAt: string;
};
export type WebsiteCheckoutContext = { requestId: string; checkoutToken: string };
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const storageError = () => new Error('This browser cannot safely retain your checkout reference. Enable browser storage or contact the hotel before paying.');
const storageFor = (storage?: StorageLike) => storage ?? window.localStorage;

export function readWebsiteCheckout(storage?: StorageLike): WebsiteCheckoutAttempt | null {
  let raw: string | null;
  try { raw = storageFor(storage).getItem(WEBSITE_CHECKOUT_KEY); } catch { throw storageError(); }
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (value.version !== 1 || typeof value.requestId !== 'string' ||
        !/^[0-9a-f-]{36}$/i.test(value.requestId) || typeof value.selectionKey !== 'string' ||
        !/^[0-9a-f]{64}$/i.test(value.selectionKey) ||
        !['session', 'preparing', 'ready', 'paid'].includes(value.state) ||
        !(value.checkoutToken === null || typeof value.checkoutToken === 'string') ||
        !(value.orderId === null || typeof value.orderId === 'string') ||
        typeof value.createdAt !== 'string' ||
        (value.state !== 'session' && !value.checkoutToken) ||
        (['ready', 'paid'].includes(value.state) && !value.orderId)) throw new Error();
    return { version: 1, requestId: value.requestId, selectionKey: value.selectionKey,
      checkoutToken: value.checkoutToken, orderId: value.orderId, state: value.state, createdAt: value.createdAt };
  } catch {
    throw new Error('A saved checkout reference cannot be read safely. Contact the hotel before starting another payment.');
  }
}

export function writeWebsiteCheckout(value: WebsiteCheckoutAttempt, storage?: StorageLike): void {
  try {
    const target = storageFor(storage); const raw = JSON.stringify(value);
    target.setItem(WEBSITE_CHECKOUT_KEY, raw);
    if (target.getItem(WEBSITE_CHECKOUT_KEY) !== raw) throw new Error();
  } catch { throw storageError(); }
}

export function getOrCreateWebsiteCheckout(selectionKey: string, storage?: StorageLike, makeId = () => crypto.randomUUID()): WebsiteCheckoutAttempt {
  const previous = readWebsiteCheckout(storage);
  if (previous) {
    if (previous.state === 'paid') throw new Error('A payment is awaiting confirmation. Do not pay again; contact the hotel with your existing order reference.');
    if (previous.selectionKey === selectionKey) return previous;
    if (previous.state !== 'session') throw new Error('An earlier checkout is still holding inventory. Resume the same selection or contact the hotel to reconcile it before making a different payment.');
  }
  const value: WebsiteCheckoutAttempt = { version: 1, requestId: makeId(), selectionKey,
    checkoutToken: null, orderId: null, state: 'session', createdAt: new Date().toISOString() };
  writeWebsiteCheckout(value, storage);
  return value;
}

export function updateWebsiteCheckout(requestId: string, change: Partial<Pick<WebsiteCheckoutAttempt, 'checkoutToken' | 'orderId' | 'state'>>, storage?: StorageLike): WebsiteCheckoutAttempt {
  const current = readWebsiteCheckout(storage);
  if (!current || current.requestId !== requestId) throw new Error('Checkout changed in another window. Do not start another payment; review the saved checkout first.');
  if (current.state === 'paid' && change.state && change.state !== 'paid') throw new Error('A payment is already awaiting confirmation.');
  const next = { ...current, ...change };
  writeWebsiteCheckout(next, storage);
  return next;
}

export function clearConfirmedWebsiteCheckout(requestId: string, storage?: StorageLike): boolean {
  try {
    const current = readWebsiteCheckout(storage);
    if (current?.requestId === requestId) storageFor(storage).removeItem(WEBSITE_CHECKOUT_KEY);
    return true;
  } catch { return false; }
}

export function discardSafelyRejectedWebsiteCheckout(requestId: string, evidence: unknown, storage?: StorageLike): boolean {
  if (!evidence || typeof evidence !== 'object' || !('safe_to_change_selection' in evidence) ||
      evidence.safe_to_change_selection !== true || !('request_id' in evidence) || evidence.request_id !== requestId) return false;
  const current = readWebsiteCheckout(storage);
  if (!current || current.requestId !== requestId || current.orderId || current.state === 'paid') return false;
  // Server attests that this request is permanently fenced and never created
  // a hold/intent/provider order. A timeout, HTTP status or clock is not evidence.
  storageFor(storage).removeItem(WEBSITE_CHECKOUT_KEY);
  return true;
}

export async function checkoutErrorBody(data: unknown, error: unknown): Promise<Record<string, unknown> | null> {
  if (data && typeof data === 'object') return data as Record<string, unknown>;
  if (error && typeof error === 'object' && 'context' in error && error.context instanceof Response) {
    try { return await error.context.clone().json(); } catch { /* An uncertain response never authorizes a release. */ }
  }
  return null;
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  return value;
}
export async function checkoutSelectionKey(value: unknown): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(canonical(value))));
  return Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function withWebsiteCheckoutLock<T>(action: () => Promise<T>): Promise<T> {
  // Web Locks serialize this browser's tabs; the backend independently fences
  // duplicate requests and atomically protects actual unit/category inventory.
  if (typeof navigator !== 'undefined' && navigator.locks) return navigator.locks.request('horseland.website.checkout', action);
  return action();
}
