"use client";

import { useState } from "react";
import { translator, type Locale } from "../../_lib/i18n";
import styles from "./cup-holder-product.module.css";

const colours = ["black", "cream", "green", "pink", "violet", "orange"] as const;
const photos = ["01", "02", "03", "04", "05"] as const;

export function CupHolderGallery({ locale }: { locale: Locale }) {
  const [selected, setSelected] = useState<string>("photo-01");
  const t = translator(locale);
  const photo = photos.find(id => selected === "photo-" + id);
  const colour = colours.find(id => selected === id) || "black";
  const src = photo ? `/products/accessories/cup-holder/gallery-${photo}.webp`
    : `/products/accessories/${colour === "black" || colour === "cream" ? "" : "cup-holder/"}cup-holder-${colour}.webp`;
  const caption = photo ? t(`cup.gallery.${photo}`) : t("cup.colour.caption", { colour: t(`cup.${colour}`) });
  return <div data-cup-holder-gallery>
    <figure className={styles.figure}>
      <img key={selected} src={src} width={800} height={800} alt={caption} fetchPriority="high" />
      <figcaption aria-live="polite">{caption}</figcaption>
    </figure>
    <div className={styles.thumbnails} role="group" aria-label={t("cup.gallery")}>
      {photos.map(photo => <button key={photo} type="button" data-cup-photo={photo} aria-pressed={selected === "photo-" + photo}
        aria-label={t(`cup.gallery.${photo}`)} onClick={() => setSelected("photo-" + photo)}>
        <img src={`/products/accessories/cup-holder/gallery-${photo}.webp`} width={100} height={100} alt="" loading="lazy" />
      </button>)}
    </div>
    <p className={styles.colourLabel}>{t("cup.colours.title")}</p>
    <div className={styles.options} role="group" aria-label={t("cup.colours.title")}>
      {colours.map(colour => <button key={colour} type="button" data-cup-colour={colour} aria-pressed={selected === colour}
        onClick={() => setSelected(colour)}>{t(`cup.${colour}`)}</button>)}
    </div>
    <p className={styles.note}>{t("cup.photo.note")}</p>
  </div>;
}
