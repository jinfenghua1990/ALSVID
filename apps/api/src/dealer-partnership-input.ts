/** Strict, bounded validation for untrusted public dealer applications. */
export type DealerApplicationInput = {
 clientRequestId: string; companyName: string; contactName: string; email: string;
 country: 'DE' | 'AT' | 'OTHER'; partnershipType: 'retail'|'demo'|'service'|'multiple';
 website: string | null; message: string | null; locale: 'zh'|'de'|'en';
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
function safeText(value: unknown, max: number): string | null {
 if(typeof value !== 'string') return null;
 const trimmed=value.trim();
 return trimmed.length <= max && !/[\u0000-\u001f\u007f]/.test(trimmed)?trimmed:null;
}
export function normalizeDealerApplication(value: unknown): DealerApplicationInput | null {
 if(!value || typeof value !== 'object' || Array.isArray(value)) return null;
 const input=value as Record<string,unknown>;
 if(input.consent !== true || (input.nickname !== undefined && input.nickname !== '')) return null;
 if(typeof input.clientRequestId !== 'string' || !UUID.test(input.clientRequestId)) return null;
 const companyName=safeText(input.companyName,160);
 const contactName=safeText(input.contactName,120);
 const email=safeText(input.email,254)?.toLowerCase();
 const message=input.message === '' || input.message == null?null:safeText(input.message,1600);
 if(!companyName || companyName.length<2 || !contactName || contactName.length<2 || !email ||
    !MAIL.test(email) || (input.message != null && input.message !== '' && message === null)) return null;
 if(input.country !== 'DE' && input.country !== 'AT' && input.country !== 'OTHER') return null;
 if(input.partnershipType !== 'retail' && input.partnershipType !== 'demo' &&
    input.partnershipType !== 'service' && input.partnershipType !== 'multiple') return null;
 if(input.locale !== 'zh' && input.locale !== 'de' && input.locale !== 'en') return null;
 let website: string | null = null;
 if(input.website) {
  const raw=safeText(input.website,240);
  if(!raw)return null;
  try {
   const parsed=new URL(raw);
   if(!['http:','https:'].includes(parsed.protocol) || !parsed.hostname.includes('.') || parsed.username || parsed.password)return null;
   website=parsed.toString();
   if(website.length>240)return null;
  } catch{return null;}
 }
 return {clientRequestId:input.clientRequestId.toLowerCase(),companyName,contactName,email,
  country:input.country,partnershipType:input.partnershipType,website,message,locale:input.locale};
}
export type PublicDealerLocation = {
 id:string;name:string;country:'DE'|'AT';city:string;address:string;sales:boolean;service:boolean;
};
export function publicDealerLocation(row:{
 id:string;display_name:string;country_code:'DE'|'AT';city:string;address:string;
 sales_authorized:boolean;service_authorized:boolean;
}):PublicDealerLocation {
 return {id:row.id,name:row.display_name,country:row.country_code,city:row.city,address:row.address,
  sales:row.sales_authorized,service:row.service_authorized};
}
