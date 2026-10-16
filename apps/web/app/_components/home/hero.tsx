'use client';

import { useEffect, useRef, useState } from 'react';
import { BikeVector } from './bike-vector';
import styles from '../../home.module.css';
import { t, type Locale } from '../../_lib/i18n';
import { LocaleSwitcher } from '../locale-switcher';

const SCENES = [
  { id: 'folding', tag: 'hero.scene.folding.tag', title: 'hero.scene.folding.title', sub: 'hero.scene.folding.sub' },
  { id: 'city', tag: 'hero.scene.city.tag', title: 'hero.scene.city.title', sub: 'hero.scene.city.sub' },
  { id: 'fat_tire', tag: 'hero.scene.fat_tire.tag', title: 'hero.scene.fat_tire.title', sub: 'hero.scene.fat_tire.sub' },
  { id: 'touring', tag: 'hero.scene.touring.tag', title: 'hero.scene.touring.title', sub: 'hero.scene.touring.sub' },
] as const;

const NAV_LINKS = [
  { label: 'navigation.platforms', href: '#platforms' },
  { label: 'navigation.featured', href: '#featured' },
  { label: 'navigation.folding', href: '#folding' },
  { label: 'navigation.technology', href: '#tech' },
  { label: 'navigation.services', href: '#service' },
  { label: 'navigation.dealers', href: '#dealer' },
] as const;

const CYCLE_MS = 6000;

export function HeroSection({ locale, switcherMode = 'path' }: { locale: Locale; switcherMode?: 'path' | 'query' }) {
  const [cur, setCur] = useState(0);
  const [epoch, setEpoch] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const sceneRefs = useRef<Array<HTMLDivElement | null>>([]);
  const bikeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      setCur((c) => (c + 1) % SCENES.length);
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [epoch]);

  const select = (index: number) => {
    setCur(index);
    setEpoch((e) => e + 1);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const x = event.clientX / window.innerWidth - 0.5;
    const y = event.clientY / window.innerHeight - 0.5;
    sceneRefs.current.forEach((node, index) => {
      if (node) node.style.translate = `${x * (10 + index * 4)}px ${y * (6 + index * 3)}px`;
    });
    if (bikeRef.current) bikeRef.current.style.translate = `${x * -14}px ${y * -8}px`;
  };

  const handleMouseLeave = () => {
    sceneRefs.current.forEach((node) => {
      if (node) node.style.translate = '';
    });
    if (bikeRef.current) bikeRef.current.style.translate = '';
  };

  const scene = SCENES[cur] ?? SCENES[0]!;

  return (
    <>
      <header className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`} data-home-nav>
        <div className={styles.navInner}>
          <a className={styles.logo} href="#top">ALSVID</a>
          <nav className={styles.navLinks} aria-label={t(locale, 'navigation.aria')}>
            {NAV_LINKS.map((item) => (
              <a key={item.href} href={item.href}>{t(locale, item.label)}</a>
            ))}
          </nav>
          <div className={styles.navRight}>
            <LocaleSwitcher locale={locale} mode={switcherMode} />
            <a className={styles.dealerBtn} href="#dealer">{t(locale, 'navigation.dealer_cta')} →</a>
          </div>
        </div>
      </header>

      <section id="top" className={styles.hero} aria-label={t(locale, 'hero.aria')} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        {SCENES.map((item, index) => (
          <div
            key={item.id}
            ref={(node) => { sceneRefs.current[index] = node; }}
            className={`${styles.heroScene} ${styles[`scene${index}`]} ${cur === index ? styles.on : ''}`}
            aria-hidden={cur !== index}
          />
        ))}

        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <div key={scene.id} className={styles.heroCopyInner}>
              <p className={styles.heroTag}>{t(locale, scene.tag)}</p>
              <h1 className={styles.heroTitle}>{t(locale, scene.title)}</h1>
              <p className={styles.heroSub}>{t(locale, scene.sub)}</p>
              <a className={styles.cta} href="#platforms">
                {t(locale, 'hero.cta')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>
            </div>
          </div>
          <div className={styles.heroBikeStage} ref={bikeRef}>
            <div className={styles.heroBikeMotion} aria-hidden="true">
              <BikeVector tone="light" className={styles.heroBike} />
            </div>
          </div>
        </div>

        <div className={styles.heroTabs} role="tablist" aria-label={t(locale, 'hero.categories')}>
          {SCENES.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={cur === index}
              className={styles.heroTab}
              onClick={() => select(index)}
            >
              <span className={styles.tabBar}>
                <i key={`${index}-${cur === index}`} />
              </span>
              {t(locale, item.tag)}
            </button>
          ))}
        </div>

        <a className={styles.scrollDown} href="#platforms" aria-label={t(locale, 'hero.scroll')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </a>
      </section>
    </>
  );
}
