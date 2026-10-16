import Link from 'next/link';
import { BikeVector } from './bike-vector';
import { CountUp } from './count-up';
import { FoldingDemo } from './folding-demo';
import { HeroSection } from './hero';
import { Reveal } from './reveal';
import { t, type Locale } from '../../_lib/i18n';
import home from '../../home.module.css';
import legacy from '../../page.module.css';

const platformData = [
  { code: 'FC', name: 'platform.fc.name', note: 'platform.fc.note', skin: home.pi1 },
  { code: 'CT', name: 'platform.ct.name', note: 'platform.ct.note', skin: home.pi2 },
  { code: 'FT', name: 'platform.ft.name', note: 'platform.ft.note', skin: home.pi3 },
  { code: 'GT', name: 'platform.gt.name', note: 'platform.gt.note', skin: home.pi4 },
] as const;

const accessoryData = [
  { icon: '▣', name: 'accessory.basket.name', note: 'accessory.basket.note' },
  { icon: '≋', name: 'accessory.rack.name', note: 'accessory.rack.note' },
  { icon: '◒', name: 'accessory.fenders.name', note: 'accessory.fenders.note' },
  { icon: '◉', name: 'accessory.lights.name', note: 'accessory.lights.note' },
  { icon: '▰', name: 'accessory.battery.name', note: 'accessory.battery.note' },
] as const;

const serviceData = [
  ['service.registration', 'service.registration.note'],
  ['service.vehicles', 'service.vehicles.note'],
  ['service.vin', 'service.vin.note'],
  ['service.warranty', 'service.warranty.note'],
  ['service.repair', 'service.repair.note'],
  ['service.manual', 'service.manual.note'],
  ['service.locations', 'service.locations.note'],
] as const;

const aboutData = [
  ['about.story', 'about.story.note'],
  ['about.design', 'about.design.note'],
  ['about.engineering', 'about.engineering.note'],
  ['about.manufacturing', 'about.manufacturing.note'],
  ['about.news', 'about.news.note'],
] as const;

const techData = [
  {
    title: 'technology.motor.title', detail: 'technology.motor.description',
    icon: <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />,
    iconBase: <circle cx="12" cy="12" r="3" />,
  },
  {
    title: 'technology.battery.title', detail: 'technology.battery.description',
    icon: <path d="M21 10v4M7 11v2M11 11v2" />,
    iconBase: <rect x="3" y="7" width="16" height="10" rx="2" />,
  },
  {
    title: 'technology.hinge.title', detail: 'technology.hinge.description',
    icon: <path d="M4 12h6l2-6 3 12 2-6h3" />, iconBase: null,
  },
  {
    title: 'technology.material.title', detail: 'technology.material.description',
    icon: <path d="M9 12l2 2 4-4" />,
    iconBase: <path d="M12 3 4 7v6c0 5 8 8 8 8s8-3 8-8V7z" />,
  },
  {
    title: 'technology.safety.title', detail: 'technology.safety.description',
    icon: <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />,
    iconBase: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /></>,
  },
] as const;

