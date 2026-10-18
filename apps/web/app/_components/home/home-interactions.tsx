"use client";

import { useId, useRef, useState } from "react";
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

export function HomePosterHero({
  title,
  tagline,
  discoverLabel,
  posterAlt,
  modelHref,
  modelLabel,
  categories,
  scrollLabel,
}: {
  title: string;
  tagline: string;
  discoverLabel: string;
  posterAlt: string;
  modelHref: string;
  modelLabel: string;
  categories: { href: string; label: string }[];
  scrollLabel: string;
}) {
  const headingId = useId();
  return (
    <section className={styles.posterHero} aria-labelledby={headingId}>
      <div className={styles.posterStage}>
        <img className={styles.posterImage} src="/home/fc1-poster-clean.png" alt={posterAlt} width="1672" height="941" fetchPriority="high" />
        <div className={styles.posterContent}>
          <h1 id={headingId}>{title}</h1>
          <p className={styles.posterTagline}>{tagline}</p>
          <span className={styles.posterDivider} aria-hidden="true" />
          <a className={styles.posterDiscover} href={modelHref}>{discoverLabel}<span aria-hidden="true">→</span></a>
        </div>
        <a className={styles.posterBikeLink} href={modelHref} aria-label={modelLabel} />
        <nav className={styles.posterCategories} aria-label={scrollLabel}>
          {categories.map(({href, label}) => <a key={href} href={href}>{label}</a>)}
        </nav>
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
