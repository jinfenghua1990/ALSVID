"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./fc1-story-v4.module.css";

/** Progressive enhancement only: all content and original controls work without it. */
export function Fc1ScrollStory({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let stop = () => {};
    const start = () => {
      stop();
      element.removeAttribute("data-fc1-motion");
      element.style.removeProperty("--fc1-scroll-progress");
      element.style.removeProperty("--fc1-travel");
      if (preference.matches || !("IntersectionObserver" in window)) return;
      const chapters = Array.from(element.querySelectorAll<HTMLElement>("[data-fc1-chapter]"));
      const links = Array.from(element.querySelectorAll<HTMLAnchorElement>("nav a[href^='#']"));
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) entry.target.setAttribute("data-fc1-revealed", "true");
        }
      }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
      for (const chapter of chapters) {
        // Keep content already above/in the viewport still and visible on hydration.
        chapter.dataset.fc1Revealed = String(chapter.getBoundingClientRect().top < window.innerHeight);
        observer.observe(chapter);
      }
      let frame = 0;
      const hero = element.querySelector<HTMLElement>("#overview");
      const gallery = element.querySelector<HTMLElement>("[data-fc1-gallery-reveal]");
      const update = () => {
        frame = 0;
        const rect = element.getBoundingClientRect();
        const distance = Math.max(1, element.scrollHeight - window.innerHeight);
        element.style.setProperty("--fc1-scroll-progress", String(Math.max(0, Math.min(1, -rect.top / distance))));
        if (hero) {
          const box = hero.getBoundingClientRect();
          element.style.setProperty("--fc1-travel", String(Math.max(0, Math.min(1, -box.top / Math.max(1, box.height)))));
        }
        // Scroll-scrubbed product reveal: one real FC1 image, no artificial morph or fake 3D.
        if (gallery) {
          const box = gallery.getBoundingClientRect();
          const viewport = window.innerHeight;
          const progress = Math.max(0, Math.min(1, (viewport * .76 - box.top) / Math.max(1, viewport * .72)));
          gallery.style.setProperty("--fc1-gallery-scale", String(1.32 - .32 * progress));
          gallery.style.setProperty("--fc1-gallery-details-opacity", String(Math.max(0, Math.min(1, (progress - .3) / .55))));
          gallery.style.setProperty("--fc1-gallery-details-y", String(Math.round((1 - progress) * 20)) + "px");
        }
        let active = "";
        for (const chapter of chapters) {
          if (chapter.id && chapter.getBoundingClientRect().top <= 190) active = "#" + chapter.id;
        }
        for (const link of links) {
          if (link.getAttribute("href") === active) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        }
      };
      const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
      update();
      element.dataset.fc1Motion = "ready";
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule);
      stop = () => {
        observer.disconnect();
        window.removeEventListener("scroll", schedule);
        window.removeEventListener("resize", schedule);
        if (frame) window.cancelAnimationFrame(frame);
        for (const link of links) link.removeAttribute("aria-current");
        if (gallery) for (const name of ["--fc1-gallery-scale", "--fc1-gallery-details-opacity", "--fc1-gallery-details-y"]) gallery.style.removeProperty(name);
      };
    };
    start();
    preference.addEventListener("change", start);
    return () => { stop(); preference.removeEventListener("change", start); };
  }, []);
  return <div ref={root} className={styles.story}>{children}</div>;
}
