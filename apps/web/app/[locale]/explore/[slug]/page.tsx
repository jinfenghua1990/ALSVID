import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { translator } from "../../../_lib/i18n";
import { isLocale } from "../../../_lib/i18n/routing";
import { getHomeDetail } from "../../../_lib/home-details";
import { portalUrlFor } from "../../../_lib/portal-routing";
import { LanguageSwitcher } from "../../../_components/language-switcher";
import { Fc1ProductPage, generateFc1Metadata } from "../../../_components/product/fc1-product";
import styles from "../../../_components/home/original-home.module.css";

type Props = { params: Promise<{ locale: string; slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (slug === "fc1") return generateFc1Metadata(locale);
  const detail = getHomeDetail(slug);
  if (!isLocale(locale) || !detail) return {};
  const t = translator(locale);
  return {
    title: `${t(detail.title)} | ${t("brand.name")}`,
    description: t(detail.body),
    alternates: {
      canonical: `https://www.chaibenn.com/${locale}/explore/${slug}`,
      languages: { zh: `https://www.chaibenn.com/zh/explore/${slug}`,
        de: `https://www.chaibenn.com/de/explore/${slug}`,
        en: `https://www.chaibenn.com/en/explore/${slug}`,
      },
    },
  };
}
export default async function HomeDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  if (slug === "fc1") {
    if (!isLocale(locale)) notFound();
    const host = (await headers()).get("host") ?? "";
    const prefix = host.toLowerCase().split(".")[0];
    if (prefix === "admin" || prefix === "my" || prefix === "dealer") redirect(`/${prefix}`);
    return <Fc1ProductPage locale={locale} myUrl={portalUrlFor(host, "my")} />;
  }
  const detail = getHomeDetail(slug);
  if (!isLocale(locale) || !detail) notFound();
  const host = (await headers()).get("host") ?? "";
  const prefix = host.toLowerCase().split(".")[0];
  if (prefix === "admin" || prefix === "my" || prefix === "dealer")
    redirect(`/${prefix}`);
  const t = translator(locale);
  const home = `/${locale}`;
  return (
    <main
      translate="no"
      className={styles.page}
      lang={locale}
      data-home-detail={slug}
    >
      <header className={styles.detailHeader}>
        <a className={styles.logo} href={home}>
          {t("brand.name")}
        </a>
        <a href={home}>{t("common.back_home")}</a>
        <LanguageSwitcher locale={locale} label={t("language.label")} />
      </header>
      <article className={styles.detailArticle}>
        <div className={styles.detailIntro}>
          <div>
            <p className={styles.eyebrow}>{t("detail.concept_title")}</p>
            <h1>{t(detail.title)}</h1>
            <p>{t(detail.body)}</p>
            <a className={styles["btn-dark"]} href={`${home}#platforms`}>
              {t("detail.explore_platforms")}
            </a>
          </div>
          <img
            src={`/home/original/${detail.image}.webp`}
            alt={t(detail.alt)}
            width={1536}
            height={1024}
          />
        </div>
        <section className={styles.detailBody}>
          <h2>{t("detail.concept_title")}</h2>
          <p>{t(`detail.${detail.category}_body`)}</p>
          {detail.category === "model" ? (
            <>
              <h2>{t("technology.eyebrow")}</h2>
              <p>{t("technology.description")}</p>
              <a href={`${home}#tech`}>{t("common.learn_more")}</a>
            </>
          ) : null}
          <h2>{t("detail.next_title")}</h2>
          <p>{t("commerce.body")}</p>
          <a className={styles["btn-dark"]} href={portalUrlFor(host, "my")}>
            {t("detail.owner_support")}
          </a>
          <a className={styles.detailBack} href={home}>
            {t("common.back_home")}
          </a>
        </section>
      </article>
      <footer className={styles.notice}>{t("notice")}</footer>
    </main>
  );
}
