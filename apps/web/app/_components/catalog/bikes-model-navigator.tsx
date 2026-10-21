"use client";

import { useEffect, useState } from "react";
import styles from "./bikes-model-navigator.module.css";

type Model = { id: string; name: string };

/** Floating shortcuts appear after the hero and follow actual model chapters. */
export function BikesModelNavigator({ title, models }: { title: string; models: Model[] }) {
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const hero = document.querySelector("[data-bikes-hero]");
      if (!hero) return;
      const modelSection = document.getElementById("models");
      const accessorySection = document.getElementById("accessories");
      // The rail belongs to the vehicle collection, not the accessories chapter.
      const shouldShow = hero.getBoundingClientRect().bottom <= 0
        && Boolean(modelSection && modelSection.getBoundingClientRect().top < window.innerHeight * 0.65)
        && Boolean(!accessorySection || accessorySection.getBoundingClientRect().top > window.innerHeight * 0.5);
      setVisible(previous => previous === shouldShow ? previous : shouldShow);
      if (!shouldShow) {
        setActive(previous => previous === null ? previous : null);
        return;
      }
      const probe = window.scrollY + Math.max(120, window.innerHeight * 0.38);
      let current: string | null = null;
      for (const model of models) {
        const element = document.getElementById("model-" + model.id);
        if (element && probe >= element.getBoundingClientRect().top + window.scrollY) current = model.id;
      }
      setActive(previous => previous === current ? previous : current);
    };
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [models]);

  return visible ? (
    <nav className={styles.bar} aria-label={title} data-bikes-model-nav>
      <span className={styles.brand} aria-hidden="true">ALSVID <span className={styles.dot}>/</span> {title}</span>
      <div className={styles.links}>
        {models.map(model => (
          <a key={model.id} href={"#model-" + model.id}
            aria-current={active === model.id ? "location" : undefined}
            className={styles.link}>{model.name}</a>
        ))}
      </div>
    </nav>
  ) : null;
}
