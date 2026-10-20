import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LanguageSwitcher } from "../../_components/language-switcher";
import { translator } from "../../_lib/i18n";
import { isLocale, locales, type Locale } from "../../_lib/i18n/routing";
import styles from "./page.module.css";
export function generateStaticParams(){return locales.map((locale)=>({locale}));}
export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{const {locale}=await params;if(!isLocale(locale))return{};const t=translator(locale);return{title:`${t("footer.accessories")} | ALSVID`,description:t("accessories.page.body")};}
const items=["basket","rack","mudguard","light","parts"] as const;
const marks={basket:"+",rack:"≋",mudguard:"◒",light:"✦",parts:"▰"};
export default async function AccessoriesPage({params}:{params:Promise<{locale:string}>}){const {locale}=await params;if(!isLocale(locale))notFound();const t=translator(locale as Locale);return <main className={styles.page} lang={locale}><header className={styles.header}><a className={styles.logo} href={`/${locale}`}>ALSVID</a><div><a href={`/${locale}`}>{t("common.back_home")}</a> <LanguageSwitcher locale={locale} label={t("language.label")} /></div></header><section className={styles.main}><div className={styles.intro}><p className={styles.eyebrow}>{t("accessories.page.eyebrow")}</p><h1>{t("accessories.page.title")}</h1><p>{t("accessories.page.body")}</p></div><div className={styles.grid}>{items.map((item)=><article className={styles.card} key={item}><div><div className={styles.visual} aria-hidden="true">{marks[item]}</div><h2>{t(`accessories.${item}.title`)}</h2><p>{t(`accessories.${item}.description`)}</p></div><div className={styles.status}>{t("accessories.page.pending")}</div></article>)}</div></section></main>}
