import {notFound,redirect} from 'next/navigation';
import {isLocale} from '../../../_lib/i18n/routing';
export default async function Page({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;if(!isLocale(locale))notFound();redirect('/'+locale+'/shop-preview');
}
