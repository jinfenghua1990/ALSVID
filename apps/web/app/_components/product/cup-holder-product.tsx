import { CatalogShell } from "../catalog/catalog-shell";
import { translator, type Locale } from "../../_lib/i18n";
import { CupHolderGallery } from "./cup-holder-gallery";
import styles from "./cup-holder-product.module.css";

export function CupHolderProductPage({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const back = "/" + locale + "/bikes#accessories";
  const specs = [
    [t("cup.spec.type"), t("cup.spec.type.value")],
    [t("cup.spec.mount"), t("cup.spec.mount.value")],
    [t("cup.spec.colours"), t("cup.spec.colours.value")],
    [t("cup.spec.fit"), t("cup.spec.fit.value")],
  ];
  return <CatalogShell locale={locale} active="bikes">
    <main className={styles.page} data-cup-holder-product="1">
      <section className={styles.hero}>
        <CupHolderGallery locale={locale} />
        <div className={styles.copy}><p className={styles.eyebrow}>{t("cup.eyebrow")}</p>
          <h1>{t("cup.name")}</h1><h2>{t("cup.headline")}</h2><p>{t("cup.intro")}</p>
          <a className={styles.button} href="#details">{t("common.learn_more")}</a>
        </div>
      </section>
      <section className={styles.details} id="details"><h2>{t("cup.details")}</h2>
        <div className={styles.cards}>
          <article><span aria-hidden="true">01</span><h3>{t("cup.release.title")}</h3><p>{t("cup.release.body")}</p></article>
          <article><span aria-hidden="true">02</span><h3>{t("cup.pad.title")}</h3><p>{t("cup.pad.body")}</p></article>
          <article><span aria-hidden="true">03</span><h3>{t("cup.colours.title")}</h3><p>{t("cup.colours.body")}</p></article>
        </div>
      </section>
      <section className={styles.specSection}><h2>{t("cup.specs")}</h2>
        <dl className={styles.specs}>{specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </section>
      <section className={styles.compat}><h2>{t("cup.compat.title")}</h2><p>{t("cup.compat.body")}</p>
        <p className={styles.eyebrow}>{t("cup.status")}</p><p>{t("cup.availability")}</p>
        <div className={styles.links}><a className={styles.button} href={back}>{t("cup.back")}</a>
          <a className={styles.source} href="https://detail.tmall.com/item.htm?id=1078320934699&skuId=6131591429005" target="_blank" rel="noreferrer">{t("cup.source")}</a></div>
      </section>
    </main>
  </CatalogShell>;
}
