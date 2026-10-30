import type { InventoryPaymentProvider, ProviderOrder, ProviderPayment } from './distributionPaymentCoordinator.ts';
type CredentialQuery = {eq(column:string,value:unknown):CredentialQuery;single():PromiseLike<{data:unknown;error?:unknown}>};
type CredentialDb = {from(table:string):{select(columns:string):CredentialQuery}};
type Integration = {api_integration_secrets?:{key:string;value_encrypted:string}[]};
type Env = (name:string)=>string|undefined;
// Preserves the deployed encrypted integration/env precedence. Credentials never leave the server.
export async function getDistributionRazorpayCredentials(db: CredentialDb, env: Env): Promise<{keyId:string;secret:string}> {
 try {
  const {data:integration}=await db.from('api_integrations').select('id,is_enabled,api_integration_secrets(key,value_encrypted)').eq('integration_key','razorpay').eq('is_enabled',true).single();
  const saved=integration as Integration|null;
  const encryptionKey=env('INTEGRATIONS_ENCRYPTION_KEY');
  if(saved?.api_integration_secrets && encryptionKey){
   const credentials:Record<string,string>={};
   for(const secret of saved.api_integration_secrets){
    try{const encrypted=JSON.parse(atob(secret.value_encrypted));const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(encryptionKey.padEnd(32,'0').slice(0,32)),{name:'AES-GCM'},false,['decrypt']);const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(encrypted.iv)},key,new Uint8Array(encrypted.data));credentials[secret.key]=new TextDecoder().decode(plain);}catch{/* Fall back only to existing environment settings, never log secret contents. */}
   }
   if(credentials.RAZORPAY_KEY_ID&&credentials.RAZORPAY_SECRET)return {keyId:credentials.RAZORPAY_KEY_ID,secret:credentials.RAZORPAY_SECRET};
  }
 }catch{/* Existing deployment permits environment fallback. */}
 const keyId=env('RAZORPAY_KEY_ID'),secret=env('RAZORPAY_SECRET');
 if(!keyId||!secret)throw new Error('Payment configuration is unavailable.');
 return {keyId,secret};
}
export function createDistributionRazorpayProvider(credentials:{keyId:string;secret:string}, request:typeof fetch=fetch):InventoryPaymentProvider & { listOrderPayments(id:string):Promise<{items:ProviderPayment[]}>;findOrdersByReceipt(receipt:string,skip:number,count:number):Promise<{items:ProviderOrder[]}>;listOrders(skip:number,count:number,to:number):Promise<{items:(ProviderOrder&{created_at:number})[]}> } {
 const call=async<T>(path:string,body?:unknown):Promise<T>=>{
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
  try{const response=await request('https://api.razorpay.com/v1/'+path,{method:body?'POST':'GET',headers:{Authorization:`Basic ${btoa(`${credentials.keyId}:${credentials.secret}`)}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal});if(!response.ok)throw new Error('Provider response was not confirmed.');return await response.json() as T;}finally{clearTimeout(timer);}
 };
 // Orders auto-capture; an "authorized" payment (capture still pending) is captured explicitly so a verified payment is never left unmatched.
 const getPayment=async(id:string):Promise<ProviderPayment>=>{const path='payments/'+encodeURIComponent(id);const payment=await call<ProviderPayment>(path);if(payment.status!=='authorized')return payment;try{return await call<ProviderPayment>(path+'/capture',{amount:payment.amount,currency:payment.currency});}catch{return await call<ProviderPayment>(path);}};
 return {createOrder:input=>call<ProviderOrder>('orders',{...input,payment_capture:1}),getOrder:id=>call<ProviderOrder>('orders/'+encodeURIComponent(id)),getPayment,listOrderPayments:id=>call<{items:ProviderPayment[]}>('orders/'+encodeURIComponent(id)+'/payments'),findOrdersByReceipt:(receipt,skip,count)=>call<{items:ProviderOrder[]}>(`orders?receipt=${encodeURIComponent(receipt)}&skip=${skip}&count=${count}`),listOrders:(skip,count,to)=>call<{items:(ProviderOrder&{created_at:number})[]}>(`orders?skip=${skip}&count=${count}&to=${to}`)};
}
export async function verifyDistributionPaymentSignature(secret:string,orderId:string,paymentId:string,signature:string):Promise<boolean>{
 if(!/^[a-f0-9]{64}$/i.test(signature))return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 return crypto.subtle.verify('HMAC',key,Uint8Array.from(signature.match(/.{2}/g)!,s=>parseInt(s,16)),new TextEncoder().encode(`${orderId}|${paymentId}`));
}
