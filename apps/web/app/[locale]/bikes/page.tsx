import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogShell } from "../../_components/catalog/catalog-shell";
import { BikesModelNavigator } from "../../_components/catalog/bikes-model-navigator";
import { AccessoriesCatalogSection } from "../../_components/catalog/accessories-catalog-section";
import { translator, type TranslationKey } from "../../_lib/i18n";
import { isLocale, locales } from "../../_lib/i18n/routing";
import styles from "./page.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ platform?: string; category?: string }> };
const platformIds = ["fc", "ct", "ft", "gt"] as const;
type PlatformId = typeof platformIds[number];
const platformAssets: Record<PlatformId, string> = {
  fc: "/home/original/fc1-product.webp",
  ct: "/home/original/scene-city.webp",
  ft: "/home/original/scene-fat-tire.webp",
  gt: "/home/original/scene-touring.webp",
};

export function generateStaticParams() { return locales.map(locale => ({ locale })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = translator(locale);
  return {
    title: t("catalog.nav.bikes") + " | ALSVID",
    description: t("catalog.bikes.hero.body"),
    alternates: {
      canonical: `https://www.alsvidbike.com/${locale}/bikes`,
      languages: Object.fromEntries(locales.map(lang => [lang, `https://www.alsvidbike.com/${lang}/bikes`])),
    },
  };
}

export default async function BikesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = translator(locale);
  const query = await searchParams;
  const requested = query.platform?.toLowerCase();
  const active: PlatformId | null = platformIds.find(id => id === requested) ?? null;
  const prefix = "/" + locale;
  const models = [
    { id: "fc1", name: t("product.model_fc1"), status: t("catalog.bikes.models.fc1"), image: "/home/original/fc1-product.webp", alt: t("images.product") },
    { id: "fc2", name: t("fc2.model"), status: t("catalog.bikes.models.fc2"), image: "/products/fc2/side-studio-1536.webp", alt: t("fc2.gallery.alt.side") },
  ];
  return <CatalogShell locale={locale} active="bikes">
    <main className={styles.page} lang={locale} data-bikes-catalog="1">
      {(!active || active === "fc") && <BikesModelNavigator title={t("catalog.bikes.modelNav.title")} models={models.map(({ id, name }) => ({ id, name }))} />}
      <section className={styles.hero} data-bikes-hero>
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>{t("catalog.bikes.hero.kicker")}</span>
          <h1>{t("catalog.bikes.hero.title")}</h1>
          <p>{t("catalog.bikes.hero.body")}</p>
          <a className={styles.heroButton} href="#models">{t("catalog.bikes.hero.cta")}</a>
        </div>
        <img className={styles.heroImage} src="/home/original/fc1-product.webp" alt={t("images.product")} width={1536} height={1024} />
        <span className={styles.heroWatermark} aria-hidden="true">ALSVID</span>
      </section>

      <nav className={styles.catalogTabs} aria-label={t("catalog.product.tabs.label")}>
        <a href="#models">{t("catalog.product.tabs.bikes")}</a>
        <a href="#accessories">{t("catalog.product.tabs.accessories")}</a>
      </nav>

      <section className={styles.section} aria-labelledby="platforms-title" id="platforms">
        <div className={styles.sectionHeading}>
          <div><p className={styles.kicker}>{t("catalog.bikes.platforms.kicker")}</p><h2 id="platforms-title">{t("catalog.bikes.platforms.title")}</h2></div>
          <p>{t("catalog.bikes.platforms.body")}</p>
        </div>
        <div className={styles.platformGrid}>
          {platformIds.map(id => <a className={styles.platformCard} key={id} href={prefix + "/explore/" + id}>
            <img src={platformAssets[id]} width={1536} height={1024} alt="" loading="lazy" />
            <span className={styles.platformShade} />
            <div className={styles.platformText}><span>{t(`platform.${id}.code` as TranslationKey)}</span><h3>{t(`platform.${id}.title` as TranslationKey)}</h3><small>{t("catalog.bikes.platforms.link")}</small></div>
          </a>)}
        </div>
      </section>

      <section className={styles.section + " " + styles.modelSection} aria-labelledby="models-title" id="models">
        <div className={styles.sectionHeading}>
          <div><p className={styles.kicker}>{t("catalog.bikes.models.kicker")}</p><h2 id="models-title">{t("catalog.bikes.models.title")}</h2></div>
          <p>{t("catalog.bikes.models.body")}</p>
        </div>
        <nav className={styles.filters} aria-label={t("catalog.bikes.filter.label")}>
          <a href={prefix + "/bikes#models"} aria-current={!active ? "page" : undefined}>{t("catalog.bikes.filter.all")}</a>
          {platformIds.map(id => <a key={id} href={prefix + "/bikes?platform=" + id + "#models"} aria-current={active === id ? "page" : undefined}>{id.toUpperCase()}</a>)}
        </nav>
        {!active || active === "fc" ? <div className={styles.modelGrid}>
          {models.map(model => <article className={styles.modelCard} key={model.id} id={"model-" + model.id} aria-labelledby={"model-" + model.id + "-title"}>
            <a href={prefix + "/explore/" + model.id} className={styles.modelImageLink} aria-label={model.name}>
              <img src={model.image} width={1536} height={1024} alt={model.alt} loading="lazy" />
            </a>
            <div className={styles.modelInfo}><div><span className={styles.status}>{model.status}</span><h3 id={"model-" + model.id + "-title"}>{model.name}</h3><p>FC PLATFORM</p></div>
              <a href={prefix + "/explore/" + model.id}>{t("catalog.bikes.models.details")}</a>
            </div>
          </article>)}
        </div> : <div className={styles.empty}>
          <span>{active.toUpperCase()} PLATFORM</span>
          <h3>{t(`platform.${active}.title` as TranslationKey)}</h3>
          <p>{t("catalog.bikes.models.none")}</p>
          <a href={prefix + "/explore/" + active}>{t("catalog.bikes.platforms.link")}</a>
        </div>}
      </section>

      <section className={styles.guide}>
        <div><p className={styles.kicker}>{t("catalog.bikes.compare.kicker")}</p><h2>{t("catalog.bikes.compare.title")}</h2><p>{t("catalog.bikes.compare.body")}</p><a href="#accessories">{t("catalog.bikes.compare.cta")}</a></div>
        <div className={styles.guideTable} role="table" aria-label={t("catalog.bikes.compare.title")}>
          <div role="row" className={styles.guideHead}><span role="columnheader">{t("catalog.bikes.compare.model")}</span><span role="columnheader">{t("catalog.bikes.compare.platform")}</span><span role="columnheader">{t("catalog.bikes.compare.state")}</span></div>
          {models.map(model => <a role="row" key={model.id} href={prefix + "/explore/" + model.id}><strong role="cell">{model.name}</strong><span role="cell">FC</span><span role="cell">{model.status}</span></a>)}
        </div>
      </section>
      <AccessoriesCatalogSection locale={locale} selectedCategory={query.category} />
      <div className={styles.preview}>{t("catalog.shared.preview")}</div>
    </main>
  </CatalogShell>;
}
