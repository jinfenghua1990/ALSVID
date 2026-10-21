import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { isLocale, locales } from "../../_lib/i18n/routing";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ category?: string }> };
const categories = ["basket", "rack", "mudguard", "light", "parts"] as const;

export function generateStaticParams() { return locales.map(locale => ({ locale })); }

// Backward-compatible URL only: there is one public product center, not two catalogs.
export default async function AccessoriesRedirect({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const category = categories.find(item => item === query.category);
  const destination = "/" + locale + "/bikes" + (category ? "?category=" + category : "") + "#accessories";
  redirect(destination);
}
