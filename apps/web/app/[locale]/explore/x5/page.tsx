import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isLocale, locales } from "../../../_lib/i18n/routing";
import { translator } from "../../../_lib/i18n";
import { portalUrlFor } from "../../../_lib/portal-routing";
import { X5ProductPage } from "../../../_components/product/x5-product";

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = translator(locale);
  return {
    title: t("x5.title"), description: t("x5.description"),
    alternates: {
      canonical: `https://www.chaibenn.com/${locale}/explore/x5`,
      languages: Object.fromEntries([...locales.map(item => [item, `https://www.chaibenn.com/${item}/explore/x5`]), ["x-default", "https://www.chaibenn.com/en/explore/x5"]]),
    },
    openGraph: { title: t("x5.title"), description: t("x5.description"), images: [{url:"/products/x5/side-studio-1536.webp",width:1536,height:1024,alt:t("x5.gallery.alt.side")}] },
  };
}
export default async function X5Page({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const host = (await headers()).get("host") ?? "";
  const prefix = host.toLowerCase().split(".")[0];
  if (prefix === "admin" || prefix === "my" || prefix === "dealer") redirect(`/${prefix}`);
  return <X5ProductPage locale={locale} dealerUrl={portalUrlFor(host,"dealer")} myUrl={portalUrlFor(host,"my")} />;
}
