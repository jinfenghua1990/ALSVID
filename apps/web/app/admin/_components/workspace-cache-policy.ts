/** Next.js owns a bounded three-route Activity cache when cacheComponents is enabled.
 * This policy only prevents our Admin soft navigation from handling unsafe paths. */
export function isSafeAdminRoute(raw:string):boolean{
  if(typeof raw!=='string'||!raw.startsWith('/')||raw.startsWith('//')||raw.includes('\\'))return false;
  try{
    const url=new URL(raw,'https://alsvid.invalid');
    return url.origin==='https://alsvid.invalid' &&
       (url.pathname==='/admin'||url.pathname.startsWith('/admin/'));
  }catch{return false;}
}
