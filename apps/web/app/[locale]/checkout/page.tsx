import { notFound, redirect } from "next/navigation";
import { isLocale } from "../../_lib/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

/** Online checkout is intentionally unavailable while FC1 is promotional/email-reservation only. */
export default async function CheckoutRedirect({ params }: Props): Promise<never> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirect(`/${locale}/explore/fc1#configure`);
}