/** ALSVID Official homepage, shared by the WWW host and locale-prefixed routes. */
export function HomePage({ locale, myUrl, dealerUrl, switcherMode = 'path' }: { locale: Locale; myUrl: string; dealerUrl: string; switcherMode?: 'path' | 'query' }) {
  const text = (key: Parameters<typeof t>[1]) => t(locale, key);
  return (
    <main id="top">
      <HeroSection locale={locale} switcherMode={switcherMode} />

      <section id="platforms" className={home.sectionBlock}>
        <div className={home.sectionInner}>
          <Reveal>
            <div className={home.platHead}>
              <div>
                <p className={home.eyebrow}>{text('platforms.eyebrow')}</p>
                <h2 className={home.h2}>{text('platforms.title')}</h2>
                <a className={home.linkArrow} href="#featured">
                  {text('platforms.explore')}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </a>
              </div>
              <p className={home.platHeadNote}>{text('platforms.description')}</p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className={home.platCards}>
              {platformData.map((item) => (
                <a key={item.code} href="#featured" className={home.platCard}>
                  <div className={`${home.platSvg} ${item.skin}`}><BikeVector tone="dark" /></div>
                  <div className={home.platBody}>
                    <div>
                      <div className={home.platName}>{item.code} {text('platform.label')}</div>
                      <div className={home.platDesc}>{text(item.name)} · {text(item.note)}</div>
                    </div>
                    <span className={home.platGo} aria-hidden="true">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section id="featured" className={`${home.sectionBlock} ${home.featured}`}>
        <div className={home.sectionInner}>
          <Reveal>
            <div className={home.featGrid}>
              <div>
                <p className={home.eyebrow}>{text('featured.eyebrow')}</p>
                <h2 className={home.featTitle}>FC1</h2>
                <p className={home.featSlogan}>{text('featured.slogan')}</p>
                <p className={home.featDesc}>{text('featured.description')}</p>
                <a className={home.btnSolid} href="https://shop.chaibenn.com">{text('featured.explore')} <span aria-hidden="true">→</span></a>
              </div>
              <div className={home.featStage}><BikeVector tone="dark" /></div>
              <div className={home.featStats}>
                <div className={home.stat}><div className={home.statNum}><span>&lt;</span><CountUp to={18} /><span className={home.statUnit}>kg</span></div><div className={home.statLabel}>{text('featured.lightweight')}</div></div>
                <div className={home.stat}><div className={home.statNum}><CountUp to={100} /><span className={home.statUnit}>km</span></div><div className={home.statLabel}>{text('featured.range')}</div></div>
                <div className={home.stat}><div className={home.statNum}><CountUp to={3} /><span className={home.statUnit}>{text('featured.fold_time.unit')}</span></div><div className={home.statLabel}>{text('featured.fold_time')}</div></div>
                <div className={home.stat}><div className={home.statNum} style={{ fontSize: 20, paddingTop: 8 }}>FC {text('platform.label')}</div><div className={home.statLabel}>{text('featured.platform')}</div></div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className={home.sectionBlock}>
        <div className={home.sectionInner}>
          <Reveal>
            <div style={{ maxWidth: 520, marginBottom: 56 }}>
              <p className={home.eyebrow}>{text('folding.eyebrow')}</p>
              <h2 className={home.h2}>{text('folding.title')}</h2>
              <p style={{ fontSize: 13.5, color: 'var(--ink2, #4a4f58)', marginTop: 16 }}>{text('folding.description')}</p>
            </div>
          </Reveal>
          <Reveal delay={120}><FoldingDemo locale={locale} /></Reveal>
        </div>
      </section>

      <section id="tech" className={`${home.sectionBlock} ${home.tech}`}>
        <div className={home.sectionInner}>
          <Reveal>
            <div>
              <p className={home.eyebrow} style={{ color: '#5f6670' }}>{text('technology.eyebrow')}</p>
              <h2 className={home.h2}>{text('technology.title')}</h2>
              <p className={home.techDesc}>{text('technology.description')}</p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className={home.techGrid}>
              {techData.map((item) => (
                <div key={item.title} className={home.techItem} tabIndex={0}>
                  <div className={home.techIcon}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">{item.iconBase}{item.icon}</svg></div>
                  <div className={home.techT}>{text(item.title)}</div>
                  <p className={home.techMore}>{text(item.detail)}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={200}><a className={home.techCta} href="#tech">{text('technology.explore')} <span aria-hidden="true">→</span></a></Reveal>
        </div>
      </section>

      <section id="accessories" className={home.sectionBlock}>
        <div className={home.sectionInner}>
          <Reveal>
            <div className={legacy.splitHeader}>
              <div><h2 className={home.h2}>{text('accessories.title')}</h2><p style={{ fontSize: 13.5, color: 'var(--ink2, #4a4f58)' }}>{text('accessories.description')}</p></div>
              <a className={legacy.darkOutlineButton} href="https://shop.chaibenn.com">{text('accessories.all')} →</a>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className={legacy.accessoryGrid}>
              {accessoryData.map((item) => (
                <article className={legacy.accessoryCard} key={item.name}>
                  <div className={legacy.accessoryVisual} aria-hidden="true">{item.icon}</div>
                  <h3>{text(item.name)}</h3><p>{text(item.note)}</p>
                  <a href="https://shop.chaibenn.com">{text('accessory.buy')} →</a>
                </article>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section id="service" className={legacy.serviceSection}>
        <div className={legacy.serviceInner}>
          <div className={legacy.serviceImage} role="img" aria-label={text('service.title')} />
          <div className={legacy.serviceContent}>
            <div className={legacy.serviceTitle}><h2>{text('service.title')}</h2><span>{text('service.subtitle')}</span></div>
            <p>{text('service.description')}</p>
            <div className={legacy.serviceGrid}>
              {serviceData.map(([title, description]) => (
                <div className={legacy.serviceCard} key={title}><strong>{text(title)}</strong><span>{text(description)}</span></div>
              ))}
            </div>
            <div className={legacy.heroActions}><Link className={legacy.primaryButton} href={myUrl}>{text('service.enter')} →</Link></div>
          </div>
        </div>
      </section>

      <section id="about" className={legacy.aboutSection}>
        <div className={legacy.aboutInner}>
          <div className={legacy.aboutHeader}>
            <div className={legacy.aboutTitle}><h2>{text('about.title')}</h2><p>{text('about.description')}</p></div>
            <a className={legacy.darkOutlineButton} href="#about">{text('about.more')} →</a>
          </div>
          <div className={legacy.aboutGrid}>
            {aboutData.map(([title, description]) => (
              <article className={legacy.aboutCard} key={title}><h3>{text(title)}</h3><p>{text(description)}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section id="dealer" className={legacy.dealer}>
        <div className={legacy.dealerContent}>
          <p className={legacy.eyebrow}>{text('dealer.eyebrow')}</p>
          <h2>{text('dealer.title')}</h2><p>{text('dealer.description')}</p>
          <div className={legacy.heroActions}>
            <a className={legacy.primaryButton} href="#dealer">{text('dealer.apply')} →</a>
            <Link className={legacy.outlineButton} href={dealerUrl}>{text('dealer.login')}</Link>
          </div>
        </div>
      </section>

      <footer className={legacy.footer}>
        <div className={legacy.footerGrid}>
          <div className={legacy.footerBrand}><strong>ALSVID</strong><p>{text('footer.motto')}</p></div>
          <div className={legacy.footerColumn}><h4>{text('footer.bikes')}</h4><a href="#platforms">FC {text('platform.label')}</a><a href="#platforms">CT {text('platform.label')}</a><a href="#platforms">FT {text('platform.label')}</a><a href="#platforms">GT {text('platform.label')}</a></div>
          <div className={legacy.footerColumn}><h4>{text('footer.accessories')}</h4><a href="https://shop.chaibenn.com">{text('footer.accessories.overview')}</a><a href="https://shop.chaibenn.com">{text('footer.accessories.basket')}</a><a href="https://shop.chaibenn.com">{text('footer.accessories.rack')}</a><a href="https://shop.chaibenn.com">{text('footer.accessories.light')}</a></div>
          <div className={legacy.footerColumn}><h4>{text('footer.service')}</h4><Link href={myUrl}>{text('service.subtitle')}</Link><a href="#service">{text('footer.service.registration')}</a><a href="#service">{text('footer.service.warranty')}</a><a href="#service">{text('footer.service.manual')}</a></div>
          <div className={legacy.footerColumn}><h4>{text('footer.about')}</h4><a href="#about">{text('about.story')}</a><a href="#about">{text('about.design')}</a><a href="#about">{text('about.engineering')}</a><a href="#about">{text('about.manufacturing')}</a></div>
          <div className={legacy.footerColumn}><h4>{text('footer.dealers')}</h4><a href="#dealer">{text('footer.dealers.benefits')}</a><a href="#dealer">{text('footer.dealers.apply')}</a><Link href={dealerUrl}>{text('dealer.login')}</Link><a href="#about">{text('footer.contact')}</a></div>
        </div>
        <div className={legacy.footerBottom}><span>{text('footer.copyright')}</span><span>{text('footer.legal')} · {text('footer.region')}</span></div>
      </footer>
    </main>
  );
}
