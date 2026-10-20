import { notFound, redirect } from "next/navigation";
import { isLocale } from "../../_lib/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

/** FC1 is currently promotional and accepts reservation enquiries by email only. */
export default async function CartRedirect({ params }: Props): Promise<never> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirect(`/${locale}/explore/fc1#configure`);
}
