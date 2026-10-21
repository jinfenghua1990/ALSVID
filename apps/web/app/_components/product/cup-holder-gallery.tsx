"use client";

import { useState } from "react";
import { translator, type Locale } from "../../_lib/i18n";
import styles from "./cup-holder-product.module.css";

export function CupHolderGallery({ locale }: { locale: Locale }) {
  const [colour, setColour] = useState<"black" | "cream">("black");
  const t = translator(locale);
  return <div data-cup-holder-gallery>
    <figure className={styles.figure}>
      <img src={`/products/accessories/cup-holder-${colour}.webp`} width={800} height={800} alt={t(`cup.${colour}.alt`)} fetchPriority="high" />
      <figcaption aria-live="polite">{t(`cup.${colour}.caption`)}</figcaption>
    </figure>
    <div className={styles.options} role="group" aria-label={t("cup.gallery")}>
      {(["black", "cream"] as const).map(id => <button key={id} type="button" aria-pressed={id === colour} onClick={() => setColour(id)}>{t(`cup.${id}`)}</button>)}
    </div>
    <p className={styles.note}>{t("cup.photo.note")}</p>
  </div>;
}
