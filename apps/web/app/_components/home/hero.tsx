'use client';

import { useEffect, useRef, useState } from 'react';
import { BikeVector } from './bike-vector';
import styles from '../../home.module.css';

const SCENES = [
  { tag: 'FOLDING', title: '接下来去哪里？', sub: 'MORE THAN A RIDE' },
  { tag: 'CITY', title: '城市，由我掌控', sub: 'URBAN COMMUTING' },
  { tag: 'FAT TIRE', title: '越野，无边界', sub: 'ALL TERRAIN' },
  { tag: 'TOURING', title: '远方，触手可及', sub: 'GO FURTHER' },
] as const;

const NAV_LINKS = [
  { label: '产品平台', href: '#platforms' },
  { label: 'FC1', href: '#featured' },
  { label: '折叠体验', href: '#folding' },
  { label: '技术', href: '#tech' },
  { label: '服务', href: '#service' },
  { label: '经销商合作', href: '#dealer' },
] as const;

const CYCLE_MS = 6000;

export function HeroSection() {
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
          <nav className={styles.navLinks} aria-label="官网主导航">
            {NAV_LINKS.map((item) => (
              <a key={item.href} href={item.href}>{item.label}</a>
            ))}
          </nav>
          <div className={styles.navRight}>
            <a className={styles.dealerBtn} href="#dealer">Dealer →</a>
          </div>
        </div>
      </header>

      <section id="top" className={styles.hero} aria-label="首页主视觉" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        {SCENES.map((item, index) => (
          <div
            key={item.tag}
            ref={(node) => { sceneRefs.current[index] = node; }}
            className={`${styles.heroScene} ${styles[`scene${index}`]} ${cur === index ? styles.on : ''}`}
            aria-hidden={cur !== index}
          />
        ))}

        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <div key={scene.tag} className={styles.heroCopyInner}>
              <p className={styles.heroTag}>{scene.tag}</p>
              <h1 className={styles.heroTitle}>{scene.title}</h1>
              <p className={styles.heroSub}>{scene.sub}</p>
              <a className={styles.cta} href="#platforms">
                Discover ALSVID
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>
            </div>
          </div>
          <div className={styles.heroBikeStage} ref={bikeRef}>
            <BikeVector tone="light" className={styles.heroBike} />
          </div>
        </div>

        <div className={styles.heroTabs} role="tablist" aria-label="车型类别">
          {SCENES.map((item, index) => (
            <button
              key={item.tag}
              type="button"
              role="tab"
              aria-selected={cur === index}
              className={styles.heroTab}
              onClick={() => select(index)}
            >
              <span className={styles.tabBar}>
                <i key={`${index}-${cur === index}`} />
              </span>
              {item.tag}
            </button>
          ))}
        </div>

        <a className={styles.scrollDown} href="#platforms" aria-label="向下滚动">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </a>
      </section>
    </>
  );
}
