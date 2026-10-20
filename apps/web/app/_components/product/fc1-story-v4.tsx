import type { Metadata } from "next";
import { LanguageSwitcher } from "../language-switcher";
import { isLocale, locales, type Locale } from "../../_lib/i18n/routing";
import { translator, type TranslationKey } from "../../_lib/i18n";
import { ProductGallery, FoldStatePreview, SpecificationFilters } from "./fc1-interactions";
import baseStyles from "./fc1-product.module.css";
import storyStyles from "./fc1-story-v4.module.css";
import { Fc1ScrollStory } from "./fc1-scroll-story";
import { Fc1ColourConfigurator } from "./fc1-colour-configurator";

const styles: Record<string, string> = Object.fromEntries(
  [...new Set([...Object.keys(baseStyles), ...Object.keys(storyStyles)])].map((name) =>
    [name, [baseStyles[name], storyStyles[name]].filter(Boolean).join(" ")],
  ),
);
import { fc1Photos } from "./fc1-photos";

export async function generateFc1Metadata(localeValue: string): Promise<Metadata> {
  if (!isLocale(localeValue)) return {};
  const locale = localeValue;
  const t = translator(locale);
  const languages = Object.fromEntries(locales.map((item) => [item, `https://www.alsvidbike.com/${item}/explore/fc1`])) as Record<Locale, string>;
  return {
    title: t("fc1.title"),
    description: t("fc1.description"),
    alternates: {
      canonical: `https://www.alsvidbike.com/${locale}/explore/fc1`,
      languages: { ...languages, "x-default": "https://www.alsvidbike.com/en/explore/fc1" },
    },
    openGraph: { title: t("fc1.title"), description: t("fc1.description"), images: ["/products/fc1/side.webp"] },
  };
}

const specs: { id: string; status: "reference" | "option" | "pending" }[] = [
  { id: "platform", status: "reference" }, { id: "step", status: "reference" },
  { id: "folded", status: "reference" }, { id: "fit", status: "reference" },
  { id: "weight", status: "reference" }, { id: "drivetrain", status: "reference" },
  { id: "eu", status: "reference" }, { id: "other", status: "option" },
  { id: "battery", status: "reference" }, { id: "range", status: "reference" },
  { id: "charge", status: "reference" }, { id: "front", status: "reference" },
  { id: "rear", status: "reference" }, { id: "brakes", status: "reference" },
  { id: "tyres", status: "pending" }, { id: "riderweight", status: "reference" },
  { id: "bottle", status: "option" }, { id: "colour", status: "pending" },
  { id: "build", status: "pending" }, { id: "compliance", status: "pending" },
];

