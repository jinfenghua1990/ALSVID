"use client";
import { useEffect,useState } from "react";
import { CART_CHANGE_EVENT, cartQuantity,readStorefrontCart } from "../../_lib/commerce/storefront-cart";
import { translator,type Locale } from "../../_lib/i18n";
import styles from "./cart-header-link.module.css";

export function CartHeaderLink({locale,mobile=false}:{locale:Locale;mobile?:boolean}) {
 const t=translator(locale);
 const [quantity,setQuantity]=useState(0);
 useEffect(()=>{
  const update=()=>setQuantity(cartQuantity(readStorefrontCart()));
  update();window.addEventListener(CART_CHANGE_EVENT,update);window.addEventListener("storage",update);
  return ()=>{window.removeEventListener(CART_CHANGE_EVENT,update);window.removeEventListener("storage",update);};
 },[]);
 return <a href={"/"+locale+"/cart"} className={mobile?styles.mobileLink:styles.link}
   aria-label={quantity?t("catalog.cart.nav")+" "+quantity:t("catalog.cart.nav")} data-site-cart>
   {!mobile?<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8h14l1 12H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>:null}
   <span>{t("catalog.cart.nav")}</span>{quantity>0?<strong className={styles.count} aria-live="polite">{quantity}</strong>:null}
 </a>;
}
