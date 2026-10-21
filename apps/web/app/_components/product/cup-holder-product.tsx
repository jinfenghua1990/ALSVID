import { CatalogShell } from "../catalog/catalog-shell";
import { translator, type Locale } from "../../_lib/i18n";
import { CupHolderGallery } from "./cup-holder-gallery";
import styles from "./cup-holder-product.module.css";

export function CupHolderProductPage({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const back = "/" + locale + "/bikes#accessories";
  const details = [["01",1421],["02",920],["03",573],["04",1484],["05",1202],["06",1270],["07",1254],["08",1238],["09",1234],["10",1245],["11",1144],["12",1245],["13",1246],["14",1534],["15",1195],["16",1186],["17",1202]] as const;
  const specs = [
    [t("cup.spec.type"), t("cup.spec.type.value")],
    [t("cup.spec.mount"), t("cup.spec.mount.value")],
    [t("cup.spec.colours"), t("cup.spec.colours.value")],
    [t("cup.spec.fit"), t("cup.spec.fit.value")],
    ...(["brand", "item", "material", "weight", "tube", "cup", "spring", "lining", "position", "style", "release", "channel", "sourceDiameter"] as const).map(key => [t(`cup.spec.${key}`), t(`cup.spec.${key}.value`)]),
  ];
  return <CatalogShell locale={locale} active="bikes">
    <main className={styles.page} data-cup-holder-product="1">
      <section className={styles.hero}>
        <CupHolderGallery locale={locale} />
        <div className={styles.copy}><p className={styles.eyebrow}>{t("cup.eyebrow")}</p>
          <h1>{t("cup.name")}</h1><h2>{t("cup.headline")}</h2><p>{t("cup.intro")}</p>
          <a className={styles.button} href="#source-details">{t("cup.full.title")}</a>
        </div>
      </section>
      <section className={styles.fullDetails} id="source-details" data-cup-full-details>
        <div className={styles.detailHeading}><p className={styles.eyebrow}>{t("cup.eyebrow")}</p><h2>{t("cup.full.title")}</h2><p>{t("cup.full.intro")}</p></div>
        {details.map(([id, height], index) => {
          return <figure key={id} data-cup-detail={id}>
            <a href={`/products/accessories/cup-holder/detail-${id}.jpg`} target="_blank" rel="noreferrer" aria-label={t("cup.full.open", { number: index + 1 })}>
              <img src={`/products/accessories/cup-holder/detail-${id}.jpg`} width={790} height={height} loading="lazy" alt={t(`cup.detail.${id}`)} />
            </a>
            <figcaption><span>{id}</span>{t(`cup.detail.${id}`)}</figcaption>
          </figure>;
        })}
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
