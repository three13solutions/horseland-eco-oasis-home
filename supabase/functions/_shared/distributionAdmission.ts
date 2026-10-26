import {InventoryPaymentError} from './distributionPaymentCoordinator.ts';
function canonicalIp(value:string|null):string|null{
 if(!value||value.includes(',')||value.length>64)return null;
 const ip=value.trim();
 if(/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)){const parts=ip.split('.').map(Number);return parts.every(n=>n>=0&&n<=255)?parts.join('.'):null;}
 if(/^[a-f\d:]+$/i.test(ip)&&ip.includes(':')){try{return new URL(`http://[${ip}]/`).hostname.slice(1,-1).toLowerCase();}catch{return null;}}
 return null;
}
async function digest(secret:string,scope:string,value:string):Promise<string>{
 if(!secret)throw new InventoryPaymentError('CHECKOUT_UNAVAILABLE','Checkout protection is unavailable. Please contact the hotel.');
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`horseland:distribution:${scope}:v1:${value}`)))).map(x=>x.toString(16).padStart(2,'0')).join('');
}
/** Defense in depth, not proof of human identity. Cloudflare gateway behavior must
 * be verified for the deployed route. Missing/ambiguous metadata shares a bounded
 * capability-scoped bucket (not verified human/IP identity); never trust client-provided source IDs or X-Forwarded-For. */
export async function admissionIdentity(headers:Headers,metadata:{guest:{email:string|null;phone:string|null}},secret:string,ownerScope:string,trustedGatewayHeaders=false){
 if(!/^capability:[a-f0-9]{64}$/.test(ownerScope))throw new InventoryPaymentError('INVALID_CHECKOUT_TOKEN','A verified checkout capability is required.');
 const ip=canonicalIp(headers.get('cf-connecting-ip'));
 const sourceVerified=Boolean(trustedGatewayHeaders&&ip&&/^[a-f\d]{16,32}-[A-Z]{3}$/i.test(headers.get('cf-ray')??''));
 const source=sourceVerified?ip!:`unverified-capability:${ownerScope}`;
 return {sourceKey:await digest(secret,'source',source),contactKey:await digest(secret,'contact',`${metadata.guest.email?.toLowerCase()??''}|${metadata.guest.phone?.replace(/\D/g,'')??''}`),sourceVerified};
}
