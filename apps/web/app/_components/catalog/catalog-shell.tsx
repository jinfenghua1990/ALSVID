import type { ReactNode } from "react";
import { LanguageSwitcher } from "../language-switcher";
import { translator, type Locale } from "../../_lib/i18n";
import styles from "./catalog-shell.module.css";

export function CatalogShell({ locale, active, children }: { locale: Locale; active: "bikes" | "accessories"; children: ReactNode }) {
  const t = translator(locale);
  const base = "/" + locale;
  return <div className={styles.site} lang={locale}>
    <header className={styles.header}>
      <a className={styles.brand} href={base + "/"} aria-label="ALSVID">
        <img src="/home/alsvid-bike-motion.svg" width={56} height={32} alt="" />
        <span>ALSVID</span>
      </a>
      <nav className={styles.nav} aria-label={t("navigation.primary")}>
        <a href={base + "/bikes"} aria-current={active === "bikes" ? "page" : undefined}>{t("catalog.nav.bikes")}</a>
        <a href={base + "/accessories"} aria-current={active === "accessories" ? "page" : undefined}>{t("catalog.nav.accessories")}</a>
        <a className={styles.story} href={base + "/explore/about-story"}>{t("catalog.nav.story")}</a>
      </nav>
      <div className={styles.actions}>
        <LanguageSwitcher locale={locale} label={t("language.label")} variant="globe" />
        <a className={styles.home} href={base + "/"} aria-label={t("catalog.nav.home")}>↗</a>
      </div>
    </header>
    {children}
    <footer className={styles.footer}>
      <div><a href={base + "/"}>ALSVID</a><span>{t("catalog.shared.footer")}</span></div>
      <nav aria-label={t("navigation.primary")}><a href={base + "/bikes"}>{t("catalog.nav.bikes")}</a><a href={base + "/accessories"}>{t("catalog.nav.accessories")}</a><a href={base + "/"}>{t("catalog.shared.contact")} ↗</a></nav>
      <p>{t("catalog.shared.preview")}</p>
    </footer>
  </div>;
}
