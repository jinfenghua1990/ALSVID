import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogShell } from "../../_components/catalog/catalog-shell";
import { translator, type TranslationKey } from "../../_lib/i18n";
import { isLocale, locales } from "../../_lib/i18n/routing";
import styles from "./page.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ category?: string }> };
const categories = ["basket", "rack", "mudguard", "light", "parts"] as const;
type Category = typeof categories[number];
const marks: Record<Category, string> = { basket: "▱", rack: "≋", mudguard: "◒", light: "✦", parts: "⌘" };
const tones: Record<Category, string> = { basket: "basket", rack: "rack", mudguard: "mudguard", light: "light", parts: "parts" };

export function generateStaticParams() { return locales.map(locale => ({ locale })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = translator(locale);
  return {
    title: t("catalog.nav.accessories") + " | ALSVID",
    description: t("catalog.accessories.hero.body"),
    alternates: {
      canonical: `https://www.alsvidbike.com/${locale}/accessories`,
      languages: Object.fromEntries(locales.map(lang => [lang, `https://www.alsvidbike.com/${lang}/accessories`])),
    },
  };
}
export default async function AccessoriesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = translator(locale);
  const requested = (await searchParams).category;
  const selected: Category | null = categories.find(category => category === requested) ?? null;
  const visible = selected ? [selected] : categories;
  const base = "/" + locale;
  return <CatalogShell locale={locale} active="accessories">
    <main className={styles.page} data-accessories-catalog="1">
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>{t("catalog.accessories.hero.kicker")}</p>
          <h1>{t("catalog.accessories.hero.title")}</h1>
          <p>{t("catalog.accessories.hero.body")}</p>
          <a className={styles.heroButton} href="#categories">{t("catalog.accessories.hero.cta")}</a>
        </div>
        <div className={styles.art} aria-hidden="true">
          <div className={styles.artOrb}><span>ALSVID</span><i>✦</i></div>
          <div className={styles.artIndex}>01 — 05</div>
        </div>
      </section>
      <section className={styles.section} aria-labelledby="categories-title" id="categories">
        <div className={styles.sectionHeading}>
          <div><p className={styles.kicker}>{t("catalog.accessories.categories.kicker")}</p><h2 id="categories-title">{t("catalog.accessories.categories.title")}</h2></div>
          <p>{t("catalog.accessories.categories.body")}</p>
        </div>
        <nav className={styles.filters} aria-label={t("catalog.accessories.categories.title")}>
          <a href={base + "/accessories#categories"} aria-current={!selected ? "page" : undefined}>{t("catalog.accessories.categories.all")}</a>
          {categories.map(category => <a key={category} href={base + "/accessories?category=" + category + "#categories"} aria-current={selected === category ? "page" : undefined}>{t(`accessories.${category}.title` as TranslationKey)}</a>)}
        </nav>
        <div className={styles.grid}>
          {visible.map((category, index) => <article className={styles.card} key={category}>
            <div className={styles.visual + " " + styles[tones[category]]} aria-hidden="true">
              <span>{marks[category]}</span>
              <small>ALSVID / {String(index + 1).padStart(2, "0")}</small>
            </div>
            <div className={styles.cardInfo}>
              <span className={styles.status}>{t("catalog.accessories.categories.pending")}</span>
              <h3>{t(`accessories.${category}.title` as TranslationKey)}</h3>
              <p>{t(`accessories.${category}.description` as TranslationKey)}</p>
              <a href={base + "/explore/accessory-" + category}>{t("catalog.accessories.categories.view")}</a>
            </div>
          </article>)}
        </div>
      </section>
      <section className={styles.compat}>
        <div className={styles.compatCopy}><p className={styles.kicker}>{t("catalog.accessories.compat.kicker")}</p><h2>{t("catalog.accessories.compat.title")}</h2><p>{t("catalog.accessories.compat.body")}</p><a href={base + "/bikes"}>{t("catalog.accessories.compat.bikes")}</a></div>
        <div className={styles.compatPanel}>
          <span className={styles.panelLabel}>{t("catalog.accessories.compat.status")}</span>
          <div className={styles.mockSelector}><span>FC1</span><span>FC2</span><span>CT</span><span>FT</span><span>GT</span></div>
          <p>{t("catalog.accessories.compat.body")}</p>
        </div>
      </section>
      <div className={styles.preview}>{t("catalog.shared.preview")}</div>
    </main>
  </CatalogShell>;
}
