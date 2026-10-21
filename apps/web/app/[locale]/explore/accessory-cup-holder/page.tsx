import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isLocale, locales } from "../../../_lib/i18n/routing";
import { translator } from "../../../_lib/i18n";
import { CupHolderProductPage } from "../../../_components/product/cup-holder-product";

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = translator(locale);
  return {
    title: t("cup.title"), description: t("cup.description"),
    alternates: {
      canonical: `https://www.alsvidbike.com/${locale}/explore/accessory-cup-holder`,
      languages: Object.fromEntries([...locales.map(item => [item, `https://www.alsvidbike.com/${item}/explore/accessory-cup-holder`]), ["x-default", "https://www.alsvidbike.com/en/explore/accessory-cup-holder"]]),
    },
    openGraph: { title: t("cup.title"), description: t("cup.description"), images: [{url:"/products/accessories/cup-holder-black.webp",width:800,height:800,alt:t("cup.black.alt")}] },
  };
}
export default async function CupHolderPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const host = (await headers()).get("host") ?? "";
  const prefix = host.toLowerCase().split(".")[0];
  if (prefix === "admin" || prefix === "my" || prefix === "dealer") redirect(`/${prefix}`);
  return <CupHolderProductPage locale={locale} />;
}
