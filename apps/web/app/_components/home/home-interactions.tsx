"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image, { getImageProps } from "next/image";
import styles from "./original-home.module.css";

export function InfoDialog({
  label,
  title,
  body,
  closeLabel,
}: {
  label: string;
  title: string;
  body: string;
  closeLabel: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  return (
    <>
      <button
        type="button"
        className={styles.inlineButton}
        onClick={() => dialog.current?.showModal()}
      >
        {label}
      </button>
      <dialog
        className={styles.dialog}
        ref={dialog}
        aria-labelledby={id}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <h2 id={id}>{title}</h2>
        <p>{body}</p>
        <button autoFocus type="button" onClick={() => dialog.current?.close()}>
          {closeLabel}
        </button>
      </dialog>
    </>
  );
}

type HeroSlide = { href: string; label: string; image: string; bikeImage?: string; alt: string };

export function HomePosterHero({
  title,
  tagline,
  discoverLabel,
  buyLabel,
  buyHref,
  productModelId,
  posterAlt,
  modelHref,
  modelLabel,
  categories,
  scrollLabel,
  pauseLabel,
  playLabel,
  conceptLabel,
  exploreLabel,
  deliveryNote,
}: {
  title: string;
  tagline: string;
  discoverLabel: string;
  buyLabel: string;
  buyHref: string;
  productModelId?: string | null;
  posterAlt: string;
  modelHref: string;
  modelLabel: string;
  categories: [HeroSlide, HeroSlide, HeroSlide, HeroSlide];
  scrollLabel: string;
  pauseLabel: string;
  playLabel: string;
  conceptLabel: string;
  exploreLabel: string;
  deliveryNote: string;
}) {
  const headingId = useId();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const touchStart = useRef<number | null>(null);
  const slide = categories[active] ?? categories[0];
  const imageLoads = useRef(new Map<string, Promise<void>>());
  const selection = useRef(0);
  const loadSlide = useCallback((index: number) => {
    const target = categories[index] ?? categories[0];
    const cached = imageLoads.current.get(target.image);
    if (cached) return cached;
    const { props } = getImageProps({ src: target.image, alt: target.alt, fill: true, sizes: "100vw" });
    const image = new window.Image();
    image.fetchPriority = "low";
    image.sizes = props.sizes ?? "100vw";
    image.srcset = props.srcSet ?? "";
    image.src = props.src;
    const loading = image.decode().catch(error => {
      imageLoads.current.delete(target.image);
      throw error;
    });
    imageLoads.current.set(target.image, loading);
    return loading;
  }, [categories]);
  const selectSlide = useCallback((index: number) => {
    const request = ++selection.current;
    // Keep the current image and copy together until the next image can be painted.
    void loadSlide(index).then(() => {
      if (selection.current === request) setActive(index);
    }).catch(() => { /* Preserve the current slide; a later selection can retry. */ });
  }, [loadSlide]);
  useEffect(() => {
    void loadSlide((active + 1) % categories.length).catch(() => { /* Retry on selection. */ });
  }, [active, categories.length, loadSlide]);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (paused || suspended || reducedMotion) return;
    const timer = setInterval(() => {
      if (!document.hidden) selectSlide((active + 1) % categories.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [paused, suspended, reducedMotion, categories.length, active, selectSlide]);
  return (
    <section className={styles.posterHero} data-home-carousel data-product-model-id={active===0?productModelId??undefined:undefined} aria-labelledby={headingId} onMouseEnter={() => setSuspended(true)} onMouseLeave={() => setSuspended(false)} onFocusCapture={() => setSuspended(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setSuspended(false); }}>
      <div className={styles.posterStage} onTouchStart={event => { touchStart.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={event => {
        if (touchStart.current !== null) {
          const delta = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
          if (Math.abs(delta) > 50) { selectSlide((active + (delta < 0 ? 1 : categories.length - 1)) % categories.length); setPaused(true); }
        }
        touchStart.current = null;
      }}>
        <Image
          className={`${styles.posterImage} ${styles.carouselImage}`}
          src={slide.image}
          alt={active === 0 && slide.bikeImage ? "" : slide.alt}
          fill
          sizes="100vw"
          preload={active === 0}
        />
        {active === 0 && slide.bikeImage && (
          <div className={styles.posterBikeLayer}>
            <Image
              className={styles.posterBikeImage}
              src={slide.bikeImage}
              alt={posterAlt}
              fill
              sizes="(max-width: 760px) 96vw, 57vw"
              preload
            />
          </div>
        )}
        <div className={styles.posterContent}>
          <h1 id={headingId}>{active === 0 ? title : slide.label}</h1>
          <p className={styles.posterTagline}>{active === 0 ? tagline : conceptLabel}</p>
          <span className={styles.posterDivider} aria-hidden="true" />
          <div className={styles.posterButtons}>
            {active === 0 ? <>
              <a className={`${styles.posterDiscover} ${styles.posterBuy}`} href={buyHref}>
                <span className={styles.posterCtaLabel}>{buyLabel}</span>
                <span className={styles.posterCtaArrow} aria-hidden="true">›</span>
              </a>
              <a className={styles.posterSecondary} href="#featured">
                {discoverLabel}
                <span aria-hidden="true">↓</span>
              </a>
            </> : <a className={styles.posterDiscover} href={slide.href}>{exploreLabel}<span aria-hidden="true">→</span></a>}
          </div>
          {active === 0 && <p className={styles.posterDelivery}>{deliveryNote}</p>}
        </div>
        <a className={styles.posterBikeLink} href={slide.href} aria-label={active === 0 ? modelLabel : slide.label} />
        <div className={styles.carouselControls} role="group" aria-label={scrollLabel}>
          {categories.map(({href, label}, index) => <button className={styles.slideSelector} key={href} type="button" aria-label={label} aria-pressed={active === index} onClick={() => { selectSlide(index); setPaused(true); }}><span className={styles.slideName}>{label}</span><span className={styles.slideTrack} aria-hidden="true" /></button>)}
          {!reducedMotion && <button className={styles.carouselPause} type="button" aria-label={paused ? playLabel : pauseLabel} onClick={() => setPaused(value => !value)}>
            {paused ? <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="m5 3 8 5-8 5Z" fill="currentColor"/></svg> : <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M5 3v10M11 3v10" stroke="currentColor" strokeWidth="2"/></svg>}
          </button>}
        </div>
        <a className={styles.posterScroll} href="#platforms" aria-label={scrollLabel}><svg viewBox="0 0 24 14" width="20" height="12" fill="none" aria-hidden="true"><path d="m3 3 9 8 9-8" stroke="currentColor" strokeWidth="1.5" /></svg></a>
      </div>
    </section>
  );
}

export function FoldingSteps({
  steps,
  label,
}: {
  steps: { number: string; title: string; description: string }[];
  label: string;
}) {
  const [selected, setSelected] = useState(0);
  const active = steps[selected] ?? steps[0];
  const id = useId();
  return (
    <div className={styles.foldingInteractive}>
      <div className={styles["fold-steps"]} role="group" aria-label={label}>
        {steps.map((step, index) => (
          <button
            key={step.number}
            type="button"
            className={styles["fold-step"]}
            aria-pressed={selected === index}
            aria-controls={id}
            onClick={() => setSelected(index)}
          >
            <span className={styles.num}>{step.number}</span>
            <div className={styles.shape} aria-hidden="true" />
            <b>{step.title}</b>
          </button>
        ))}
      </div>
      <div id={id} className={styles.foldPreview} aria-live="polite">
        <svg viewBox="0 0 360 150" aria-hidden="true">
          <circle cx={selected === 0 ? 65 : 130} cy="105" r="33" />
          <circle cx={selected === 0 ? 280 : 205} cy="105" r="33" />
          <path
            d={
              selected === 0
                ? "M65 105L125 45L175 105L65 105M125 45L255 45L280 105L175 105L145 26H115M255 45L248 23H270"
                : selected === 1
                  ? "M130 105L156 45L177 100L130 105M156 45L195 65L205 105L177 100L145 26H125M195 65L230 65"
                  : "M130 105L156 70L177 100L130 105M156 70L195 75L205 105L177 100M156 70L140 62M195 75L226 86"
            }
          />
        </svg>
        <strong>{active?.title}</strong>
        <p>{active?.description}</p>
      </div>
    </div>
  );
}
