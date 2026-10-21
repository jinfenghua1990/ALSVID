import { translator, type Locale, type TranslationKey } from "../../_lib/i18n";
import styles from "./accessories-catalog-section.module.css";

const categories = ["basket", "rack", "mudguard", "light", "parts"] as const;
type Category = typeof categories[number];
const marks: Record<Category,string> = { basket:"▱", rack:"≋", mudguard:"◒", light:"✦", parts:"⌘" };

export function AccessoriesCatalogSection({locale,selectedCategory}:{locale:Locale;selectedCategory?:string|undefined}) {
  const t=translator(locale);
  const selected=categories.find(id=>id===selectedCategory) ?? null;
  const visible=selected ? [selected] : categories;
  const base="/"+locale;
  return <section id="accessories" className={styles.section} aria-labelledby="accessories-title" data-accessories-catalog="1">
    <div className={styles.heading}>
      <div><p className={styles.kicker}>{t("catalog.accessories.hero.kicker")}</p><h2 id="accessories-title">{t("catalog.accessories.categories.title")}</h2></div>
      <p>{t("catalog.accessories.hero.body")}</p>
    </div>
    <nav className={styles.filters} aria-label={t("catalog.accessories.categories.title")}>
      <a href={base+"/bikes#accessories"} aria-current={!selected ? "page" : undefined}>{t("catalog.accessories.categories.all")}</a>
      {categories.map(id=><a key={id} href={base+"/bikes?category="+id+"#accessories"} aria-current={selected===id ? "page" : undefined}>{t(`accessories.${id}.title` as TranslationKey)}</a>)}
    </nav>
    <div className={styles.grid}>
      {visible.map((id,index)=><article key={id} className={styles.card}>
        <div className={styles.visual} aria-hidden="true">
          <span>{marks[id]}</span><small>ALSVID / {String(categories.indexOf(id)+1).padStart(2,"0")}</small>
        </div>
        <div className={styles.info}>
          <span className={styles.pending}>{t("catalog.accessories.categories.pending")}</span>
          <h3>{t(`accessories.${id}.title` as TranslationKey)}</h3>
          <p>{t(`accessories.${id}.description` as TranslationKey)}</p>
          <a href={base+"/explore/accessory-"+id}>{t("catalog.accessories.categories.view")}</a>
        </div>
      </article>)}
    </div>
    <div className={styles.compat}>
      <h3>{t("catalog.accessories.compat.title")}</h3>
      <p>{t("catalog.accessories.compat.body")}</p>
    </div>
  </section>;
}
