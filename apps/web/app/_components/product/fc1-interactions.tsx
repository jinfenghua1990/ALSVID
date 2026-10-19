"use client";

import React, { useRef, useState, type ReactNode } from "react";
import { translator, type Locale, type TranslationKey } from "../../_lib/i18n";
import styles from "./fc1-product.module.css";
import { fc1Photos } from "./fc1-photos";

const gallery = [
  ["side", "fc1.gallery.side", "fc1.photo.alt"],
  ["rear-three-quarter", "fc1.gallery.rear", "fc1.photo.alt"],
  ["folded", "fc1.gallery.folded", "fc1.photo.alt"],
  ["hidden-carbon-front-suspension", "fc1.gallery.front", "fc1.hotspot.front.body"],
  ["dnm-rear-air-shock", "fc1.gallery.shock", "fc1.hotspot.rear.body"],
  ["shimano-chain-drivetrain", "fc1.gallery.chain", "fc1.hotspot.chain.body"],
  ["handlebar-display", "fc1.gallery.controls", "fc1.hotspot.controls.body"],
] as const;

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
          data-fc1-gallery-photo
          type="button"
          aria-label={t("fc1.open_photo")}
          onClick={() => dialog.current?.showModal()}
        >
          <img {...fc1Photos[image[0]]} alt={t(image[2])} fetchPriority="high" />
          <span aria-hidden="true">↗</span>
        </button>
        <p className={styles.photoCaption}>{t("fc1.photo.note")}</p>
      </div>
      <div className={styles.galleryThumbs} data-fc1-gallery-thumbs role="group" aria-label={t("fc1.gallery")}>
        {gallery.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={active === id}
            aria-label={t(label)}
            onClick={() => setActive(id)}
          >
            <img {...fc1Photos[id]} alt="" loading="lazy" />
            <span>{t(label)}</span>
          </button>
        ))}
      </div>
      <dialog className={styles.lightbox} ref={dialog} aria-label={t("fc1.open_photo")}>
        <button className={styles.lightboxClose} type="button" onClick={() => dialog.current?.close()} autoFocus>
          {t("fc1.close")} <span aria-hidden="true">×</span>
        </button>
        <img {...fc1Photos[image[0]]} alt={t(image[2])} />
      </dialog>
    </div>
  );
}


const modelOptions = [
  { id: "standard", label: "FC1 Standard", note: "fc1.selection.standard_status" },
  { id: "pro", label: "FC1 Pro", note: "fc1.selection.pro_status" },
] as const;

/**
 * UI-only selection. No stock, SKU, order or payment is created.
 * The photos intentionally stay on the confirmed green supplier sample.
 */
