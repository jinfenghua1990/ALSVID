"use client";

import { useEffect, useState } from "react";
import styles from "./bikes-model-side-navigator.module.css";

type ModelLink = { id: string; label: string; href: string };

/** In-flow model index. It synchronizes with scrolling but is not a floating overlay. */
export function BikesModelSideNavigator({ title, links }: { title: string; links: ModelLink[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const stickyOffset = window.innerWidth <= 760 ? 64 + 50 + 24 : 70 + 58 + 28;
      const probe = window.scrollY + stickyOffset + 100;
      const candidates = links.map(link => {
        const element = document.getElementById(link.id);
        return element ? { id: link.id, top: element.getBoundingClientRect().top + window.scrollY } : null;
      }).filter((item): item is { id: string; top: number } => item !== null && item.top <= probe)
        .sort((a, b) => b.top - a.top);
      const first = candidates[0];
      const hash = window.location.hash.slice(1);
      const current = candidates.find(item => item.id === hash && first && Math.abs(item.top - first.top) < 2)?.id
        ?? first?.id ?? null;
      setActive(previous => previous === current ? previous : current);
    };
    const onScroll = () => { if (frame === 0) frame = window.requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("hashchange", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("hashchange", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [links]);

  return <nav className={styles.nav} aria-label={title} data-bikes-model-side-nav>
    <p className={styles.heading}>{title}</p>
    <div className={styles.links}>
      {links.map(link => <a key={link.id} href={link.href} data-nav-target={link.id}
        aria-current={active === link.id ? "location" : undefined} className={styles.link}>
        <span>{link.label}</span>
      </a>)}
    </div>
  </nav>;
}
