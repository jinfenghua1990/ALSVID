"use client";

import { useEffect, useState } from "react";
import styles from "./bikes-model-navigator.module.css";

type NavLink = { id: string; label: string; href: string };

/** A compact sticky product index. The current chapter follows the page scroll. */
export function BikesModelNavigator({ title, links }: { title: string; links: NavLink[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const stickyOffset = window.innerWidth <= 760 ? 64 + 50 : 70 + 58;
      const probe = window.scrollY + stickyOffset + 100;
      const candidates = links
        .map(link => {
          const element = document.getElementById(link.id);
          return element ? { id: link.id, top: element.getBoundingClientRect().top + window.scrollY } : null;
        })
        .filter((item): item is { id: string; top: number } => item !== null && item.top <= probe)
        .sort((a, b) => b.top - a.top);
      const current = candidates[0]?.id ?? null;
      setActive(previous => previous === current ? previous : current);
    };
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };
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

  return (
    <nav className={styles.bar} aria-label={title} data-bikes-model-nav>
      <div className={styles.links}>
        {links.map(link => (
          <a
            key={link.id}
            href={link.href}
            aria-current={active === link.id ? "location" : undefined}
            className={styles.link}
            data-nav-target={link.id}
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
