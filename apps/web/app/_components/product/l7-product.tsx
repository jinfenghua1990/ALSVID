import { PublicSiteHeader } from "../public-site-header";
import { translator, type Locale } from "../../_lib/i18n";
import { l7Reference as data } from "../../_lib/products/l7";
import { L7Gallery } from "./l7-gallery";
import styles from "./l8-product.module.css";
import theme from "./l7-product.module.css";

export function L7LaunchCard({ locale }: { locale: Locale }) {
  const t = translator(locale);
  return <section className={`${styles.launch} ${theme.page}`} data-l7-launch>
    <div className={styles.launchCopy}>
      <p className={styles.eyebrow}>{t("l7.eyebrow")}</p>
      <h2>{t("brand.name")} {t("l7.model")}</h2>
      <p>{t("l7.launch.body")}</p>
      <a className={styles.button} href={`/${locale}/explore/l7`}>{t("l7.explore")}</a>
    </div>
    <a className={styles.launchVisual} href={`/${locale}/explore/l7`} aria-label={t("l7.explore")}>
            <img src="/products/l7/reference-side.jpg" width={1024} height={1024} alt={t("l7.gallery.side.alt")} loading="lazy" />
    </a>
  </section>;
}

export function L7ProductPage({ locale, myUrl }: { locale: Locale; myUrl: string }) {
  const t = translator(locale);
  const number = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  const dimensions = (values: readonly number[]) => values.map(number).join(" × ") + " mm";
  const energy = data.batteryVoltageV * data.batteryCapacityAh;
  const specs = [
    [t("l7.spec.frame"), t("l7.spec.frame.value")],
    [t("l7.spec.wheels"), t("l7.spec.wheels.value", { size: number(data.wheelInches), width: number(data.tyreWidthInches) })],
    [t("l7.spec.motor"), t("l7.spec.motor.value", { power: number(data.motorPowerW) })],
    [t("l7.spec.torque"), number(data.maxTorqueNm) + " Nm"],
    [t("l7.spec.sensor"), t("l7.spec.sensor.value")],
    [t("l7.spec.battery"), t("l7.spec.battery.value", { voltage: number(data.batteryVoltageV), capacity: number(data.batteryCapacityAh), energy: number(energy) })],
    [t("l7.spec.carry"), t("l7.spec.carry.value")],
    [t("l7.spec.drivetrain"), t("l7.spec.drivetrain.value")],
    [t("l7.spec.brakes"), t("l7.spec.brakes.value")],
    [t("l7.spec.weight"), t("l7.spec.weight.value", { weight: number(data.referenceWeightKg) })],
    [t("l7.spec.unfolded"), dimensions(data.unfoldedMm)],
    [t("l7.spec.folded"), dimensions(data.foldedMm)],
    [t("l7.spec.range"), t("l7.spec.range.value", { range: data.statedRangeKm })],
    [t("l7.spec.charging"), t("l7.spec.charging.value", { hours: number(data.chargingHours) })],
    [t("l7.spec.load"), t("l7.spec.load.value", { load: number(data.payloadKg) })],
  ];
  return <main className={`${styles.page} ${theme.page}`} lang={locale} data-l7-product="1">
    <PublicSiteHeader locale={locale} myUrl={myUrl} active="l7" />
    <section className={styles.hero} id="overview">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>{t("l7.eyebrow")}</p>
        <h1><small>{t("brand.name")}</small>{t("l7.model")}</h1>
        <h2>{t("l7.headline")}</h2>
        <p>{t("l7.intro")}</p>
        <a className={styles.button} href="#design">{t("l7.details")}</a>
      </div>
      <L7Gallery locale={locale} />
    </section>
    <div className={styles.metricsWrap}>
      <p className={styles.eyebrow}>{t("l7.reference")}</p>
      <dl className={styles.metrics}>
        {[
          [number(data.wheelInches) + "″", t("l7.metric.wheels")],
          [number(data.motorPowerW) + " W", t("l7.metric.power")],
          [number(data.maxTorqueNm) + " Nm", t("l7.metric.torque")],
          [number(energy) + " Wh", t("l7.metric.battery")],
        ].map(([value, label]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
    </div>
    <nav className={styles.chapterNav} aria-label={t("l7.details")}>
      <a href="#design">{t("l7.nav.design")}</a><a href="#folding">{t("l7.nav.folding")}</a>
      <a href="#specifications">{t("l7.nav.specs")}</a><a href="#availability">{t("l7.nav.availability")}</a>
    </nav>
    <section className={styles.section} id="design">
      <div className={styles.sectionHeading}><p className={styles.eyebrow}>{t("l7.design.kicker")}</p><h2>{t("l7.design.title")}</h2></div>
      <div className={styles.features}>
        <article className={styles.carbon}>
          <span className={styles.featureNumber} aria-hidden="true">01</span>
          <h3>{t("l7.carbon.title")}</h3><p>{t("l7.carbon.body")}</p>
          <img src="/products/l7/reference-side.jpg" width={1024} height={1024} alt={t("l7.gallery.side.alt")} loading="lazy" />
        </article>
        <article className={styles.assist}>
          <span className={styles.featureNumber} aria-hidden="true">02</span>
          <strong>{number(data.maxTorqueNm)}<small> Nm</small></strong>
          <h3>{t("l7.assist.title")}</h3><p>{t("l7.assist.body", { power: number(data.motorPowerW), torque: number(data.maxTorqueNm) })}</p>
        </article>
        <article className={styles.suspension}>
          <span className={styles.featureNumber} aria-hidden="true">03</span>
          <h3>{t("l7.carry.title")}</h3><p>{t("l7.carry.body")}</p>
          <img className={theme.carryImage} src="/products/l7/reference-carry.jpg" width={1024} height={1024} alt={t("l7.gallery.carry.alt")} loading="lazy" />
        </article>
      </div>
    </section>
    <section className={styles.fold} id="folding">
      <div className={styles.foldVisual}><img src="/products/l7/reference-folded.jpg" width={1024} height={1024} alt={t("l7.gallery.folded.alt")} loading="lazy" /></div>
      <div className={styles.foldCopy}><p className={styles.eyebrow}>{t("l7.fold.kicker")}</p><h2>{t("l7.fold.title")}</h2><p>{t("l7.fold.body")}</p></div>
    </section>
    <section className={styles.section} id="specifications">
      <div className={styles.sectionHeading}><p className={styles.eyebrow}>{t("l7.reference")}</p><h2>{t("l7.spec.title")}</h2><p>{t("l7.spec.note")}</p></div>
      <dl className={styles.specs}>{specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <a className={styles.source} href={data.sourceUrl} target="_blank" rel="noreferrer">{t("l7.spec.source")}</a>
    </section>
    <section className={styles.availability} id="availability">
      <div><p className={styles.eyebrow}>{t("l7.available.kicker")}</p><h2>{t("l7.available.title")}</h2><p>{t("l7.available.body")}</p>
        <a className={styles.button} href={`/${locale}/bikes`}>{t("l7.products")}</a></div>
      <span aria-hidden="true">A1</span>
    </section>
    <footer className={styles.footer}><a href={`/${locale}/`}>{t("brand.name")}</a><p>{t("l7.footer")}</p><a href={`/${locale}/`}>{t("l7.home")}</a></footer>
  </main>;
}
