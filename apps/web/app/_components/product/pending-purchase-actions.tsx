"use client";

import {useState} from "react";
import {translator,type Locale} from "../../_lib/i18n";
import {addCartLine,type AccessoryCategory} from "../../_lib/commerce/storefront-cart";
import styles from "./pending-purchase-actions.module.css";

type PreviewSelection = {product:"FC2"} | {product:"ACCESSORY";category:AccessoryCategory};

/**
 * Saves a non-binding product/category interest selection locally.
 * No verified SKU, price, stock, variant, compatibility or payment here.
 */
export function PendingPurchaseActions({locale,selection}:{locale:Locale;selection:PreviewSelection}){
 const t=translator(locale);
 const [quantity,setQuantity]=useState(1);
 const [status,setStatus]=useState<"idle"|"added"|"failed">("idle");
 const add=()=>{
  const success=addCartLine({...selection,quantity});
  setStatus(success?"added":"failed");
 };
 return <div className={styles.wrap} data-preview-selection={selection.product==="FC2"?"fc2":"accessory-"+selection.category}>
  <label className={styles.quantityLabel}>
    {t("catalog.cart.quantity")}
    <select aria-label={t("catalog.cart.quantity")} value={quantity} onChange={event=>{setQuantity(Number(event.target.value));setStatus("idle");}}>
      {Array.from({length:9},(_,i)=>i+1).map(value=><option key={value} value={value}>{value}</option>)}
    </select>
  </label>
  <div className={styles.actions}>
   <button type="button" className={styles.add} onClick={add}>{t("catalog.cart.add")}</button>
   <button type="button" disabled title={t("catalog.cart.checkoutUnavailable")}>{t("catalog.cart.buyNow")}</button>
  </div>
  <p role="status">{status==="added"?<>{t("catalog.cart.added")} <a href={"/"+locale+"/cart"}>{t("catalog.cart.view")}</a></>:status==="failed"?t("catalog.cart.storageError"):t("catalog.cart.previewSelection")}</p>
 </div>;
}
