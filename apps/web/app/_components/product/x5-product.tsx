import { LanguageSwitcher } from "../language-switcher";
import { translator, type Locale, type TranslationKey } from "../../_lib/i18n";
import { x5Reference as data } from "../../_lib/products/x5";
import { X5Gallery } from "./x5-gallery";
import styles from "./x5-product.module.css";

function shopProductUrl() {
  try {
    const value=process.env.ALSVID_SHOPIFY_X5_PRODUCT_URL?.trim();
    if(!value) return null;
    const url=new URL(value);
    return url.protocol==="https:" && url.hostname==="shop.chaibenn.com" && url.pathname.startsWith("/products/") ? url.toString() : null;
  } catch { return null; }
}
export function X5LaunchCard({locale}:{locale:Locale}) {
  const t=translator(locale);
  return <section className={styles.launchCard} data-x5-launch>
    <div className={styles.launchCopy}><span className={styles.eyebrow}>{t("x5.new")}</span><h2>{t("brand.name")} {t("x5.model")}</h2><p>{t("x5.launch.body")}</p><a className={styles.button} href={`/${locale}/explore/x5`}>{t("x5.explore")} <span aria-hidden="true">↗</span></a></div>
    <a className={styles.launchImage} href={`/${locale}/explore/x5`} aria-label={t("x5.explore")}><img src="/products/x5/side-studio-768.webp" srcSet="/products/x5/side-studio-768.webp 768w, /products/x5/side-studio-1536.webp 1536w" sizes="(max-width:760px) 100vw, 60vw" width={1536} height={1024} alt={t("x5.gallery.alt.side")} loading="lazy" /></a>
  </section>;
}
export function X5ProductPage({locale,dealerUrl,myUrl}:{locale:Locale;dealerUrl:string;myUrl:string}) {
  const t=translator(locale);
  const key=(value:string)=>t(value as TranslationKey);
  const number=(value:number)=>new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format(value);
  const dimensions=(values:readonly number[])=>values.map(value=>number(value)).join(" × ")+" mm";
  const shopUrl=shopProductUrl();
  const groups=[
    {id:"platform",rows:[
      ["spec.frame",t("x5.spec.frame.value")],["spec.fork",t("x5.spec.fork.value")],["spec.rear",t("x5.spec.rear.value")],
    ]},
    {id:"electric",rows:[
      ["spec.motor",t("x5.spec.motor.value",{power:number(data.motorPowerW)})],["spec.torque",number(data.maxTorqueNm)+" Nm"],["spec.sensor",t("x5.spec.sensor.value")],["spec.battery",t("x5.spec.battery.value",{voltage:number(data.batteryVoltageV),capacity:number(data.batteryCapacityAh)})],["spec.display",t("x5.spec.display.value")],
    ]},
    {id:"components",rows:[
      ["spec.brakes",t("x5.spec.brakes.value")],["spec.drivetrain",t("x5.spec.drivetrain.value")],["spec.tyres",t("x5.spec.tyres.value")],
    ]},
    {id:"dimensions",rows:[
      ["spec.weight",number(data.netWeightKg)+" kg"],["spec.load",number(data.payloadKg)+" kg"],["fold.unfolded",dimensions(data.unfoldedMm)],["fold.folded",dimensions(data.foldedMm)],
    ]},
  ];
  return <main className={styles.page} lang={locale} data-x5-product="1">
    <header className={styles.header}>
      <a className={styles.brand} href={`/${locale}/`}><img src="/home/alsvid-bike-motion.svg" width={60} height={36} alt="" /><span>{t("brand.name")}</span></a>
      <nav aria-label={t("navigation.primary")}><a href={`/${locale}/`}>{t("x5.home")}</a><a href={`/${locale}/explore/fc1`}>{t("x5.fc1")}</a><a href={myUrl}>{t("navigation.owner_account")}</a></nav>
      <LanguageSwitcher locale={locale} label={t("x5.language")} variant="globe" />
    </header>
    <section className={styles.hero} id="overview">
      <div className={styles.heroCopy}><p className={styles.eyebrow}>{t("x5.series")}</p><h1><small>{t("brand.name")}</small>{t("x5.model")}</h1><h2>{t("x5.headline")}</h2><p>{t("x5.intro")}</p><a className={styles.button} href={shopUrl??"#availability"} target={shopUrl?"_blank":undefined} rel={shopUrl?"noreferrer":undefined}>{t(shopUrl?"x5.available.shop":"x5.availability")} <span aria-hidden="true">↗</span></a></div>
      <X5Gallery locale={locale} />
    </section>
    <div className={styles.metricWrap}><div className={styles.metrics}>
      {[[number(data.netWeightKg)+" kg","weight"],[number(data.motorPowerW)+" W","motor"],[number(data.maxTorqueNm)+" Nm","torque"],[number(data.wheelInches)+"″","wheel"]].map(([value,id])=><div key={id}><strong>{value}</strong><span>{key("x5.metric."+id)}</span></div>)}
    </div><p className={styles.smallNote}>{t("x5.metric.note")}</p></div>
    <nav className={styles.chapterNav} aria-label={t("x5.details")}><a href="#design">{t("x5.details")}</a><a href="#folding">{t("x5.fold")}</a><a href="#specifications">{t("x5.specs")}</a><a href="#availability">{t("x5.availability")}</a></nav>
    <section id="design" className={styles.section}>
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>{t("x5.story.kicker")}</p><h2>{t("x5.story.title")}</h2></div><p>{t("x5.story.body")}</p></div>
      <div className={styles.featureGrid}>
        <article className={styles.featureMain}><div className={styles.detailPhoto}><img src="/products/x5/side-original-1000.webp" width={1000} height={1000} alt={t("x5.gallery.alt.original")} loading="lazy" /></div><div><span className={styles.featureNumber} aria-hidden="true">01</span><h3>{t("x5.carbon.title")}</h3><p>{t("x5.carbon.body")}</p></div></article>
        <article className={styles.featureDrive}><span className={styles.featureNumber} aria-hidden="true">02</span><strong>{number(data.maxTorqueNm)}<small> Nm</small></strong><h3>{t("x5.drive.title")}</h3><p>{t("x5.drive.body")}</p></article>
        <article className={styles.featureRear}><span className={styles.featureNumber} aria-hidden="true">03</span><h3>{t("x5.suspension.title")}</h3><p>{t("x5.suspension.body")}</p><div className={styles.rearDetail}><img src="/products/x5/side-original-1000.webp" width={1000} height={1000} alt={t("x5.gallery.alt.original")} loading="lazy" /></div></article>
      </div>
    </section>
    <section className={styles.foldSection} id="folding"><div className={styles.foldVisual}><img src="/products/x5/folded-studio-1536.webp" srcSet="/products/x5/folded-studio-768.webp 768w, /products/x5/folded-studio-1536.webp 1536w" sizes="(max-width:760px) 100vw, 60vw" width={1536} height={1024} alt={t("x5.gallery.alt.folded")} loading="lazy" /></div><div className={styles.foldCopy}><p className={styles.eyebrow}>{t("x5.fold.kicker")}</p><h2>{t("x5.fold.title")}</h2><p>{t("x5.fold.body")}</p><dl className={styles.dimensions}><div><dt>{t("x5.fold.folded")}</dt><dd>{dimensions(data.foldedMm)}</dd></div><div><dt>{t("x5.fold.unfolded")}</dt><dd>{dimensions(data.unfoldedMm)}</dd></div></dl></div></section>
    <section className={styles.batterySection}><div><p className={styles.eyebrow}>{t("x5.battery.kicker")}</p><h2>{t("x5.battery.title")}</h2><p>{t("x5.battery.body")}</p></div><div className={styles.batteryNumber}><strong>{number(data.batteryVoltageV)}<small> V</small></strong><span>{number(data.batteryCapacityAh)} Ah · LG</span></div></section>
    <section id="specifications" className={styles.section}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>{t("x5.spec.kicker")}</p><h2>{t("x5.spec.title")}</h2></div><p>{t("x5.metric.note")}</p></div><div className={styles.specGrid}>{groups.map(group=><article key={group.id}><h3>{key("x5.spec."+group.id)}</h3><dl>{group.rows.map(([label,value])=><div key={label}><dt>{key("x5."+label)}</dt><dd>{value}</dd></div>)}</dl></article>)}</div><p className={styles.smallNote}>{t("x5.spec.note")}</p></section>
    <section className={styles.faq}><h2>{t("x5.faq.title")}</h2><div>{["photo","fold","buy"].map(id=><details key={id}><summary>{key("x5.faq."+id+".q")}</summary><p>{key("x5.faq."+id+".a")}</p></details>)}</div></section>
    <section id="availability" className={styles.availability}><div><p className={styles.eyebrow}>{t("x5.available.kicker")}</p><h2>{t("x5.available.title")}</h2><p>{t("x5.available.body")}</p><div className={styles.ctas}><a className={styles.button} href={shopUrl??dealerUrl} target={shopUrl?"_blank":undefined} rel={shopUrl?"noreferrer":undefined}>{t(shopUrl?"x5.available.shop":"x5.available.dealer")} <span aria-hidden="true">↗</span></a><a className={styles.textLink} href={`/${locale}/explore/fc1`}>{t("x5.fc1")} <span aria-hidden="true">↗</span></a></div></div><span className={styles.wordmark} aria-hidden="true">X5</span></section>
    <footer className={styles.footer}><a className={styles.brand} href={`/${locale}/`}>{t("brand.name")}</a><p>{t("x5.footer")}</p><a href={`/${locale}/`}>{t("x5.home")} ↗</a></footer>
  </main>;
}
