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

const colourOptions = [
  { id: "sample", key: "fc1.colours.sample", tone: "green" },
  { id: "black", key: "fc1.colours.black", tone: "black" },
  { id: "blue", key: "fc1.colours.blue", tone: "blue" },
  { id: "silver", key: "fc1.colours.silver", tone: "silver" },
] as const;

const hotspots = [
  { id: "front", key: "fc1.hotspot.front", asset: "hidden-carbon-front-suspension", left: "71%", top: "70%" },
  { id: "rear", key: "fc1.hotspot.rear", asset: "dnm-rear-air-shock", left: "37%", top: "67%" },
  { id: "chain", key: "fc1.hotspot.chain", asset: "shimano-chain-drivetrain", left: "33%", top: "77%" },
  { id: "controls", key: "fc1.hotspot.controls", asset: "handlebar-display", left: "68%", top: "25%" },
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
          <img src={`/products/fc1/${image[0]}.webp`} alt={t(image[2])} width="1536" height="1024" fetchPriority="high" />
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
            <img src={`/products/fc1/${id}.webp`} alt="" width="1536" height="1024" loading="lazy" />
            <span>{t(label)}</span>
          </button>
        ))}
      </div>
      <dialog className={styles.lightbox} ref={dialog} aria-label={t("fc1.open_photo")}>
        <button className={styles.lightboxClose} type="button" onClick={() => dialog.current?.close()} autoFocus>
          {t("fc1.close")} <span aria-hidden="true">×</span>
        </button>
        <img src={`/products/fc1/${image[0]}.webp`} alt={t(image[2])} width="1536" height="1024" />
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
  const [folded, setFolded] = useState(false);
  const asset = folded ? "folded" : "side";
  return (
    <div className={styles.foldPreview}>
      <div className={styles.segmented} role="group" aria-label={t("fc1.section.fold.title")}>
        <button type="button" aria-pressed={!folded} onClick={() => setFolded(false)}>{t("fc1.fold.open")}</button>
        <button type="button" aria-pressed={folded} onClick={() => setFolded(true)}>{t("fc1.fold.closed")}</button>
      </div>
      <img src={`/products/fc1/${asset}.webp`} alt={t(folded ? "fc1.gallery.folded" : "fc1.photo.alt")} width="1536" height="1024" loading="lazy" />
      <p className={styles.foldMeasure}>85 × 69 × 48 <small>cm</small></p>
      <p className={styles.smallNote}>{t("fc1.fold.caption")}</p>
    </div>
  );
}

export function ComponentHotspots({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [active, setActive] = useState<(typeof hotspots)[number]["id"]>("front");
  const selected = hotspots.find(({ id }) => id === active) ?? hotspots[0];
  const titleKey = `fc1.hotspot.${selected.id}` as TranslationKey;
  const bodyKey = `fc1.hotspot.${selected.id}.body` as TranslationKey;
  const imageAltKey = selected.id === "controls" ? "fc1.gallery.controls" : `fc1.gallery.${selected.id === "front" ? "front" : selected.id === "rear" ? "shock" : "chain"}` as TranslationKey;
  return (
    <div className={styles.hotspotGrid}>
      <div className={styles.hotspotImage}>
        <img src="/products/fc1/side.webp" alt={t("fc1.photo.alt")} width="1536" height="1024" loading="lazy" />
        {hotspots.map(({ id, key, left, top }, index) => (
          <button key={id} type="button" style={{ left, top }} aria-label={t(key)} aria-pressed={active === id} onClick={() => setActive(id)}>
            0{index + 1}
          </button>
        ))}
      </div>
      <div className={styles.hotspotDetail} aria-live="polite">
        <span className={styles.eyebrow}>{t("fc1.section.detail.kicker")}</span>
        <img src={`/products/fc1/${selected.asset}.webp`} alt={t(imageAltKey)} width="1536" height="1024" loading="lazy" />
        <div className={styles.hotspotTabs} role="group" aria-label={t("fc1.section.detail.title")}>
          {hotspots.map(({ id, key }, index) => (
            <button key={id} type="button" aria-pressed={active === id} onClick={() => setActive(id)}>
              <small>0{index + 1}</small>{t(key)}
            </button>
          ))}
        </div>
        <h3>{t(titleKey)}</h3>
        <p>{t(bodyKey)}</p>
      </div>
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
