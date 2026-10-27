"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { translator, type Locale, type TranslationKey } from "../../_lib/i18n";
import styles from "../../[locale]/bikes/page.module.css";
import { addCartLine, type CartModel } from "../../_lib/commerce/storefront-cart";

export type DiscoveryBike = {
  id: string;
  code: string;
  platform: string;
  name: string;
  status: string;
  image: string;
  alt: string;
  href: string;
  modelId?: string | undefined;
  reviewed: boolean;
};

type ReviewFilter = "all" | "reviewed" | "preview";
type Colour = "sample" | "black" | "blue" | "silver";
const FC1_COLOURS: { id: Colour; hex: string }[] = [
  { id: "sample", hex: "#2d5850" },
  { id: "black", hex: "#272b2e" },
  { id: "blue", hex: "#345c78" },
  { id: "silver", hex: "#b6bdc3" },
];

/**
 * Consumer-facing discovery only. Never derive purchase price, stock, performance
 * or sellable SKUs from the marketing preview models.
 */
export function BikesDiscovery({ locale, models, sortMode }: { locale: Locale; models: DiscoveryBike[]; sortMode: "featured" | "name" }) {
  const t = translator(locale);
  const [trayHost, setTrayHost] = useState<HTMLElement | null>(null);
  useEffect(() => { setTrayHost(document.body); }, []);
  const [query, setQuery] = useState("");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [compare, setCompare] = useState<string[]>([]);
  const [colour, setColour] = useState<Colour>("sample");
  const [compareNotice, setCompareNotice] = useState("");
  const quickDialog = useRef<HTMLDialogElement>(null);
  const [quickId, setQuickId] = useState<string | null>(null);
  const [quickVariant, setQuickVariant] = useState<CartModel>("standard");
  const [quickColour, setQuickColour] = useState<Colour>("sample");
  const [quickQuantity, setQuickQuantity] = useState(1);
  const [quickStatus, setQuickStatus] = useState<"idle" | "added" | "failed">("idle");
  const quickBike = models.find(model => model.id === quickId);
  useEffect(() => {
    const dialog = quickDialog.current;
    if (!dialog) return;
    if (quickId && !dialog.open) dialog.showModal();
    if (!quickId && dialog.open) dialog.close();
  }, [quickId]);
  const openQuick = (id: string) => {
    setQuickId(id);
    setQuickStatus("idle");
    setQuickVariant("standard");
    setQuickColour("sample");
    setQuickQuantity(1);
  };
  const closeQuick = () => {
    quickDialog.current?.close();
    setQuickId(null);
  };
  const savePreview = () => {
    if (!quickBike) return;
    const success = quickBike.id === "fc1"
      ? addCartLine({ product: "FC1", model: quickVariant, colour: quickColour, quantity: quickQuantity })
      : quickBike.id === "fc2"
        ? addCartLine({ product: "FC2", quantity: quickQuantity })
        : false;
    setQuickStatus(success ? "added" : "failed");
  };

  const matching = models.filter(model => {
    const search = query.trim().toLocaleLowerCase(locale);
    return (!search || (model.code + " " + model.name).toLocaleLowerCase(locale).includes(search))
      && (reviewFilter === "all" || (reviewFilter === "reviewed" ? model.reviewed : !model.reviewed));
  }).sort((a, b) => sortMode === "name" ? a.name.localeCompare(b.name, locale) : 0);
  const selected = models.filter(model => compare.includes(model.id));
  const toggleCompare = (id: string) => {
    if (compare.includes(id)) {
      setCompare(compare.filter(item => item !== id));
      setCompareNotice("");
    } else if (compare.length >= 3) {
      setCompareNotice(t("catalog.discovery.compare.limit"));
    } else {
      setCompare([...compare, id]);
      setCompareNotice("");
    }
  };
  const filters: ReviewFilter[] = ["all", "reviewed", "preview"];
  const filterLabel = (value: ReviewFilter) =>
    value === "all" ? t("catalog.discovery.filter.all") :
    value === "reviewed" ? t("catalog.discovery.filter.reviewed") :
    t("catalog.discovery.filter.preview");
  const colourLabel = (value: Colour) =>
    value === "sample" ? t("catalog.discovery.colour.sample") :
    value === "black" ? t("catalog.discovery.colour.black") :
    value === "blue" ? t("catalog.discovery.colour.blue") :
    t("catalog.discovery.colour.silver");

  return <div className={styles.discovery} data-bikes-discovery data-comparing={selected.length > 0 || undefined}>
    <div className={styles.discoveryTools}>
      <div className={styles.discoverySearchWrap}>
        <label className={styles.discoveryLabel} htmlFor="bikes-search">{t("catalog.discovery.search.label")}</label>
        <input
          id="bikes-search"
          data-bikes-search
          className={styles.discoverySearch}
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder={t("catalog.discovery.search.placeholder")}
          autoComplete="off"
        />
      </div>
      <div className={styles.discoveryFilterWrap} role="group" aria-label={t("catalog.discovery.filter.label")}>
        <span className={styles.discoveryLabel}>{t("catalog.discovery.filter.label")}</span>
        <div className={styles.discoveryPills}>
          {filters.map(value => <button key={value} type="button" aria-pressed={reviewFilter === value}
            onClick={() => setReviewFilter(value)}>{filterLabel(value)}</button>)}
        </div>
      </div>
    </div>
    <div className={styles.discoveryResultsRow}>
      <p className={styles.discoveryResults} role="status">{t("catalog.discovery.results", { count: matching.length })}</p>
      {(query || reviewFilter !== "all") && <button type="button" data-bikes-reset onClick={() => { setQuery(""); setReviewFilter("all"); }}>{t("catalog.discovery.reset")}</button>}
    </div>
    {matching.length ? <div className={styles.modelGrid} data-bikes-results>
      {matching.map(model => <article className={styles.modelCard} key={model.id} id={"model-" + model.id}
        data-product-model-id={model.modelId} data-catalog-reviewed={model.reviewed ? true : undefined}
        aria-labelledby={"model-" + model.id + "-title"}>
        <div className={styles.modelImagePanel}>
          <a href={model.href} className={styles.modelImageLink} aria-label={model.name}>
            <img src={model.image} width={1536} height={1024} alt={model.alt} loading="lazy" />
          </a>
        </div>
        <div className={styles.modelInfo}>
          <div>
            <div className={styles.modelMeta}><span className={styles.status}>{model.status}</span><span className={styles.modelCode}>{model.code}</span></div>
            <h3 id={"model-" + model.id + "-title"}>{model.name}</h3>
            <p>{t(`platform.${model.platform}.title` as TranslationKey)}</p>
          </div>
          <p className={styles.discoveryModelNote}>{model.id === "fc1"
            ? t("catalog.discovery.fc1.note") : t("catalog.discovery.other.note")}</p>
          {(model.id === "fc1" || model.id === "fc2") ? <div className={styles.bikeFactsBlock} data-bikes-facts={model.id}>
            <span className={styles.bikeFactsCaption}>{t("catalog.bikes.facts.reference")}</span>
            <dl className={styles.bikeFacts}>
              <div><dt>{t("catalog.bikes.facts.platform")}</dt><dd>FC</dd></div>
              <div><dt>{t("catalog.bikes.facts.wheels")}</dt><dd>20″</dd></div>
              <div><dt>{t("catalog.bikes.facts.frame")}</dt><dd>{t("catalog.bikes.facts.carbon")}</dd></div>
              <div><dt>{t("catalog.bikes.facts.versions")}</dt><dd>{model.id === "fc1" ? "Standard / Pro" : t("catalog.bikes.facts.pending")}</dd></div>
            </dl>
          </div> : null}
          <p className={styles.bikePricePending} data-bikes-price-pending>{t("catalog.bikes.facts.price")} <strong>{t("catalog.cart.pricePending")}</strong></p>
          {model.id === "fc1" ? <div className={styles.discoveryColours} data-bikes-color-preview>
            <span className={styles.discoveryLabel}>{t("catalog.discovery.colour.label")}</span>
            <div className={styles.discoverySwatches} role="group" aria-label={t("catalog.discovery.colour.label")}>
              {FC1_COLOURS.map(option => <button key={option.id} type="button"
                title={colourLabel(option.id)}
                aria-label={colourLabel(option.id)}
                aria-pressed={colour === option.id}
                onClick={() => setColour(option.id)}
                style={{ backgroundColor: option.hex }} />)}
            </div>
            <p className={styles.discoveryColourNote}>
              {colourLabel(colour)} · {colour === "sample"
                ? t("catalog.discovery.colour.reference")
                : t("catalog.discovery.colour.proposal")}
            </p>
            <p className={styles.discoveryPhotoDisclaimer}>{t("catalog.discovery.colour.photo")}</p>
            <a className={styles.discoveryConfigurator} href={model.href + "#configure"}>
              {t("catalog.discovery.colour.explore")}
            </a>
          </div> : <p className={styles.discoveryOtherFinish}>{t("catalog.discovery.colour.pending")}</p>}
          <div className={styles.discoveryActions}>
            <a className={styles.detailLink} href={model.href}>{t("catalog.bikes.models.details")} <span aria-hidden="true">→</span></a>
            <button type="button" className={styles.quickViewTrigger} data-bikes-quick-view={model.id}
              onClick={() => openQuick(model.id)}>{t("catalog.discovery.quickView.open")}</button>
            <button type="button" aria-pressed={compare.includes(model.id)}
              data-bikes-compare-toggle={model.code}
              onClick={() => toggleCompare(model.id)}>
              {compare.includes(model.id) ? t("catalog.discovery.compare.remove") : t("catalog.discovery.compare.add")}
            </button>
          </div>
        </div>
      </article>)}
    </div> : <div className={styles.discoveryEmpty} role="status">
      <p>{t("catalog.discovery.empty")}</p>
      <button type="button" onClick={() => { setQuery(""); setReviewFilter("all"); }}>
        {t("catalog.discovery.reset")}
      </button>
    </div>}

    <section id="bikes-compare" tabIndex={-1} className={styles.discoveryCompare} data-bikes-compare aria-labelledby="bikes-compare-heading">
      <div className={styles.discoveryCompareTop}>
        <div>
          <span className={styles.kicker}>{t("catalog.discovery.compare.kicker")}</span>
          <h3 id="bikes-compare-heading">{t("catalog.discovery.compare.title")}</h3>
        </div>
        <span>{t("catalog.discovery.compare.selected", { count: selected.length })}</span>
      </div>
      <p className={styles.discoveryCompareNote}>{t("catalog.discovery.compare.notice")}</p>
      {selected.length ? <div className={styles.discoveryCompareScroll}>
        <table>
          <thead><tr>
            <th scope="col">{t("catalog.bikes.compare.model")}</th>
            {selected.map(model => <th scope="col" key={model.id}>
              <img className={styles.comparePhoto} src={model.image} alt="" width={180} height={120} loading="lazy" />
              {model.name}
            </th>)}
          </tr></thead>
          <tbody>
            <tr><th scope="row">{t("catalog.bikes.compare.state")}</th>
              {selected.map(model => <td key={model.id}>{model.status}</td>)}</tr>
            <tr><th scope="row">{t("catalog.discovery.compare.platform")}</th>
              {selected.map(model => <td key={model.id}>{model.platform.toUpperCase()}</td>)}</tr>
            <tr><th scope="row">{t("catalog.bikes.facts.wheels")}</th>
              {selected.map(model => <td key={model.id}>{model.id === "fc1" || model.id === "fc2" ? "20″" : t("catalog.bikes.facts.pending")}</td>)}</tr>
            <tr><th scope="row">{t("catalog.bikes.facts.frame")}</th>
              {selected.map(model => <td key={model.id}>{model.id === "fc1" || model.id === "fc2" ? t("catalog.bikes.facts.carbon") : t("catalog.bikes.facts.pending")}</td>)}</tr>
            <tr><th scope="row">{t("catalog.bikes.facts.price")}</th>
              {selected.map(model => <td key={model.id}>{t("catalog.cart.pricePending")}</td>)}</tr>
            <tr><th scope="row">{t("catalog.discovery.compare.spec")}</th>
              {selected.map(model => <td key={model.id}>{model.id === "fc1"
                ? t("catalog.discovery.compare.fc1") : t("catalog.discovery.compare.unknown")}</td>)}</tr>
            <tr><th scope="row">{t("catalog.discovery.compare.finish")}</th>
              {selected.map(model => <td key={model.id}>{model.id === "fc1"
                ? t("catalog.discovery.colour.reference") : t("catalog.discovery.compare.unknown")}</td>)}</tr>
            <tr><th scope="row">{t("catalog.discovery.compare.action")}</th>
              {selected.map(model => <td key={model.id}>
                <a href={model.href}>{t("catalog.bikes.models.details")}</a>
              </td>)}</tr>
          </tbody>
        </table>
      </div> : <p role="status">{t("catalog.discovery.compare.empty")}</p>}
    </section>
    {trayHost && selected.length > 0 && createPortal(<aside className={styles.compareTray} data-bikes-compare-tray aria-label={t("catalog.discovery.compare.title")}>
      <div className={styles.compareTrayModels}>
        {selected.map(model => <div className={styles.compareTrayModel} key={model.id}>
          <img src={model.image} alt="" width={60} height={40} />
          <strong>{model.code}</strong>
          <button type="button" data-bikes-compare-remove={model.code}
            aria-label={t("catalog.discovery.compare.removeModel", { model: model.code })}
            onClick={() => toggleCompare(model.id)}>×</button>
        </div>)}
      </div>
      {compareNotice && <p role="status" className={styles.discoveryLimit}>{compareNotice}</p>}
      <div className={styles.compareTrayActions}>
        <span role="status">{t("catalog.discovery.compare.selected", { count: selected.length })}</span>
        <button type="button" data-bikes-compare-clear onClick={() => { setCompare([]); setCompareNotice(""); }}>{t("catalog.discovery.compare.clear")}</button>
        <a href="#bikes-compare" onClick={() => document.getElementById("bikes-compare")?.focus({ preventScroll: true })}>{t("catalog.discovery.compare.view")}</a>
      </div>
    </aside>, trayHost)}
    <dialog ref={quickDialog} className={styles.bikeQuickDialog} data-bikes-quick-dialog
      aria-label={t("catalog.discovery.quickView.open")} onClose={() => setQuickId(null)}
      onClick={event => { if (event.target === event.currentTarget) closeQuick(); }}>
      {quickBike ? <div className={styles.bikeQuickContent}>
        <div className={styles.bikeQuickPhoto}>
          <img src={quickBike.image} alt={quickBike.alt} width={900} height={650} />
        </div>
        <div className={styles.bikeQuickDetails}>
          <div className={styles.bikeQuickHeading}>
            <span className={styles.status}>{quickBike.status}</span>
            <button type="button" className={styles.bikeQuickClose} onClick={closeQuick}
              aria-label={t("catalog.discovery.quickView.close")}>×</button>
          </div>
          <p className={styles.bikeQuickEyebrow}>{quickBike.platform.toUpperCase()} / ALSVID</p>
          <h3>{quickBike.name}</h3>
          <p className={styles.bikeQuickPrice}>{t("catalog.bikes.facts.price")}: <strong>{t("catalog.cart.pricePending")}</strong></p>
          <p className={styles.bikeQuickNote}>{quickBike.id === "fc1"
            ? t("catalog.discovery.fc1.note") : t("catalog.discovery.other.note")}</p>
          {(quickBike.id === "fc1" || quickBike.id === "fc2") ? <>
            <p className={styles.bikeQuickWarning}>{t("catalog.discovery.quickView.previewNotice")}</p>
            <dl className={styles.bikeFacts} data-bikes-quick-facts>
              <div><dt>{t("catalog.bikes.facts.wheels")}</dt><dd>20″</dd></div>
              <div><dt>{t("catalog.bikes.facts.frame")}</dt><dd>{t("catalog.bikes.facts.carbon")}</dd></div>
            </dl>
            {quickBike.id === "fc1" ? <>
              <label className={styles.bikeQuickLabel}>
                {t("catalog.bikes.facts.versions")}
                <select value={quickVariant} onChange={event => {setQuickVariant(event.target.value as CartModel);setQuickStatus("idle");}}>
                  <option value="standard">Standard</option>
                  <option value="pro">Pro</option>
                </select>
              </label>
              <label className={styles.bikeQuickLabel}>
                {t("catalog.discovery.colour.label")}
                <select value={quickColour} onChange={event => {setQuickColour(event.target.value as Colour);setQuickStatus("idle");}}>
                  {FC1_COLOURS.map(option => <option key={option.id} value={option.id}>{colourLabel(option.id)}</option>)}
                </select>
              </label>
              <p className={styles.bikeQuickColourNote}>{t("catalog.discovery.colour.photo")}</p>
            </> : <p className={styles.bikeQuickColourNote}>{t("catalog.discovery.colour.pending")}</p>}
            <label className={styles.bikeQuickLabel}>
              {t("catalog.cart.quantity")}
              <select value={quickQuantity} onChange={event => {setQuickQuantity(Number(event.target.value));setQuickStatus("idle");}}>
                {Array.from({length:9}, (_,i) => i+1).map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </label>
            <button type="button" className={styles.bikeQuickAdd} data-bikes-quick-save onClick={savePreview}>
              {t("catalog.discovery.quickView.save")}
            </button>
            <p className={styles.bikeQuickFeedback} role="status">
              {quickStatus === "added" ? <>
                {t("catalog.cart.added")} <a href={"/"+locale+"/cart"}>{t("catalog.cart.view")}</a>
              </> : quickStatus === "failed" ? t("catalog.cart.storageError") : t("catalog.cart.previewNotice")}
            </p>
          </> : <p className={styles.bikeQuickWarning}>{t("catalog.discovery.quickView.unavailable")}</p>}
          <a href={quickBike.href} className={styles.bikeQuickDetail}>{t("catalog.bikes.models.details")} <span aria-hidden="true">→</span></a>
        </div>
      </div> : null}
    </dialog>
  </div>;
}
