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

type Scene = {
  label: string;
  title: string;
  subtitle: string;
  image: string;
  alt: string;
  href: string;
};
export function HomeHero({
  scenes,
  eyebrow,
  description,
  exploreLabel,
  modelLabel,
  modelHref,
  modelAlt,
  scrollLabel,
}: {
  scenes: Scene[];
  eyebrow: string;
  description: string;
  exploreLabel: string;
  modelLabel: string;
  modelHref: string;
  modelAlt: string;
  scrollLabel: string;
}) {
  const scene = scenes[0];
  if (!scene) return null;
  return (
    <section className={styles.hero}>
      <img
        className={styles["hero-bg"]}
        src={scene.image}
        alt={scene.alt}
        width={1536}
        height={1024}
        fetchPriority="high"
      />
      <div className={styles["hero-shade"]} />
      <a
        className={styles["hero-product"]}
        href={modelHref}
        aria-label={modelAlt}
      >
        <img
          src="/products/fc1/hero-bike-final.png"
          alt=""
          width="1136"
          height="746"
          fetchPriority="high"
        />
      </a>
      <div
        className={styles["hero-copy"]}
      >
        <div className={styles.eyebrow}>{eyebrow}</div>
        <h1>{scene.title}</h1>
        <h2>{scene.subtitle}</h2>
        <p>{description}</p>
        <a className={styles["btn-white"]} href={scene.href}>
          {exploreLabel}
        </a>
        <a className={styles["btn-outline"]} href={modelHref}>
          {modelLabel}
        </a>
      </div>
      <a className={styles["hero-index"]} href={modelHref}>
        {scrollLabel}
      </a>
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
