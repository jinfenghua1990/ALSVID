"use client";

import { useEffect, useState } from "react";
import { translator, type Locale, type TranslationKey } from "../../_lib/i18n";
import {
  clearFc1PreviewCart,
  readFc1PreviewCart,
  saveFc1PreviewCart,
  type Fc1PreviewCart,
  type Fc1PreviewColour,
} from "../../_lib/commerce/preview-cart";
import { fc1Photos } from "./fc1-photos";
import styles from "./fc1-preview-cart-panel.module.css";

const COLOUR_KEYS: Record<Fc1PreviewColour, TranslationKey> = {
  sample: "fc1.colours.sample",
  black: "fc1.colours.black",
  blue: "fc1.colours.blue",
  silver: "fc1.colours.silver",
};

/**
 * Simulates a cart/order review in the current browser tab only.
 * The payment action is deliberately disabled; no network requests are made.
 */
export function Fc1PreviewCartPanel({ locale, mode }: { locale: Locale; mode: "cart" | "checkout" }) {
  const t = translator(locale);
  const [cart, setCart] = useState<Fc1PreviewCart | null>(null);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setCart(readFc1PreviewCart());
    setReady(true);
  }, []);

  const changeQuantity = (quantity: number) => {
    if (!cart || quantity < 1 || quantity > 9) return;
    const next = { ...cart, quantity };
    if (saveFc1PreviewCart(next)) {
      setCart(next);
      setMessage(null);
    } else {
      setMessage(t("fc1.cart.storage_error"));
    }
  };

  const remove = () => {
    if (clearFc1PreviewCart()) {
      setCart(null);
      setMessage(null);
    } else {
      setMessage(t("fc1.cart.storage_error"));
    }
  };

  return (
    <section className={styles.container} data-cart-preview={mode} aria-label={t("fc1.cart.title")}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>{t("fc1.cart.preview")}</p>
          <h2>{mode === "cart" ? t("fc1.cart.title") : t("fc1.cart.order_review")}</h2>
        </div>
        <span className={styles.count}>{ready && cart ? `${cart.quantity} × A1 Ultra` : "ALSVID A1 Ultra"}</span>
      </div>

      {!ready ? (
        <p className={styles.placeholder} role="status">{t("fc1.cart.loading")}</p>
      ) : !cart ? (
        <div className={styles.empty}>
          <p>{t("fc1.cart.empty")}</p>
          <a className={styles.secondaryLink} href={`/${locale}/explore/fc1#configure`}>
            {t("fc1.cart.back_config")}
          </a>
        </div>
      ) : (
        <>
          <div className={styles.productRow}>
            <div className={styles.image}>
              <img {...fc1Photos.side} alt={t("fc1.photo.alt")} />
            </div>
            <div className={styles.productCopy}>
              <p className={styles.kicker}>ALSVID / FOLDING CARBON</p>
              <h3>A1 Ultra {cart.model === "standard" ? "Standard" : "Pro"}</h3>
              <p>{t(COLOUR_KEYS[cart.colour])}</p>
              <span className={styles.disclosure}>{t("fc1.cart.colour_note")}</span>
            </div>
            {mode === "cart" ? (
              <div className={styles.quantityColumn}>
                <span>{t("fc1.cart.quantity")}</span>
                <div className={styles.quantityControl}>
                  <button type="button" disabled={cart.quantity <= 1} aria-label={t("fc1.cart.decrease")} onClick={() => changeQuantity(cart.quantity - 1)}>−</button>
                  <strong aria-live="polite">{cart.quantity}</strong>
                  <button type="button" disabled={cart.quantity >= 9} aria-label={t("fc1.cart.increase")} onClick={() => changeQuantity(cart.quantity + 1)}>+</button>
                </div>
                <button className={styles.remove} type="button" onClick={remove}>{t("fc1.cart.remove")}</button>
              </div>
            ) : (
              <div className={styles.reviewQuantity}>{t("fc1.cart.quantity")} × {cart.quantity}</div>
            )}
          </div>
          {message ? <p className={styles.error} role="alert">{message}</p> : null}
          <div className={styles.summaryRow}>
            <span>{t("fc1.cart.total")}</span>
            <strong>{t("fc1.cart.price_pending")}</strong>
          </div>
          <p className={styles.disclaimer}>{t("fc1.cart.no_purchase")}</p>
          <div className={styles.actions}>
            {mode === "cart" ? (
              <a className={styles.primaryLink} href={`/${locale}/checkout`}>{t("fc1.cart.review")} <span aria-hidden="true">→</span></a>
            ) : (
              <a className={styles.secondaryLink} href={`/${locale}/cart`}>{t("fc1.cart.title")}</a>
            )}
            <a className={styles.secondaryLink} href={`/${locale}/explore/fc1#configure`}>{t("fc1.cart.back_config")}</a>
          </div>
        </>
      )}
    </section>
  );
}
