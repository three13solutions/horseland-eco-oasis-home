import { InventoryPaymentError, type PaymentIntent } from './distributionPaymentCoordinator.ts';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DOMAIN = 'horseland:distribution-checkout:v1:';
const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const decode = (s: string) => Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')), c => c.charCodeAt(0));
async function hmacKey(secret: string) { if (!secret) throw new Error('Checkout signing key unavailable'); return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign','verify']); }
export async function issueCheckoutCapability(requestId: string, secret: string): Promise<string> {
  if (!UUID.test(requestId)) throw new InventoryPaymentError('INVALID_REQUEST_ID','A stable checkout request ID is required.');
  const payload = encode(new TextEncoder().encode(JSON.stringify({v:1,request_id:requestId,nonce:encode(crypto.getRandomValues(new Uint8Array(32)))})));
  const signature = encode(new Uint8Array(await crypto.subtle.sign('HMAC',await hmacKey(secret),new TextEncoder().encode(DOMAIN+payload))));
  return `v1.${payload}.${signature}`;
}
export async function verifyCheckoutCapability(token: unknown, requestId: unknown, secret: string): Promise<string> {
  try {
    if (typeof token!=='string'||token.length>1024||typeof requestId!=='string'||!UUID.test(requestId)) throw new Error();
    const [version,payload,signature,...rest]=token.split('.');
    if(version!=='v1'||rest.length||!payload||!signature)throw new Error();
    const valid=await crypto.subtle.verify('HMAC',await hmacKey(secret),decode(signature),new TextEncoder().encode(DOMAIN+payload));
    const parsed=JSON.parse(new TextDecoder().decode(decode(payload)));
    if(!valid||parsed.v!==1||parsed.request_id!==requestId||!/^[-\w]{43}$/.test(parsed.nonce))throw new Error();
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
    return 'capability:'+Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
  }catch{throw new InventoryPaymentError('CHECKOUT_IDENTITY_REQUIRED','This checkout could not be verified. Recover the original checkout or contact the hotel; do not pay again.');}
}
function text(value: unknown,max:number,required=false):string|null { if(value===undefined||value===null||value===''){if(required)throw new InventoryPaymentError('GUEST_DETAILS_REQUIRED','Complete your contact details before paying.');return null;} if(typeof value!=='string'||value.trim().length>max||Array.from(value).some(c => { const n=c.charCodeAt(0); return n<32 && ![9,10,13].includes(n); }))throw new InventoryPaymentError('INVALID_GUEST_DETAILS','Contact details are invalid.');const normalized=value.trim();if(required&&!normalized)throw new InventoryPaymentError('GUEST_DETAILS_REQUIRED','Complete your contact details before paying.');return normalized||null; }
export function normalizeBookingMetadata(raw: unknown, notes: unknown) {
  if(!raw||typeof raw!=='object')throw new InventoryPaymentError('GUEST_DETAILS_REQUIRED','Guest details are required before paying.');
  const g=raw as Record<string,unknown>;
  const first_name=text(g.first_name,100,true),last_name=text(g.last_name,100)||'',email=text(g.email,254,true),phone=text(g.phone,25,true);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email!)||!/^[+\d\s()-]{7,25}$/.test(phone!))throw new InventoryPaymentError('INVALID_GUEST_DETAILS','Enter a valid email and phone number.');
  const id_type=text(g.id_type,50),id_number=text(g.id_number,100),gender=text(g.gender,30);
  if(gender&&!['male','female','other','prefer_not_to_say'].includes(gender))throw new InventoryPaymentError('INVALID_GUEST_DETAILS','Select a valid gender option.');
  if(id_type&&!['aadhar','passport','voter_id','driving_license','pan_card'].includes(id_type))throw new InventoryPaymentError('INVALID_GUEST_DETAILS','Select a valid identity document type.');
  if(Boolean(id_type)!==Boolean(id_number))throw new InventoryPaymentError('INVALID_GUEST_DETAILS','Provide both identity document type and number, or neither.');
  return {guest:{first_name,last_name,email:email!.toLowerCase(),phone,gender,id_type,id_number},notes:text(notes,2000)};
}
function canonical(value: unknown): string { if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';return '{'+Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}'; }
export function assertResumeMatches(intent: PaymentIntent, input: {request: unknown; metadata: unknown; amount: unknown; fingerprint: unknown}) {
  const q=intent.quoteSnapshot as Record<string,unknown>;
  if(canonical(q.request)!==canonical(input.request)||canonical(intent.bookingMetadata)!==canonical(input.metadata)||typeof input.amount!=='number'||Math.round(input.amount*100)!==intent.amountPaise||input.fingerprint!==intent.quoteFingerprint)throw new InventoryPaymentError('CHECKOUT_SELECTION_CHANGED','This checkout already has a different reserved selection. Do not create another payment until it is reconciled.');
}
