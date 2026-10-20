import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "../../_lib/i18n/routing";
import { translator } from "../../_lib/i18n";
import { Fc1PreviewCartPanel } from "../../_components/product/fc1-preview-cart-panel";
import styles from "./checkout-preview.module.css";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = translator(locale);
  return {
    title: `${t("fc1.checkout.title")} | ALSVID`,
    description: t("fc1.checkout.intro"),
    robots: { index: false, follow: false },
  };
}

/**
 * This is an informational readiness page, not an operational checkout.
 * No form, payment API, stock reservation or order creation is reachable here.
 */
export default async function CheckoutPreview({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const host = (await headers()).get("host") ?? "";
  const portal = host.toLowerCase().split(".")[0];
  if (portal === "admin" || portal === "my" || portal === "dealer") redirect(`/${portal}`);

  const t = translator(locale);
  const details = ["seller", "price", "delivery", "payment", "rights"] as const;

  return (
    <main className={styles.page} lang={locale} data-checkout-mode="preview-only">
      <div className={styles.shell}>
        <header className={styles.top}>
          <a className={styles.brand} href={`/${locale}/`}>ALSVID</a>
          <a className={styles.back} href={`/${locale}/explore/fc1`}>{t("fc1.checkout.back")} ↗</a>
        </header>
        <section className={styles.intro} aria-labelledby="checkout-preview-title">
          <p className={styles.eyebrow}>ALSVID FC1</p>
          <h1 id="checkout-preview-title">{t("fc1.checkout.title")}</h1>
          <p>{t("fc1.checkout.intro")}</p>
          <p className={styles.notice} role="status">{t("fc1.checkout.notice")}</p>
        </section>
        <Fc1PreviewCartPanel locale={locale} mode="checkout" />
        <section className={styles.details} aria-label={t("fc1.checkout.title")}>
          {details.map((detail) => (
            <article className={styles.panel} key={detail}>
              <h2>{t(`fc1.checkout.${detail}.title`)}</h2>
              <p>{t(`fc1.checkout.${detail}.body`)}</p>
            </article>
          ))}
        </section>
        <section className={styles.footer} aria-label={t("fc1.checkout.notice")}>
          <button type="button" disabled aria-disabled="true">{t("fc1.checkout.disabled")}</button>
          <a href={`/${locale}/explore/fc1#configure`}>{t("fc1.checkout.back")} ↗</a>
        </section>
      </div>
    </main>
  );
}