export function ProductConfigurator({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [modelId, setModelId] = useState<(typeof modelOptions)[number]["id"]>("standard");
  const [colourId, setColourId] = useState<(typeof colourOptions)[number]["id"]>("sample");
  const model = modelOptions.find(({ id }) => id === modelId) ?? modelOptions[0];
  const colour = colourOptions.find(({ id }) => id === colourId) ?? colourOptions[0];
  const colourName = t(colour.key);
  return (
    <div className={styles.configurator}>
      <div className={styles.modelPanel}>
        <h3>{t("fc1.selection.model")}</h3>
        <div className={styles.modelChoices} role="group" aria-label={t("fc1.selection.model")}>
          {modelOptions.map(({ id, label, note }) => (
            <button key={id} type="button" className={styles.modelChoice} aria-pressed={modelId === id} onClick={() => setModelId(id)}>
              <strong>{label}</strong>
              <span>{t(note)}</span>
            </button>
          ))}
        </div>
        <p className={styles.smallNote}>{t("fc1.selection.model_note")}</p>
      </div>
      <div className={styles.colourPanel}>
        <h3>{t("fc1.selection.colour")}</h3>
        <div className={styles.swatchGroup} role="group" aria-label={t("fc1.colours.proposals")}>
          {colourOptions.map(({ id, key, tone }) => (
            <button key={id} type="button" className={styles.swatchChoice} aria-pressed={colourId === id} onClick={() => setColourId(id)}>
              <span className={[styles.swatch, styles[tone]].join(" ")} aria-hidden="true" />
              <span>{t(key)}</span>
              {id === "sample" ? <small>{t("fc1.colours.pending")}</small> : null}
            </button>
          ))}
        </div>
        <p className={styles.smallNote}>{t("fc1.colours.disclaimer")}</p>
      </div>
      <div className={styles.selectionSummary} role="status" aria-live="polite">
        <span>{t("fc1.selection.summary")}</span>
        <strong>{model.label} / {colourName}</strong>
        <p>{t("fc1.selection.selected", { model: model.label, colour: colourName })}</p>
        <p className={styles.deliveryText}>{t("fc1.selection.delivery")}</p>
        <p className={styles.smallNote}>{t("fc1.selection.unavailable")}</p>
        <a className={styles.buttonDark} href="#specifications">{t("fc1.selection.cta")} <span aria-hidden="true">→</span></a>
      </div>
    </div>
  );
}

export function FoldStatePreview({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [folded, setFolded] = useState(true);
  const asset = folded ? "folded" : "side";
  return (
    <div className={styles.foldStoryLayout}>
      <div className={styles.foldPreview}>
        <div className={`${styles.foldImageFrame} ${folded ? styles.foldedWithDimensions : ""}`}>
          <img {...fc1Photos[asset]} className={styles.foldPhoto} alt={t(folded ? "fc1.gallery.folded" : "fc1.photo.alt")} loading="lazy" />
          {folded ? (
            <svg className={styles.foldDimensionOverlay} viewBox="0 0 1100 970" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
              <defs>
                <marker id="fc1-fold-measure-arrow" viewBox="0 0 12 12" refX="6" refY="6" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M2 2 L10 6 L2 10" fill="none" stroke="#42677b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </marker>
              </defs>
              <g fill="none" stroke="#7d9ba9" strokeWidth="2"><path d="M126 834 V889 M960 834 V889 M970 78 H1015 M970 839 H1015" /></g>
              <g fill="none" stroke="#42677b" strokeWidth="3" strokeLinecap="round">
                <path d="M146 875 H941" markerStart="url(#fc1-fold-measure-arrow)" markerEnd="url(#fc1-fold-measure-arrow)" />
                <path d="M1000 95 V818" markerStart="url(#fc1-fold-measure-arrow)" markerEnd="url(#fc1-fold-measure-arrow)" />
              </g>
              <g className={styles.foldDimensionLabels}>
                <rect x="435" y="841" width="211" height="68" rx="14" />
                <text x="540" y="887" textAnchor="middle">85 cm</text>
                <rect x="964" y="420" width="72" height="138" rx="14" />
                <text transform="translate(1000 489) rotate(90)" textAnchor="middle">69 cm</text>
              </g>
            </svg>
          ) : null}
        </div>
      </div>
      <div className={styles.foldStoryCopy}>
        <p className={styles.eyebrow}>{t("fc1.section.fold.kicker")}</p>
        <h2>{t("fc1.section.fold.title")}</h2>
        <p>{t("fc1.section.fold.body")}</p>
        <div className={styles.foldStorySpecs}><small>{t("fc1.spec.folded.label")}</small><strong>85 × 69 × 48 <small>cm</small></strong></div>
        <p className={styles.foldStoryNote}>{t("fc1.spec.folded.value")}</p>
        <p className={styles.foldStoryNote}>{t("fc1.fold.caption")}</p>
        <div className={styles.segmented} role="group" aria-label={t("fc1.section.fold.title")}>
          <button type="button" aria-pressed={!folded} onClick={() => setFolded(false)}>{t("fc1.fold.open")}</button>
          <button type="button" aria-pressed={folded} onClick={() => setFolded(true)}>{t("fc1.fold.closed")}</button>
        </div>
      </div>
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
        const position = t(`fc1.position.${id}` as TranslationKey);
        const body = t(`fc1.hotspot.${id}.body` as TranslationKey);
        const alt = t(id === "front" ? "fc1.gallery.front" : "fc1.gallery.shock");
        return (
          <article className={styles.suspensionCard} key={id}>
            <div className={styles.suspensionPhoto}>
              <img {...fc1Photos[asset]} alt={alt} loading="lazy" />
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
