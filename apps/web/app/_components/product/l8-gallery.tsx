"use client";

import { useState } from "react";
import { translator, type Locale } from "../../_lib/i18n";
import styles from "./l8-product.module.css";

export function L8Gallery({ locale }: { locale: Locale }) {
  const [photo, setPhoto] = useState<"side" | "folded">("side");
  const t = translator(locale);
  const photos = ["side", "folded"] as const;
  return <div className={styles.gallery} data-l8-gallery>
    <div className={styles.stage} id="l8-photo" aria-live="polite">
      <span className={styles.backdrop} aria-hidden="true">L1</span>
      <img key={photo} src={`/products/l8/retouched-${photo}.webp`} width={1024} height={1024}
        alt={t(`l8.gallery.${photo}.alt`)} fetchPriority="high" data-l8-photo={photo} />
    </div>
    <div className={styles.galleryControls} role="group" aria-label={t("l8.gallery.label")}>
      {photos.map(id => <button key={id} type="button" aria-controls="l8-photo" aria-pressed={photo === id}
        onClick={() => setPhoto(id)}>{t(`l8.gallery.${id}`)}</button>)}
    </div>
    <p className={styles.note}>{t("l8.photo.note")}</p>
    <a className={styles.note} data-l8-original href={`/products/l8/reference-${photo}.png`} target="_blank" rel="noreferrer">{t("l8.original")}</a>
  </div>;
}
