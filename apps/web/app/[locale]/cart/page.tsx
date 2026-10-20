import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "../../_lib/i18n/routing";
import { translator } from "../../_lib/i18n";
import { Fc1PreviewCartPanel } from "../../_components/product/fc1-preview-cart-panel";
import styles from "../checkout/checkout-preview.module.css";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = translator(locale);
  return { title: `${t("fc1.cart.title")} | ALSVID`, robots: { index: false, follow: false } };
}

/** A browser-local cart preview, not a checkout or real sales basket. */
export default async function PreviewCartPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const host = (await headers()).get("host") ?? "";
  const portal = host.toLowerCase().split(".")[0];
  if (portal === "admin" || portal === "my" || portal === "dealer") redirect(`/${portal}`);
  const t = translator(locale);
  return (
    <main className={styles.page} lang={locale} data-cart-mode="preview-only">
      <div className={styles.shell}>
        <header className={styles.top}>
          <a className={styles.brand} href={`/${locale}/`}>ALSVID</a>
          <a className={styles.back} href={`/${locale}/explore/fc1#configure`}>{t("fc1.cart.back_config")} ↗</a>
        </header>
        <section className={styles.intro}>
          <p className={styles.eyebrow}>ALSVID / FC1</p>
          <h1>{t("fc1.cart.title")}</h1>
          <p>{t("fc1.cart.intro")}</p>
          <p className={styles.notice} role="status">{t("fc1.checkout.notice")}</p>
        </section>
        <Fc1PreviewCartPanel locale={locale} mode="cart" />
      </div>
    </main>
  );
}
