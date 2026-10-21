import type { ReactNode } from "react";
import { PublicSiteHeader } from "../public-site-header";
import { translator, type Locale } from "../../_lib/i18n";
import styles from "./catalog-shell.module.css";

export function CatalogShell({ locale, active, children }: { locale: Locale; active: "bikes" | "accessories"; children: ReactNode }) {
  const t = translator(locale);
  const base = "/" + locale;
  return <div className={styles.site} lang={locale}>
    <PublicSiteHeader locale={locale} active={active} />
    {children}
    <footer className={styles.footer}>
      <div><a href={base + "/"}>ALSVID</a><span>{t("catalog.shared.footer")}</span></div>
      <nav aria-label={t("navigation.primary")}><a href={base + "/bikes"}>{t("catalog.nav.bikes")}</a><a href={base + "/accessories"}>{t("catalog.nav.accessories")}</a><a href={base + "/"}>{t("catalog.shared.contact")} ↗</a></nav>
      <p>{t("catalog.shared.preview")}</p>
    </footer>
  </div>;
}