export function Fc1StoryPage({ locale, myUrl }: { locale: Locale; myUrl: string }) {
  const t = translator(locale);
  const key = (value: string) => t(value as TranslationKey);
  const formatWeight = (value: number) => `${new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)} kg`;
  return (
    <Fc1ScrollStory>
    <main className={styles.page} lang={locale} data-fc1-version="4">
      <div className={styles.reviewBanner}>{key("fc1.preview")}</div>
      <header className={styles.header}>
        <a className={styles.logo} href={`/${locale}/`}><img src="/home/alsvid-bike-motion.svg" alt="" width="74" height="42" /> <span>ALSVID</span></a>
        <div className={styles.headerActions}>
          <a href={`/${locale}/`}>{key("fc1.home")}</a>
          <a href="#specifications">{key("fc1.specifications")}</a>
          <a href="#faq">{key("fc1.questions")}</a>
          <a className={styles.headerShop} href="#configure">{key("fc1.selection.cta_configure")} ↗</a>
          <LanguageSwitcher locale={locale} label={key("fc1.language")} variant="globe" />
        </div>
      </header>
      <div className={styles.main}>
        <section id="overview" className={`${styles.hero} ${styles.interestHero}`} data-fc1-chapter>
          <Fc1ColourConfigurator locale={locale} />
        </section>
        <nav className={styles.chapterNav} aria-label={key("fc1.highlights")}>
          <a href="#entry">{key("fc1.story.nav.frame")}</a>
          <a href="#folding">{key("fc1.story.nav.fold")}</a>
          <a href="#details">{key("fc1.story.nav.comfort")}</a>
          <a href="#drive">{key("fc1.story.nav.drive")}</a>
          <a href="#battery">{key("fc1.story.nav.battery")}</a>
          <a href="#specifications">{key("fc1.specifications")}</a>
        </nav>
        <section className={styles.featureOverview} aria-labelledby="feature-overview-title" data-fc1-chapter>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>ALSVID FC1</p>
            <h2 id="feature-overview-title">{key("fc1.story.overview.title")}</h2>
          </div>
          <p className={styles.featureIntro}>{key("fc1.story.overview.subtitle")}</p>
          <div className={styles.featureGrid}>
            <a className={`${styles.featureCard} ${styles.featureCardHero}`} href="#entry" data-feature="hero">
              <div className={styles.featurePhoto}><img {...fc1Photos.side} alt="" loading="lazy" /></div>
              <div className={styles.featureCardCopy}>
                <span className={styles.featureNumber}>01 / ALSVID FC1</span>
                <h3>{key("fc1.story.feature.ride")}</h3>
                <p className={styles.featureDescription}>{key("fc1.story.feature.ride.body")}</p>
                <span className={styles.featureArrow} aria-hidden="true">↗</span>
              </div>
            </a>
            <a className={`${styles.featureCard} ${styles.featureCardFold}`} href="#folding" data-feature="fold">
              <div className={styles.featurePhoto}><img {...fc1Photos.folded} alt="" loading="lazy" /></div>
              <div className={styles.featureCardCopy}>
                <span className={styles.featureNumber}>02 / ALSVID FC1</span>
                <h3>{key("fc1.story.feature.fold")}</h3>
                <p className={styles.featureDescription}>{key("fc1.story.feature.fold.body")}</p>
                <span className={styles.featureArrow} aria-hidden="true">↗</span>
              </div>
            </a>
            <a className={`${styles.featureCard} ${styles.featureCardFrame}`} href="#entry" data-feature="frame">
              <div className={styles.featurePhoto}><img {...fc1Photos["rear-three-quarter"]} alt="" loading="lazy" /></div>
              <div className={styles.featureCardCopy}>
                <span className={styles.featureNumber}>03 / ALSVID FC1</span>
                <h3>{key("fc1.story.feature.frame")}</h3>
                <p className={styles.featureDescription}>{key("fc1.story.feature.frame.body")}</p>
                <span className={styles.featureArrow} aria-hidden="true">↗</span>
              </div>
            </a>
            <a className={`${styles.featureCard} ${styles.featureCardComfort}`} href="#details" data-feature="comfort">
              <div className={styles.featurePhoto}><img {...fc1Photos["hidden-carbon-front-suspension"]} alt="" loading="lazy" /></div>
              <div className={styles.featureCardCopy}>
                <span className={styles.featureNumber}>04 / ALSVID FC1</span>
                <h3>{key("fc1.story.feature.comfortBrakes")}</h3>
                <p className={styles.featureDescription}>{key("fc1.story.feature.comfortBrakes.body")}</p>
                <span className={styles.featureArrow} aria-hidden="true">↗</span>
              </div>
            </a>
            <a className={`${styles.featureCard} ${styles.featureCardDrive}`} href="#drive" data-feature="drive">
              <div className={styles.featurePhoto}><img {...fc1Photos["shimano-chain-drivetrain"]} alt="" loading="lazy" /></div>
              <div className={styles.featureCardCopy}>
                <span className={styles.featureNumber}>05 / ALSVID FC1</span>
                <h3>{key("fc1.story.feature.driveBattery")}</h3>
                <p className={styles.featureDescription}>{key("fc1.story.feature.driveBattery.body")}</p>
                <span className={styles.featureArrow} aria-hidden="true">↗</span>
              </div>
            </a>
          </div>
          <p className={styles.smallNote}>{key("fc1.photo.note")}</p>
        </section>
        <section data-fc1-chapter id="entry" className={`${styles.section} ${styles.split}`}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>{key("fc1.section.entry.kicker")}</p>
            <h2>{key("fc1.section.entry.title")}</h2>
            <p>{key("fc1.section.entry.body")}</p>
            <div className={styles.measure}><strong>40 <small>cm</small></strong><span>{key("fc1.metric.step")}</span></div>
          </div>
          <div className={styles.frameVisual}>
            <img {...fc1Photos["rear-three-quarter"]} alt={key("fc1.photo.alt")} loading="lazy" />
          </div>
        </section>
        <section data-fc1-chapter id="folding" className={`${styles.section} ${styles.foldStory}`}>
          <FoldStatePreview locale={locale} />
        </section>
        <section data-fc1-chapter id="details" className={`${styles.section} ${styles.narrativeSection}`}>
          <div className={styles.narrativeLayout}>
            <figure className={styles.narrativeMedia}><img {...fc1Photos["hidden-carbon-front-suspension"]} alt={key("fc1.gallery.front")} loading="lazy" /></figure>
            <div className={styles.narrativeCopy}>
              <p className={styles.eyebrow}>{key("fc1.position.front")} / 03</p>
              <h2>{key("fc1.hotspot.front")}</h2>
              <p>{key("fc1.hotspot.front.body")}</p>
            </div>
          </div>
        </section>
        <section data-fc1-chapter id="details-rear" className={`${styles.section} ${styles.narrativeSection} ${styles.narrativeReverse}`}>
          <div className={styles.narrativeLayout}>
            <figure className={styles.narrativeMedia}><img {...fc1Photos["dnm-rear-air-shock"]} alt={key("fc1.gallery.shock")} loading="lazy" /></figure>
            <div className={styles.narrativeCopy}>
              <p className={styles.eyebrow}>{key("fc1.position.rear")} / 03</p>
              <h2>{key("fc1.hotspot.rear")}</h2>
              <p>{key("fc1.hotspot.rear.body")}</p>
            </div>
          </div>
        </section>
        <section data-fc1-chapter id="drive" className={`${styles.section} ${styles.narrativeSection} ${styles.narrativeDark}`}>
          <div className={styles.narrativeLayout}>
            <figure className={styles.narrativeMedia}><img {...fc1Photos["shimano-chain-drivetrain"]} alt={key("fc1.gallery.chain")} loading="lazy" /></figure>
            <div className={styles.narrativeCopy}>
              <p className={styles.eyebrow}>{key("fc1.section.drive.kicker")}</p>
              <h2>{key("fc1.section.drive.title")}</h2>
              <p>{key("fc1.section.drive.body")}</p>
              <div className={styles.narrativeSpecs}>
                <div><strong>250 W</strong><span>{key("fc1.drive.power")}</span></div>
                <div><strong>40 Nm</strong><span>{key("fc1.drive.torque")}</span></div>
                <div><strong>25 km/h</strong><span>{key("fc1.drive.cutoff")}</span></div>
                <div><strong>{key("fc1.drive.sensor_value")}</strong><span>{key("fc1.drive.sensor")}</span></div>
              </div>
              <aside className={styles.narrativeDisclaimer}><strong>{key("fc1.market.title")}</strong><p>{key("fc1.market.body")}</p></aside>
            </div>
          </div>
        </section>
        <section data-fc1-chapter id="battery" className={`${styles.section} ${styles.narrativeSection} ${styles.narrativeReverse} ${styles.narrativeBattery}`}>
          <div className={styles.narrativeLayout}>
            <figure className={styles.narrativeMedia}><img {...fc1Photos["rear-three-quarter"]} alt={key("fc1.photo.alt")} loading="lazy" /></figure>
            <div className={styles.narrativeCopy}>
              <p className={styles.eyebrow}>{key("fc1.section.battery.kicker")}</p>
              <h2>{key("fc1.section.battery.title")}</h2>
              <p>{key("fc1.section.battery.body")}</p>
              <div className={styles.narrativeSpecs}>
                <div><strong>360 <small>Wh</small></strong><span>36 V · 10 Ah</span></div>
                <div><strong>4–6 <small>h</small></strong><span>{key("fc1.spec.charge.label")}</span></div>
                <div><strong>80 <small>km¹</small></strong><span>{key("fc1.metric.range")}</span></div>
              </div>
              <p className={styles.narrativeDisclaimer}>{key("fc1.battery.range_note")}</p>
            </div>
          </div>
        </section>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>{key("fc1.section.config.kicker")}</p>
            <h2>{key("fc1.section.config.title")}</h2>
          </div>
          <div className={styles.configGrid}>
            <article><span>01 / {key("fc1.status.reference")}</span><h3>{key("fc1.config.chain.title")}</h3><div className={styles.configWeight}>{formatWeight(15.5)}</div><p>{key("fc1.config.chain.body")}</p></article>
            <article><span>02 / {key("fc1.status.option")}</span><h3>{key("fc1.config.belt.title")}</h3><div className={styles.configWeight}>{formatWeight(14.5)}</div><p>{key("fc1.config.belt.body")}</p></article>
          </div>
          <p className={styles.smallNote}>{key("fc1.config.note")}</p>
        </section>

        <section data-fc1-chapter id="safety" className={styles.safetySection}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>{key("fc1.story.safety.kicker")}</p>
            <h2>{key("fc1.story.safety.title")}</h2>
            <p>{key("fc1.story.safety.body")}</p>
          </div>
          <div className={styles.safetyGrid}>
            <figure><img {...fc1Photos["hidden-carbon-front-suspension"]} alt={key("fc1.gallery.front")} loading="lazy" /><figcaption>{key("fc1.spec.brakes.value")}</figcaption></figure>
            <div>
              <article><span>01</span><h3>{key("fc1.story.safety.brakes")}</h3><p>{key("fc1.spec.brakes.value")}</p></article>
              <article><span>02</span><h3>{key("fc1.story.safety.everyday")}</h3><p>{key("fc1.story.safety.everyday.body")}</p></article>
              <a className={styles.buttonDark} href="#specifications">{key("fc1.selection.cta")} <span aria-hidden="true">↗</span></a>
            </div>
          </div>
        </section>
        <section data-fc1-chapter id="gallery" className={`${styles.section} ${styles.gallerySection}`}>
          <div className={styles.galleryPin}>
            <div className={styles.sectionHeader}><p className={styles.eyebrow}>ALSVID FC1</p><h2>{key("fc1.gallery")}</h2></div>
            <ProductGallery locale={locale} />
          </div>
        </section>
        <section data-fc1-chapter id="specifications" className={`${styles.section} ${styles.specSection}`}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>{key("fc1.section.specs.kicker")}</p>
            <h2>{key("fc1.section.specs.title")}</h2>
            <p>{key("fc1.section.specs.body")}</p>
          </div>
          <SpecificationFilters locale={locale}>
            {specs.map(({ id, status }) => (
              <tr key={id} data-status={status}>
                <th scope="row">{key(`fc1.spec.${id}.label`)}</th>
                <td>{key(`fc1.spec.${id}.value`)}</td>
                <td><span className={`${styles.status} ${styles[status]}`}>{key(`fc1.status.${status}`)}</span></td>
              </tr>
            ))}
          </SpecificationFilters>
          <p className={styles.rangeNote}>{key("fc1.battery.range_note")}</p>
        </section>
        <section data-fc1-chapter id="faq" className={`${styles.section} ${styles.faq}`}>
          <h2>{key("fc1.section.faq.title")}</h2>
          <div className={styles.faqList}>
            {Array.from({ length: 8 }, (_, i) => (
              <details key={i}>
                <summary>{key(`fc1.faq.${i}.q`)}</summary>
                <p>{key(`fc1.faq.${i}.a`)}</p>
              </details>
            ))}
          </div>
        </section>
        <section className={styles.cta}>
          <p className={styles.eyebrow}>ALSVID FC1</p>
          <h2>{key("fc1.cta.title")}</h2>
          <p>{key("fc1.cta.body")}</p>
          <a className={`${styles.buttonDark} ${styles.button}`} href="#configure">{key("fc1.selection.cta_configure")} <span aria-hidden="true">↗</span></a>
          <p className={styles.smallNote}>{key("fc1.reservation.note")}</p>
        </section>

        <section data-fc1-chapter className={styles.sceneBand} aria-label={key("hero.poster_tagline")}>
          <div><p className={styles.eyebrow}>ALSVID FC1</p><h2>{key("hero.poster_title")}</h2><p>{key("hero.poster_tagline")}</p></div>
        </section>
        <p className={styles.sourceNote}>{key("fc1.source")} <a href="#specifications">{key("fc1.source.link")}</a></p>
      </div>
      <footer className={styles.footer}>
        <a className={styles.logo} href={`/${locale}/`}>ALSVID</a>
        <p>{key("fc1.footer")}</p>
        <a href={myUrl}>{key("services.title")}</a>
      </footer>
    </main>
    </Fc1ScrollStory>
  );
}
