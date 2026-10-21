import {notFound} from "next/navigation";
import {isLocale} from "../../_lib/i18n/routing";
import {CatalogShell} from "../../_components/catalog/catalog-shell";
import {StorefrontCartPanel} from "../../_components/commerce/storefront-cart-panel";
type Props={params:Promise<{locale:string}>};
/** Non-transactional checkout review: no order, inventory, PSP or card collection. */
export default async function CheckoutPage({params}:Props){
 const {locale}=await params;
 if(!isLocale(locale))notFound();
 return <CatalogShell locale={locale} active="bikes"><StorefrontCartPanel locale={locale} mode="checkout" /></CatalogShell>;
}
