import {translator,type Locale} from "../../_lib/i18n";
import styles from "./pending-purchase-actions.module.css";
/** Visible product-level controls, disabled until a real SKU/price/payment is approved. */
export function PendingPurchaseActions({locale}:{locale:Locale}){
 const t=translator(locale);
 return <div className={styles.wrap} data-purchase-disabled="true">
  <div className={styles.actions}>
   <button type="button" disabled>{t("catalog.cart.add")}</button>
   <button type="button" disabled>{t("catalog.cart.buyNow")}</button>
  </div>
  <p>{t("catalog.cart.notForSale")}</p>
  <a href={"/"+locale+"/cart"}>{t("catalog.cart.view")}</a>
 </div>;
}
