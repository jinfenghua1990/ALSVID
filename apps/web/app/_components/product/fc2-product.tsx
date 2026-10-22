import { PublicSiteHeader } from "../public-site-header";
import { translator, type Locale, type TranslationKey } from "../../_lib/i18n";
import { fc2Reference as data } from "../../_lib/products/fc2";
import { Fc2Gallery } from "./fc2-gallery";
import {PendingPurchaseActions} from "./pending-purchase-actions";
import styles from "./fc2-product.module.css";

export function Fc2LaunchCard({locale,productModelId}:{locale:Locale;productModelId?:string|null}) {
  const t=translator(locale);
  return <section className={styles.launchCard} data-fc2-launch data-product-model-id={productModelId??undefined}>
    <div className={styles.launchCopy}><span className={styles.eyebrow}>{t("fc2.new")}</span><h2>{t("brand.name")} {t("fc2.model")}</h2><p>{t("fc2.launch.body")}</p><a className={styles.button} href={`/${locale}/explore/fc2`}>{t("fc2.explore")}</a></div>
    <a className={styles.launchImage} href={`/${locale}/explore/fc2`} aria-label={t("fc2.explore")}><img src="/products/fc2/side-studio-768.webp" srcSet="/products/fc2/side-studio-768.webp 768w, /products/fc2/side-studio-1536.webp 1536w" sizes="(max-width:760px) 100vw, 60vw" width={1536} height={1024} alt={t("fc2.gallery.alt.side")} loading="lazy" /></a>
  </section>;
}
export function Fc2ProductPage({locale,dealerUrl,myUrl}:{locale:Locale;dealerUrl:string;myUrl:string}) {
  const t=translator(locale);
  const key=(value:string)=>t(value as TranslationKey);
  const number=(value:number)=>new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format(value);
  const dimensions=(values:readonly number[])=>values.map(value=>number(value)).join(" × ")+" mm";
  const groups=[
    {id:"platform",rows:[
      ["spec.frame",t("fc2.spec.frame.value")],["spec.fork",t("fc2.spec.fork.value")],["spec.rear",t("fc2.spec.rear.value")],
    ]},
    {id:"electric",rows:[
      ["spec.motor",t("fc2.spec.motor.value",{power:number(data.motorPowerW)})],["spec.torque",number(data.maxTorqueNm)+" Nm"],["spec.sensor",t("fc2.spec.sensor.value")],["spec.battery",t("fc2.spec.battery.value",{voltage:number(data.batteryVoltageV),capacity:number(data.batteryCapacityAh)})],["spec.display",t("fc2.spec.display.value")],
    ]},
    {id:"components",rows:[
      ["spec.brakes",t("fc2.spec.brakes.value")],["spec.drivetrain",t("fc2.spec.drivetrain.value")],["spec.tyres",t("fc2.spec.tyres.value")],
    ]},
    {id:"dimensions",rows:[
      ["spec.weight",number(data.netWeightKg)+" kg"],["spec.load",number(data.payloadKg)+" kg"],["fold.unfolded",dimensions(data.unfoldedMm)],["fold.folded",dimensions(data.foldedMm)],
    ]},
  ];
  return <main className={styles.page} lang={locale} data-fc2-product="1">
    <PublicSiteHeader locale={locale} myUrl={myUrl} active="fc2" />
    <section className={styles.hero} id="overview">
      <div className={styles.heroCopy}><p className={styles.eyebrow}>{t("fc2.series")}</p><h1><small>{t("brand.name")}</small>{t("fc2.model")}</h1><h2>{t("fc2.headline")}</h2><p>{t("fc2.intro")}</p><a className={styles.button} href="#availability">{t("fc2.availability")}</a></div>
      <Fc2Gallery locale={locale} />
    </section>
    <div className={styles.metricWrap}><div className={styles.metrics}>
      {[[number(data.netWeightKg)+" kg","weight"],[number(data.motorPowerW)+" W","motor"],[number(data.maxTorqueNm)+" Nm","torque"],[number(data.wheelInches)+"″","wheel"]].map(([value,id])=><div key={id}><strong>{value}</strong><span>{key("fc2.metric."+id)}</span></div>)}
    </div><p className={styles.smallNote}>{t("fc2.metric.note")}</p></div>
    <nav className={styles.chapterNav} aria-label={t("fc2.details")}><a href="#design">{t("fc2.details")}</a><a href="#folding">{t("fc2.fold")}</a><a href="#specifications">{t("fc2.specs")}</a><a href="#availability">{t("fc2.availability")}</a></nav>
    <section id="design" className={styles.section}>
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>{t("fc2.story.kicker")}</p><h2>{t("fc2.story.title")}</h2></div><p>{t("fc2.story.body")}</p></div>
      <div className={styles.featureGrid}>
        <article className={styles.featureMain}><div className={styles.detailPhoto}><img src="/products/fc2/side-original-1000.webp" width={1000} height={1000} alt={t("fc2.gallery.alt.original")} loading="lazy" /></div><div><span className={styles.featureNumber} aria-hidden="true">01</span><h3>{t("fc2.carbon.title")}</h3><p>{t("fc2.carbon.body")}</p></div></article>
        <article className={styles.featureDrive}><span className={styles.featureNumber} aria-hidden="true">02</span><strong>{number(data.maxTorqueNm)}<small> Nm</small></strong><h3>{t("fc2.drive.title")}</h3><p>{t("fc2.drive.body")}</p></article>
        <article className={styles.featureRear}><span className={styles.featureNumber} aria-hidden="true">03</span><h3>{t("fc2.suspension.title")}</h3><p>{t("fc2.suspension.body")}</p><div className={styles.rearDetail}><img src="/products/fc2/side-original-1000.webp" width={1000} height={1000} alt={t("fc2.gallery.alt.original")} loading="lazy" /></div></article>
      </div>
    </section>
    <section className={styles.foldSection} id="folding"><div className={styles.foldVisual}><img src="/products/fc2/folded-studio-1536.webp" srcSet="/products/fc2/folded-studio-768.webp 768w, /products/fc2/folded-studio-1536.webp 1536w" sizes="(max-width:760px) 100vw, 60vw" width={1536} height={1024} alt={t("fc2.gallery.alt.folded")} loading="lazy" /></div><div className={styles.foldCopy}><p className={styles.eyebrow}>{t("fc2.fold.kicker")}</p><h2>{t("fc2.fold.title")}</h2><p>{t("fc2.fold.body")}</p><dl className={styles.dimensions}><div><dt>{t("fc2.fold.folded")}</dt><dd>{dimensions(data.foldedMm)}</dd></div><div><dt>{t("fc2.fold.unfolded")}</dt><dd>{dimensions(data.unfoldedMm)}</dd></div></dl></div></section>
    <section className={styles.batterySection}><div><p className={styles.eyebrow}>{t("fc2.battery.kicker")}</p><h2>{t("fc2.battery.title")}</h2><p>{t("fc2.battery.body")}</p></div><div className={styles.batteryNumber}><strong>{number(data.batteryVoltageV)}<small> V</small></strong><span>{number(data.batteryCapacityAh)} Ah · LG</span></div></section>
    <section id="specifications" className={styles.section}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>{t("fc2.spec.kicker")}</p><h2>{t("fc2.spec.title")}</h2></div><p>{t("fc2.metric.note")}</p></div><div className={styles.specGrid}>{groups.map(group=><article key={group.id}><h3>{key("fc2.spec."+group.id)}</h3><dl>{group.rows.map(([label,value])=><div key={label}><dt>{key("fc2."+label)}</dt><dd>{value}</dd></div>)}</dl></article>)}</div><p className={styles.smallNote}>{t("fc2.spec.note")}</p></section>
    <section className={styles.faq}><h2>{t("fc2.faq.title")}</h2><div>{["photo","fold","buy"].map(id=><details key={id}><summary>{key("fc2.faq."+id+".q")}</summary><p>{key("fc2.faq."+id+".a")}</p></details>)}</div></section>
    <section id="availability" className={styles.availability}><div><p className={styles.eyebrow}>{t("fc2.available.kicker")}</p><h2>{t("fc2.available.title")}</h2><p>{t("fc2.available.body")}</p><div className={styles.ctas}><a className={styles.button} href={dealerUrl}>{t("fc2.available.dealer")}</a><a className={styles.textLink} href={`/${locale}/explore/fc1`}>{t("fc2.fc1")}</a></div><PendingPurchaseActions locale={locale} selection={{product:"FC2"}}/></div><span className={styles.wordmark} aria-hidden="true">FC2</span></section>
    <footer className={styles.footer}><a className={styles.brand} href={`/${locale}/`}>{t("brand.name")}</a><p>{t("fc2.footer")}</p><a href={`/${locale}/`}>{t("fc2.home")}</a></footer>
  </main>;
}
