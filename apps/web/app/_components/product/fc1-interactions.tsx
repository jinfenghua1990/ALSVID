"use client";

import React, { useRef, useState, type ReactNode } from "react";
import { translator, type Locale, type TranslationKey } from "../../_lib/i18n";
import styles from "./fc1-product.module.css";

const gallery = [
  ["side", "fc1.gallery.side", "fc1.photo.alt"],
  ["rear-three-quarter", "fc1.gallery.rear", "fc1.photo.alt"],
  ["folded", "fc1.gallery.folded", "fc1.photo.alt"],
  ["hidden-carbon-front-suspension", "fc1.gallery.front", "fc1.hotspot.front.body"],
  ["dnm-rear-air-shock", "fc1.gallery.shock", "fc1.hotspot.rear.body"],
  ["shimano-chain-drivetrain", "fc1.gallery.chain", "fc1.hotspot.chain.body"],
  ["handlebar-display", "fc1.gallery.controls", "fc1.hotspot.controls.body"],
] as const;

function photoSize(asset: string) {
  if (asset === "hidden-carbon-front-suspension") return { width: 1333, height: 2000 };
  if (asset === "dnm-rear-air-shock") return { width: 2000, height: 1333 };
  return { width: 1536, height: 1024 };
}

const colourOptions = [
  { id: "sample", key: "fc1.colours.sample", tone: "green" },
  { id: "black", key: "fc1.colours.black", tone: "black" },
  { id: "blue", key: "fc1.colours.blue", tone: "blue" },
  { id: "silver", key: "fc1.colours.silver", tone: "silver" },
] as const;



export function ProductGallery({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [active, setActive] = useState<(typeof gallery)[number][0]>("side");
  const dialog = useRef<HTMLDialogElement>(null);
  const image = gallery.find(([id]) => id === active) ?? gallery[0];
  return (
    <div className={styles.gallery}>
      <div className={styles.galleryMain}>
        <button
          className={styles.zoomButton}
          type="button"
          aria-label={t("fc1.open_photo")}
          onClick={() => dialog.current?.showModal()}
        >
          <img src={`/products/fc1/${image[0]}.webp`} alt={t(image[2])} {...photoSize(image[0])} fetchPriority="high" />
          <span aria-hidden="true">↗</span>
        </button>
        <p className={styles.photoCaption}>{t("fc1.photo.note")}</p>
      </div>
      <div className={styles.galleryThumbs} role="group" aria-label={t("fc1.gallery")}>
        {gallery.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={active === id}
            aria-label={t(label)}
            onClick={() => setActive(id)}
          >
            <img src={`/products/fc1/${id}.webp`} alt="" {...photoSize(id)} loading="lazy" />
            <span>{t(label)}</span>
          </button>
        ))}
      </div>
      <dialog className={styles.lightbox} ref={dialog} aria-label={t("fc1.open_photo")}>
        <button className={styles.lightboxClose} type="button" onClick={() => dialog.current?.close()} autoFocus>
          {t("fc1.close")} <span aria-hidden="true">×</span>
        </button>
        <img src={`/products/fc1/${image[0]}.webp`} alt={t(image[2])} {...photoSize(image[0])} />
      </dialog>
    </div>
  );
}

export function ColourSelector({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [active, setActive] = useState<(typeof colourOptions)[number]["id"]>("sample");
  const option = colourOptions.find(({ id }) => id === active) ?? colourOptions[0];
  const name = t(option.key);
  const message = active === "sample"
    ? t("fc1.colours.none_selected")
    : t("fc1.colours.proposal_selected", { colour: name });
  return (
    <div className={styles.colourPanel}>
      <div className={styles.swatchGroup} role="group" aria-label={t("fc1.colours.proposals")}>
        {colourOptions.map(({ id, key, tone }) => (
          <button key={id} type="button" className={styles.swatchChoice} aria-pressed={active === id} onClick={() => setActive(id)}>
            <span className={`${styles.swatch} ${styles[tone]}`} aria-hidden="true" />
            <span>{t(key)}</span>
            {id === "sample" ? <small>{t("fc1.colours.pending")}</small> : null}
          </button>
        ))}
      </div>
      <p className={styles.colourMessage} aria-live="polite">{message}</p>
      <p className={styles.smallNote}>{t("fc1.colours.disclaimer")}</p>
    </div>
  );
}

export function FoldStatePreview({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [folded, setFolded] = useState(false);
  const asset = folded ? "folded" : "side";
  return (
    <div className={styles.foldPreview}>
      <div className={styles.segmented} role="group" aria-label={t("fc1.section.fold.title")}>
        <button type="button" aria-pressed={!folded} onClick={() => setFolded(false)}>{t("fc1.fold.open")}</button>
        <button type="button" aria-pressed={folded} onClick={() => setFolded(true)}>{t("fc1.fold.closed")}</button>
      </div>
      <img src={`/products/fc1/${asset}.webp`} alt={t(folded ? "fc1.gallery.folded" : "fc1.photo.alt")} width="1536" height="1024" loading="lazy" />
      {folded ? <p className={styles.foldMeasure}>85 × 69 × 48 <small>cm</small></p> : null}
      <p className={styles.smallNote}>{t("fc1.fold.caption")}</p>
    </div>
  );
}

export function SuspensionCards({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const cards = [
    { id: "front", asset: "hidden-carbon-front-suspension", number: "01" },
    { id: "rear", asset: "dnm-rear-air-shock", number: "02" },
  ] as const;
  return (
    <div className={styles.suspensionCards}>
      {cards.map(({ id, asset, number }) => {
        const title = t(`fc1.hotspot.${id}` as TranslationKey);
        const position = id === "front" ? (locale === "zh" ? "前部" : locale === "de" ? "VORNE" : "FRONT") : (locale === "zh" ? "后部" : locale === "de" ? "HINTEN" : "REAR");
        const body = t(`fc1.hotspot.${id}.body` as TranslationKey);
        const alt = t(id === "front" ? "fc1.gallery.front" : "fc1.gallery.shock");
        return (
          <article className={styles.suspensionCard} key={id}>
            <div className={styles.suspensionPhoto}>
              <img src={`/products/fc1/${asset}.webp`} alt={alt} {...photoSize(asset)} loading="lazy" />
            </div>
            <div className={styles.suspensionCopy}>
              <p className={styles.eyebrow}>{position} / {number}</p>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

const filters = ["all", "reference", "option", "pending"] as const;
export function SpecificationFilters({ locale, children }: { locale: Locale; children: ReactNode }) {
  const t = translator(locale);
  const [active, setActive] = useState<(typeof filters)[number]>("all");
  return (
    <div className={styles.specificationList}>
      <div className={styles.filters} role="group" aria-label={t("fc1.table.status")}>
        {filters.map((filter) => (
          <button type="button" key={filter} aria-pressed={active === filter} onClick={() => setActive(filter)}>
            {t(`fc1.filter.${filter}` as TranslationKey)}
          </button>
        ))}
      </div>
      <div className={styles.tableScroll}>
        <table>
          <thead><tr><th>{t("fc1.table.attribute")}</th><th>{t("fc1.table.reference")}</th><th>{t("fc1.table.status")}</th></tr></thead>
          <tbody>{React.Children.map(children, (child) => {
            if (!React.isValidElement<{ "data-status"?: string }>(child)) return child;
            const status = child.props["data-status"];
            return active === "all" || status === active ? child : null;
          })}</tbody>
        </table>
      </div>
    </div>
  );
}
