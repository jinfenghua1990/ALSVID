import type { Metadata } from "next";
import { LanguageSwitcher } from "../language-switcher";
import { isLocale, locales, type Locale } from "../../_lib/i18n/routing";
import { translator, type TranslationKey } from "../../_lib/i18n";
import { ProductGallery, ColourSelector, FoldStatePreview, ComponentHotspots, SpecificationFilters } from "./fc1-interactions";
import styles from "./fc1-product.module.css";

export async function generateFc1Metadata(localeValue: string): Promise<Metadata> {
  if (!isLocale(localeValue)) return {};
  const locale = localeValue;
  const t = translator(locale);
  const languages = Object.fromEntries(locales.map((item) => [item, `https://www.chaibenn.com/${item}/explore/fc1`])) as Record<Locale, string>;
  return {
    title: t("fc1.title"),
    description: t("fc1.description"),
    alternates: {
      canonical: `https://www.chaibenn.com/${locale}/explore/fc1`,
      languages: { ...languages, "x-default": "https://www.chaibenn.com/en/explore/fc1" },
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

export function Fc1ProductPage({ locale, myUrl }: { locale: Locale; myUrl: string }) {
  const t = translator(locale);
  const key = (value: string) => t(value as TranslationKey);
  const formatWeight = (value: number) => `${new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)} kg`;
  return (
    <main className={styles.page} lang={locale}>
      <div className={styles.reviewBanner}>{key("fc1.preview")}</div>
      <header className={styles.header}>
        <a className={styles.logo} href={`/${locale}/`}>ALSVID</a>
        <div className={styles.headerActions}>
          <a href={`/${locale}/`}>{key("fc1.home")}</a>
          <a href="#specifications">{key("fc1.specifications")}</a>
          <a href="#faq">{key("fc1.questions")}</a>
          <LanguageSwitcher locale={locale} label={key("fc1.language")} />
        </div>
      </header>
      <div className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{key("fc1.eyebrow")}</p>
            <h1>{key("fc1.heading")}</h1>
            <p>{key("fc1.intro")}</p>
            <div className={styles.heroCtas}>
              <a className={styles.buttonDark} href="#colours">{key("fc1.colours.title")} <span aria-hidden="true">↘</span></a>
              <a className={styles.buttonLight} href="#specifications">{key("fc1.specifications")}</a>
            </div>
          </div>
          <div className={styles.heroVisual}><ProductGallery locale={locale} /></div>
        </section>
        <section className={styles.stats} aria-label={key("fc1.highlights")}>
          <div><strong>40 <small>cm</small></strong><span>{key("fc1.metric.step")}</span></div>
          <div><strong>85 × 69 × 48</strong><span>{key("fc1.metric.folded")}</span></div>
          <div><strong>{new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(15.5)} <small>kg</small></strong><span>{key("fc1.metric.weight")}</span></div>
          <div><strong>80 <small>km¹</small></strong><span>{key("fc1.metric.range")}</span></div>
        </section>
        <section id="colours" className={styles.colourBand}>
          <div>
            <p className={styles.eyebrow}>{key("fc1.colours.kicker")}</p>
            <h2>{key("fc1.colours.title")}</h2>
            <p>{key("fc1.colours.body")}</p>
          </div>
          <ColourSelector locale={locale} />
        </section>
        <section id="entry" className={`${styles.section} ${styles.split}`}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>{key("fc1.section.entry.kicker")}</p>
            <h2>{key("fc1.section.entry.title")}</h2>
            <p>{key("fc1.section.entry.body")}</p>
          </div>
          <div className={styles.frameVisual}>
            <img src="/products/fc1/rear-three-quarter.webp" alt={key("fc1.photo.alt")} width="1536" height="1024" loading="lazy" />
            <div className={styles.measure}><strong>40 cm</strong><span>{key("fc1.metric.step")}</span></div>
          </div>
        </section>
        <section id="folding" className={`${styles.section} ${styles.split} ${styles.splitReverse}`}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>{key("fc1.section.fold.kicker")}</p>
            <h2>{key("fc1.section.fold.title")}</h2>
            <p>{key("fc1.section.fold.body")}</p>
          </div>
          <FoldStatePreview locale={locale} />
        </section>
        <section id="details" className={`${styles.section} ${styles.darkSection}`}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>{key("fc1.section.detail.kicker")}</p>
            <h2>{key("fc1.section.detail.title")}</h2>
            <p>{key("fc1.section.detail.body")}</p>
          </div>
          <ComponentHotspots locale={locale} />
        </section>
        <section className={`${styles.section} ${styles.darkSection}`}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>{key("fc1.section.drive.kicker")}</p>
            <h2>{key("fc1.section.drive.title")}</h2>
            <p>{key("fc1.section.drive.body")}</p>
          </div>
          <div className={styles.driveGrid}>
            <div className={styles.driveImage}><img src="/products/fc1/handlebar-display.webp" alt={key("fc1.gallery.controls")} width="1536" height="1024" loading="lazy" /></div>
            <div>
              <div className={styles.driveNumbers}>
                <div><strong>250 W</strong><span>{key("fc1.drive.power")}</span></div>
                <div><strong>40 Nm</strong><span>{key("fc1.drive.torque")}</span></div>
                <div><strong>25 km/h</strong><span>{key("fc1.drive.cutoff")}</span></div>
                <div><strong>{key("fc1.drive.sensor_value")}</strong><span>{key("fc1.drive.sensor")}</span></div>
              </div>
              <aside className={styles.marketNote}><strong>{key("fc1.market.title")}</strong><p>{key("fc1.market.body")}</p></aside>
            </div>
          </div>
        </section>
        <section className={`${styles.section} ${styles.batteryBand}`}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>{key("fc1.section.battery.kicker")}</p>
            <h2>{key("fc1.section.battery.title")}</h2>
            <p>{key("fc1.section.battery.body")}</p>
          </div>
          <div className={styles.batteryCards}>
            <div><strong>360 <small>Wh</small></strong><span>36 V · 10 Ah</span></div>
            <div><strong>4–6 <small>h</small></strong><span>{key("fc1.spec.charge.label")}</span></div>
            <div><strong>80 <small>km¹</small></strong><span>{key("fc1.metric.range")}</span></div>
          </div>
          <p className={styles.rangeNote}>{key("fc1.battery.range_note")}</p>
        </section>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>{key("fc1.section.config.kicker")}</p>
            <h2>{key("fc1.section.config.title")}</h2>
          </div>
          <div className={styles.configGrid}>
            <article><span>01 / {key("fc1.status.reference")}</span><h3>{key("fc1.config.chain.title")}</h3><div className={styles.configWeight}>{formatWeight(15.5)}</div><p>{key("fc1.config.chain.body")}</p><img src="/products/fc1/shimano-chain-drivetrain.webp" alt={key("fc1.gallery.chain")} width="1536" height="1024" loading="lazy" /></article>
            <article><span>02 / {key("fc1.status.option")}</span><h3>{key("fc1.config.belt.title")}</h3><div className={styles.configWeight}>{formatWeight(14.5)}</div><p>{key("fc1.config.belt.body")}</p></article>
          </div>
          <p className={styles.smallNote}>{key("fc1.config.note")}</p>
        </section>
        <section id="specifications" className={`${styles.section} ${styles.specSection}`}>
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
        <section id="faq" className={styles.faq}>
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
          <a className={`${styles.buttonDark} ${styles.button}`} href="https://shop.chaibenn.com/" target="_blank" rel="noreferrer">{key("fc1.cta.shop")} <span aria-hidden="true">↗</span></a>
          <p className={styles.smallNote}>{key("fc1.cta.shop_note")}</p>
        </section>
        <p className={styles.sourceNote}>{key("fc1.source")} <a href="https://naicisports.com/de/produkt/pilot-x9-carbon-falt-e-bike-mit-tiefem-einstieg/#specifications" target="_blank" rel="noreferrer">{key("fc1.source.link")}</a></p>
      </div>
      <footer className={styles.footer}>
        <a className={styles.logo} href={`/${locale}/`}>ALSVID</a>
        <p>{key("fc1.footer")}</p>
        <a href={myUrl}>{key("services.title")}</a>
      </footer>
    </main>
  );
}
