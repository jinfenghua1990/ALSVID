import {notFound} from "next/navigation";
import {isLocale} from "../../_lib/i18n/routing";
import {CatalogShell} from "../../_components/catalog/catalog-shell";
import {StorefrontCartPanel} from "../../_components/commerce/storefront-cart-panel";
type Props={params:Promise<{locale:string}>};
export default async function CartPage({params}:Props){
 const {locale}=await params;
 if(!isLocale(locale))notFound();
 return <CatalogShell locale={locale} active="bikes"><StorefrontCartPanel locale={locale} mode="cart" /></CatalogShell>;
}
