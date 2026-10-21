"use client";

import { useEffect,useState } from "react";
import { translator,type Locale,type TranslationKey } from "../../_lib/i18n";
import { CART_CHANGE_EVENT,readStorefrontCart,cartQuantity,clearStorefrontCart,lineKey,removeCartLine,setCartLineQuantity,type StorefrontCart } from "../../_lib/commerce/storefront-cart";
import styles from "./storefront-cart-panel.module.css";

const colorKeys:Record<string,TranslationKey>={sample:"fc1.colours.sample",black:"fc1.colours.black",blue:"fc1.colours.blue",silver:"fc1.colours.silver"};

export function StorefrontCartPanel({locale,mode}:{locale:Locale;mode:"cart"|"checkout"}) {
 const t=translator(locale);
 const [ready,setReady]=useState(false);
 const [cart,setCart]=useState<StorefrontCart>({version:1,items:[]});
 const [error,setError]=useState(false);
 useEffect(()=>{
  const update=()=>setCart(readStorefrontCart());
  update();setReady(true);
  window.addEventListener(CART_CHANGE_EVENT,update);window.addEventListener("storage",update);
  return ()=>{window.removeEventListener(CART_CHANGE_EVENT,update);window.removeEventListener("storage",update);};
 },[]);
 const mutate=(action:()=>boolean)=>{
  if(!action())setError(true);else {setError(false);setCart(readStorefrontCart());}
 };
 return <main className={styles.page} data-storefront-cart={mode}>
  <div className={styles.shell}>
   <div className={styles.intro}>
    <p className={styles.eyebrow}>ALSVID / {mode==="cart"?"BAG":"CHECKOUT"}</p>
    <h1>{t(mode==="cart"?"catalog.cart.title":"catalog.cart.checkoutTitle")}</h1>
    <p>{t("catalog.cart.previewNotice")}</p>
   </div>
   {!ready?<p role="status">{t("catalog.cart.loading")}</p>:cart.items.length===0?<div className={styles.empty}>
      <p>{t("catalog.cart.empty")}</p><a href={"/"+locale+"/bikes"}>{t("catalog.cart.continue")}</a>
    </div>:<div className={styles.layout}>
      <div className={styles.lines}>
       {cart.items.map(item=>{
        const title=item.product==="FC1"?"ALSVID FC1 "+(item.model==="standard"?"Standard":"Pro"):
          item.product==="FC2"?"ALSVID FC2":t(("accessories."+item.category+".title") as TranslationKey);
        const detail=item.product==="FC1"?"/"+locale+"/explore/fc1#configure":
          item.product==="FC2"?"/"+locale+"/explore/fc2#availability":
          "/"+locale+"/explore/accessory-"+item.category;
        return <article key={lineKey(item)} className={styles.line} data-cart-product={item.product}>
         <a href={detail} className={styles.productImage} aria-label={title}>
          {item.product==="ACCESSORY"?
            <span className={styles.categoryImage} aria-hidden="true"><strong>ALSVID</strong><small>{t("catalog.product.tabs.accessories")}</small></span>:
            <img src={item.product==="FC1"?"/home/original/fc1-product.webp":"/products/fc2/side-studio-768.webp"} width={360} height={240} alt={title}/>}
         </a>
         <div className={styles.lineCopy}>
          <h2><a href={detail}>{title}</a></h2>
          {item.product==="FC1"?<p>{t(colorKeys[item.colour]!)}</p>:<p>{t("catalog.cart.selectionConcept")}</p>}
          <p className={styles.pending}>{t("catalog.cart.notForSale")}</p>
          {mode==="cart"?<div className={styles.controls}>
           <label>{t("catalog.cart.quantity")}</label>
           <button type="button" aria-label={t("fc1.cart.decrease")} disabled={item.quantity<=1} onClick={()=>mutate(()=>setCartLineQuantity(lineKey(item),item.quantity-1))}>−</button>
           <strong aria-live="polite">{item.quantity}</strong>
           <button type="button" aria-label={t("fc1.cart.increase")} disabled={item.quantity>=9} onClick={()=>mutate(()=>setCartLineQuantity(lineKey(item),item.quantity+1))}>+</button>
           <button type="button" className={styles.remove} onClick={()=>mutate(()=>removeCartLine(lineKey(item)))}>{t("catalog.cart.remove")}</button>
          </div>:<p className={styles.reviewQty}>{t("catalog.cart.quantity")} × {item.quantity}</p>}
         </div>
        </article>;
       })}
       {error?<p className={styles.error} role="alert">{t("catalog.cart.storageError")}</p>:null}
      </div>
      <aside className={styles.summary}>
       <h2>{t("catalog.cart.summary")}</h2>
       <div className={styles.summaryRow}><span>{t("catalog.cart.quantity")}</span><strong>{cartQuantity(cart)}</strong></div>
       <div className={styles.summaryRow}><span>{t("catalog.cart.total")}</span><strong>{t("catalog.cart.pricePending")}</strong></div>
       <p>{t("catalog.cart.checkoutUnavailable")}</p>
       <button type="button" disabled className={styles.disabledBuy}>{t("catalog.cart.buyNow")}</button>
       {mode==="cart"?<a className={styles.primary} href={"/"+locale+"/checkout"}>{t("catalog.cart.review")}</a>:<a className={styles.primary} href={"/"+locale+"/cart"}>{t("catalog.cart.back")}</a>}
       <a className={styles.continue} href={"/"+locale+"/bikes"}>{t("catalog.cart.continue")}</a>
       {mode==="cart"?<button type="button" className={styles.clear} onClick={()=>mutate(clearStorefrontCart)}>{t("catalog.cart.clear")}</button>:null}
      </aside>
    </div>}
  </div>
 </main>;
}
