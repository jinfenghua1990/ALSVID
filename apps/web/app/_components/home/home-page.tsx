import { HomeHero, InfoDialog, FoldingSteps } from "./home-interactions";
import { LanguageSwitcher } from "../language-switcher";
import { translator, type Locale } from "../../_lib/i18n";
import styles from "./original-home.module.css";

export function HomePage({
  myUrl,
  dealerUrl,
  locale = "zh",
}: {
  myUrl: string;
  dealerUrl: string;
  locale?: Locale;
}) {
  const t = translator(locale);
  const detail = (slug: string) => `/${locale}/explore/${slug}`;
  return (
    <main
      translate="no"
      id="top"
      className={styles.page}
      lang={locale}
      data-home-design="original-migration"
    >
      <header className={styles["header"]}>
        <div className={styles["brand-lockup"]}>
          <a href={`/${locale}`} className={styles["logo"]}>
            {t("brand.name")}
          </a>
          <span className={styles["brand-strapline"]}>{t("announcement")}</span>
        </div>
        <nav className={styles["nav"]} aria-label={t("navigation.primary")}>
          <a href="#platforms">{t("navigation.products")}</a>
          <a href="#featured">{t("product.model_fc1")}</a>
          <a href="#folding">{t("navigation.folding")}</a>
          <a href="#tech">{t("navigation.technology")}</a>
          <a href="#service">{t("navigation.services")}</a>
          <a href={detail("about-story")}>{t("brand.story")}</a>
          <a href="#dealer">{t("navigation.join_dealer")}</a>
        </nav>
        <div className={styles["actions"]}>
          <a href={dealerUrl}>{t("navigation.dealer")}</a>
          <a href={myUrl}>{t("navigation.account")}</a>
          <InfoDialog
            label={t("navigation.cart")}
            title={t("commerce.title")}
            body={t("commerce.body")}
            closeLabel={t("common.close")}
          />
          <a href="#platforms">
            {t("product.explore_models")}
          </a>
          <LanguageSwitcher locale={locale} label={t("language.label")} />
        </div>
      </header>
      <HomeHero
        scenes={[
          {
            label: t("scene.folding"),
            title: [t("hero.title_first"), t("hero.title_second")].join(locale === "zh" ? "" : " "),
            subtitle: t("product.slogan"),
            image: "/home/original/hero-folding.webp",
            alt: t("images.hero"),
            href: detail("fc"),
          },
          {
            label: t("scene.city"),
            title: t("hero.scene.city.title"),
            subtitle: t("platform.ct.title"),
            image: "/home/original/scene-city.webp",
            alt: t("images.city"),
            href: detail("ct"),
          },
          {
            label: t("scene.fat_tire"),
            title: t("hero.scene.fat_tire.title"),
            subtitle: t("platform.ft.title"),
            image: "/home/original/scene-fat-tire.webp",
            alt: t("images.fat"),
            href: detail("ft"),
          },
          {
            label: t("scene.touring"),
            title: t("hero.scene.touring.title"),
            subtitle: t("platform.gt.title"),
            image: "/home/original/scene-touring.webp",
            alt: t("images.touring"),
            href: detail("gt"),
          },
        ]}
        eyebrow={t("hero.eyebrow")}
        description={t("hero.description")}
        exploreLabel={t("hero.explore")}
        modelLabel={t("product.meet_fc1")}
        modelHref={detail("fc1")}
        scrollLabel={t("hero.scroll")}
      />
      <section id="platforms" className={styles["section"]}>
        <div className={styles["inner"]}>
          <div className={styles["section-head"]}>
            <div>
              <div className={styles["eyebrow"]} style={{ color: "#808783" }}>
                {t("platforms.eyebrow")}
              </div>
              <h2>
                {t("platforms.title_first")}
                <br />
                {t("platforms.title_second")}
              </h2>
            </div>
            <p>{t("platforms.description")}</p>
          </div>
          <div className={styles["platform-grid"]}>
            <article className={styles["platform"]}>
              <img
                src="/home/original/fc1-product.webp"
                alt={t("images.product")}
                width="1536"
                height="1024"
                loading="lazy"
              />
              <div className={styles["copy"]}>
                <div className={styles["code"]}>{t("platform.fc.code")}</div>
                <h3>{t("platform.fc.title")}</h3>
                <p>{t("platform.fc.description")}</p>
                <a
                  className={styles["more"] + " " + styles.cardLink}
                  href={detail("fc")}
                  aria-label={t("platform.fc.title")}
                >
                  {t("platform.explore")}
                </a>
              </div>
            </article>
            <article className={styles["platform"]}>
              <img
                src="/home/original/scene-city.webp"
                alt={t("images.city")}
                width="1536"
                height="1024"
                loading="lazy"
              />
              <div className={styles["copy"]}>
                <div className={styles["code"]}>{t("platform.ct.code")}</div>
                <h3>{t("platform.ct.title")}</h3>
                <p>{t("platform.ct.description")}</p>
                <a
                  className={styles["more"] + " " + styles.cardLink}
                  href={detail("ct")}
                  aria-label={t("platform.ct.title")}
                >
                  {t("platform.explore")}
                </a>
              </div>
            </article>
            <article className={styles["platform"]}>
              <img
                src="/home/original/scene-fat-tire.webp"
                alt={t("images.fat")}
                width="1536"
                height="1024"
                loading="lazy"
              />
              <div className={styles["copy"]}>
                <div className={styles["code"]}>{t("platform.ft.code")}</div>
                <h3>{t("platform.ft.title")}</h3>
                <p>{t("platform.ft.description")}</p>
                <a
                  className={styles["more"] + " " + styles.cardLink}
                  href={detail("ft")}
                  aria-label={t("platform.ft.title")}
                >
                  {t("platform.explore")}
                </a>
              </div>
            </article>
            <article className={styles["platform"]}>
              <img
                src="/home/original/scene-touring.webp"
                alt={t("images.touring")}
                width="1536"
                height="1024"
                loading="lazy"
              />
              <div className={styles["copy"]}>
                <div className={styles["code"]}>{t("platform.gt.code")}</div>
                <h3>{t("platform.gt.title")}</h3>
                <p>{t("platform.gt.description")}</p>
                <a
                  className={styles["more"] + " " + styles.cardLink}
                  href={detail("gt")}
                  aria-label={t("platform.gt.title")}
                >
                  {t("platform.explore")}
                </a>
              </div>
            </article>
          </div>
        </div>
      </section>
      <section id="featured" className={styles["feature"]}>
        <div className={styles["feature-grid"]}>
          <div className={styles["feature-copy"]}>
            <div className={styles["eyebrow"]}>{t("featured.eyebrow")}</div>
            <h2>{t("product.model_fc1")}</h2>
            <h3>{t("product.slogan")}</h3>
            <p>{t("featured.description")}</p>
            <a className={styles["btn-white"]} href={detail("fc1")}>
              {t("product.explore_fc1")}
            </a>
          </div>
          <img
            className={styles["feature-img"]}
            src="/home/original/fc1-product.webp"
            alt={t("images.product")}
            width="1536"
            height="1024"
            loading="lazy"
          />
          <div className={styles["specs"]}>
            <div className={styles["spec"]}>
              <strong>{t("spec.model_value")}</strong>
              <span>{t("spec.model_label")}</span>
            </div>
            <div className={styles["spec"]}>
              <strong>{t("spec.platform_value")}</strong>
              <span>{t("spec.platform_label")}</span>
            </div>
            <div className={styles["spec"]}>
              <strong>{t("spec.data_value")}</strong>
              <span>{t("spec.data_label")}</span>
            </div>
            <div className={styles["spec"]}>
              <strong>{t("spec.design_value")}</strong>
              <span>{t("spec.design_label")}</span>
            </div>
          </div>
        </div>
      </section>
      <section id="folding" className={styles["fold"]}>
        <div className={styles["inner"] + " " + styles["fold-grid"]}>
          <div className={styles["fold-copy"]}>
            <div className={styles["eyebrow"]} style={{ color: "#7a827f" }}>
              {t("folding.eyebrow")}
            </div>
            <h2>
              {t("folding.title_first")}
              <br />
              {t("folding.title_second")}
            </h2>
            <p>{t("folding.description")}</p>
            <a className={styles["text-link"]} href={detail("fc1")}>
              {t("folding.discover")}
            </a>
          </div>
          <FoldingSteps
            label={t("folding.aria")}
            steps={[
              {
                number: t("folding.step_1"),
                title: t("folding.riding"),
                description: t("interaction.folding.riding"),
              },
              {
                number: t("folding.step_2"),
                title: t("folding.folding"),
                description: t("interaction.folding.folding"),
              },
              {
                number: t("folding.step_3"),
                title: t("folding.storing"),
                description: t("interaction.folding.storing"),
              },
            ]}
          />
        </div>
      </section>
      <section id="tech" className={styles["section"] + " " + styles["tech"]}>
        <div className={styles["inner"]}>
          <div className={styles["section-head"]}>
            <div>
              <div className={styles["eyebrow"]} style={{ color: "#808783" }}>
                {t("technology.eyebrow")}
              </div>
              <h2>
                {t("technology.title_first")}
                <br />
                {t("technology.title_second")}
              </h2>
            </div>
            <p>{t("technology.description")}</p>
          </div>
          <div className={styles["tech-grid"]}>
            <article className={styles["tech-card"]}>
              <div className={styles["tech-icon"]}>{t("icon.assist")}</div>
              <h3>{t("technology.assist.title")}</h3>
              <p>{t("technology.assist.body")}</p>
              <a
                className={styles.cardLink}
                href={detail("technology-assist")}
                aria-label={t("technology.assist.title")}
              >
                {t("common.learn_more")}
              </a>
            </article>
            <article className={styles["tech-card"]}>
              <div className={styles["tech-icon"]}>{t("icon.battery")}</div>
              <h3>{t("technology.battery.title")}</h3>
              <p>{t("technology.battery.body")}</p>
              <a
                className={styles.cardLink}
                href={detail("technology-battery")}
                aria-label={t("technology.battery.title")}
              >
                {t("common.learn_more")}
              </a>
            </article>
            <article className={styles["tech-card"]}>
              <div className={styles["tech-icon"]}>{t("icon.folding")}</div>
              <h3>{t("technology.folding.title")}</h3>
              <p>{t("technology.folding.body")}</p>
              <a
                className={styles.cardLink}
                href={detail("technology-folding")}
                aria-label={t("technology.folding.title")}
              >
                {t("common.learn_more")}
              </a>
            </article>
            <article className={styles["tech-card"]}>
              <div className={styles["tech-icon"]}>{t("icon.material")}</div>
              <h3>{t("technology.material.title")}</h3>
              <p>{t("technology.material.body")}</p>
              <a
                className={styles.cardLink}
                href={detail("technology-material")}
                aria-label={t("technology.material.title")}
              >
                {t("common.learn_more")}
              </a>
            </article>
            <article className={styles["tech-card"]}>
              <div className={styles["tech-icon"]}>{t("icon.safety")}</div>
              <h3>{t("technology.safety.title")}</h3>
              <p>{t("technology.safety.body")}</p>
              <a
                className={styles.cardLink}
                href={detail("technology-safety")}
                aria-label={t("technology.safety.title")}
              >
                {t("common.learn_more")}
              </a>
            </article>
          </div>
        </div>
      </section>
      <section
        id="accessories"
        className={styles["accessories"] + " " + styles["section"]}
      >
        <div className={styles["inner"]}>
          <div className={styles["section-head"]}>
            <div>
              <div className={styles["eyebrow"]} style={{ color: "#808783" }}>
                {t("accessories.eyebrow")}
              </div>
              <h2>{t("accessories.title")}</h2>
            </div>
            <p>{t("accessories.description")}</p>
            <a className={styles["text-link"]} href="#accessory-categories">
              {t("accessories.browse")}
            </a>
          </div>
          <div id="accessory-categories" className={styles["accessory-grid"]}>
            <article className={styles["accessory"]}>
              <div className={styles["visual"]}>{t("icon.battery")}</div>
              <h3>{t("accessories.basket.title")}</h3>
              <p>{t("accessories.basket.description")}</p>
              <a
                className={styles.cardLink}
                href={detail("accessory-basket")}
                aria-label={t("accessories.basket.title")}
              >
                {t("common.learn_more")}
              </a>
            </article>
            <article className={styles["accessory"]}>
              <div className={styles["visual"]}>{t("icon.rack")}</div>
              <h3>{t("accessories.rack.title")}</h3>
              <p>{t("accessories.rack.description")}</p>
              <a
                className={styles.cardLink}
                href={detail("accessory-rack")}
                aria-label={t("accessories.rack.title")}
              >
                {t("common.learn_more")}
              </a>
            </article>
            <article className={styles["accessory"]}>
              <div className={styles["visual"]}>{t("icon.mudguard")}</div>
              <h3>{t("accessories.mudguard.title")}</h3>
              <p>{t("accessories.mudguard.description")}</p>
              <a
                className={styles.cardLink}
                href={detail("accessory-mudguard")}
                aria-label={t("accessories.mudguard.title")}
              >
                {t("common.learn_more")}
              </a>
            </article>
            <article className={styles["accessory"]}>
              <div className={styles["visual"]}>{t("icon.assist")}</div>
              <h3>{t("accessories.light.title")}</h3>
              <p>{t("accessories.light.description")}</p>
              <a
                className={styles.cardLink}
                href={detail("accessory-light")}
                aria-label={t("accessories.light.title")}
              >
                {t("common.learn_more")}
              </a>
            </article>
            <article className={styles["accessory"]}>
              <div className={styles["visual"]}>{t("icon.parts")}</div>
              <h3>{t("accessories.parts.title")}</h3>
              <p>{t("accessories.parts.description")}</p>
              <a
                className={styles.cardLink}
                href={detail("accessory-parts")}
                aria-label={t("accessories.parts.title")}
              >
                {t("common.learn_more")}
              </a>
            </article>
          </div>
        </div>
      </section>
      <section id="service" className={styles["service"]}>
        <div className={styles["inner"] + " " + styles["service-grid"]}>
          <img
            className={styles["service-image"]}
            src="/home/original/scene-city.webp"
            alt={t("images.city")}
            width="1536"
            height="1024"
            loading="lazy"
          />
          <div className={styles["service-copy"]}>
            <div className={styles["brandline"]}>
              <h2>{t("services.title")}</h2>
              <a href={myUrl}>{t("brand.my_alsvid")}</a>
            </div>
            <p>{t("services.description")}</p>
            <div className={styles["service-list"]}>
              <a
                className={styles["service-item"]}
                href={new URL("/my/vehicles/register", myUrl).toString()}
              >
                <b>{t("services.registration.title")}</b>
                <span>{t("services.registration.body")}</span>
              </a>
              <a
                className={styles["service-item"]}
                href={new URL("/my/vehicles", myUrl).toString()}
              >
                <b>{t("services.vehicles.title")}</b>
                <span>{t("services.vehicles.body")}</span>
              </a>
              <a
                className={styles["service-item"]}
                href={new URL("/my/vehicles", myUrl).toString()}
              >
                <b>{t("services.vin.title")}</b>
                <span>{t("services.vin.body")}</span>
              </a>
              <a
                className={styles["service-item"]}
                href={new URL("/my/vehicles", myUrl).toString()}
              >
                <b>{t("services.warranty.title")}</b>
                <span>{t("services.warranty.body")}</span>
              </a>
              <a
                className={styles["service-item"]}
                href={new URL("/my/service", myUrl).toString()}
              >
                <b>{t("services.repair.title")}</b>
                <span>{t("services.repair.body")}</span>
              </a>
              <a
                className={styles["service-item"]}
                href={new URL("/my/library", myUrl).toString()}
              >
                <b>{t("services.manuals.title")}</b>
                <span>{t("services.manuals.body")}</span>
              </a>
              <a
                className={styles["service-item"]}
                href={new URL("/my/service", myUrl).toString()}
              >
                <b>{t("services.locations.title")}</b>
                <span>{t("services.locations.body")}</span>
              </a>
            </div>
            <a className={styles["btn-dark"]} href={myUrl}>
              {t("services.open")}
            </a>
          </div>
        </div>
      </section>
      <section id="about" className={styles["about"] + " " + styles["section"]}>
        <div className={styles["inner"]}>
          <div className={styles["section-head"]}>
            <div>
              <div className={styles["eyebrow"]} style={{ color: "#808783" }}>
                {t("about.eyebrow")}
              </div>
              <h2>{t("about.title")}</h2>
            </div>
            <a className={styles["text-link"]} href={detail("about-story")}>
              {t("about.more")}
            </a>
          </div>
          <div className={styles["about-grid"]}>
            <article className={styles["about-card"]}>
              <h3>{t("brand.story")}</h3>
              <p>{t("about.story.body")}</p>
              <a
                className={styles.cardLink}
                href={detail("about-story")}
                aria-label={t("brand.story")}
              >
                {t("common.learn_more")}
              </a>
            </article>
            <article className={styles["about-card"]}>
              <h3>{t("about.design.title")}</h3>
              <p>{t("about.design.body")}</p>
              <a
                className={styles.cardLink}
                href={detail("about-design")}
                aria-label={t("about.design.title")}
              >
                {t("common.learn_more")}
              </a>
            </article>
            <article className={styles["about-card"]}>
              <h3>{t("about.engineering.title")}</h3>
              <p>{t("about.engineering.body")}</p>
              <a
                className={styles.cardLink}
                href={detail("about-engineering")}
                aria-label={t("about.engineering.title")}
              >
                {t("common.learn_more")}
              </a>
            </article>
            <article className={styles["about-card"]}>
              <h3>{t("about.manufacturing.title")}</h3>
              <p>{t("about.manufacturing.body")}</p>
              <a
                className={styles.cardLink}
                href={detail("about-manufacturing")}
                aria-label={t("about.manufacturing.title")}
              >
                {t("common.learn_more")}
              </a>
            </article>
            <article className={styles["about-card"]}>
              <h3>{t("about.news.title")}</h3>
              <p>{t("about.news.body")}</p>
              <a
                className={styles.cardLink}
                href={detail("about-news")}
                aria-label={t("about.news.title")}
              >
                {t("common.learn_more")}
              </a>
            </article>
          </div>
        </div>
      </section>
      <section id="dealer" className={styles["dealer"]}>
        <img
          className={styles["dealer-bg"]}
          src="/home/original/scene-touring.webp"
          alt={t("images.touring")}
          width="1536"
          height="1024"
          loading="lazy"
        />
        <div className={styles["dealer-shade"]}></div>
        <div className={styles["copy"]}>
          <div className={styles["eyebrow"]}>{t("dealer.eyebrow")}</div>
          <h2>
            {t("dealer.title_first")}
            <br />
            {t("dealer.title_second")}
          </h2>
          <p>{t("dealer.description")}</p>
          <a className={styles["btn-white"]} href={dealerUrl}>
            {t("dealer.apply")}
          </a>
          <a className={styles["btn-outline"]} href={dealerUrl}>
            {t("dealer.login")}
          </a>
        </div>
      </section>
      <footer className={styles["footer"]}>
        <div className={styles["footer-grid"]}>
          <div className={styles["footer-brand"]}>
            <b>{t("brand.name")}</b>
            <p>{t("brand.tagline")}</p>
          </div>
          <div className={styles["footer-col"]}>
            <h4>{t("footer.bikes")}</h4>
            <a href={detail("fc")}>{t("footer.fc")}</a>
            <a href={detail("ct")}>{t("footer.ct")}</a>
            <a href={detail("ft")}>{t("footer.ft")}</a>
            <a href={detail("gt")}>{t("footer.gt")}</a>
          </div>
          <div className={styles["footer-col"]}>
            <h4>{t("footer.accessories")}</h4>
            <a href="#accessory-categories">{t("footer.accessory_overview")}</a>
            <a href={detail("accessory-basket")}>
              {t("accessories.basket.title")}
            </a>
            <a href={detail("accessory-rack")}>{t("accessories.rack.title")}</a>
            <a href={detail("accessory-light")}>{t("footer.lights")}</a>
          </div>
          <div className={styles["footer-col"]}>
            <h4>{t("services.title")}</h4>
            <a href={myUrl}>{t("brand.my_alsvid")}</a>
            <a href={myUrl}>{t("services.registration.title")}</a>
            <a href={myUrl}>{t("services.warranty.title")}</a>
            <a href={myUrl}>{t("services.manuals.title")}</a>
          </div>
          <div className={styles["footer-col"]}>
            <h4>{t("footer.about")}</h4>
            <a href={detail("about-story")}>{t("brand.story")}</a>
            <a href={detail("about-design")}>{t("about.design.title")}</a>
            <a href={detail("about-engineering")}>
              {t("about.engineering.title")}
            </a>
            <a href={detail("about-manufacturing")}>
              {t("about.manufacturing.title")}
            </a>
          </div>
          <div className={styles["footer-col"]}>
            <h4>{t("footer.contact")}</h4>
            <a href={dealerUrl}>{t("footer.dealer")}</a>
            <a href={dealerUrl}>{t("footer.apply")}</a>
            <a href={new URL("/my/service", myUrl).toString()}>
              {t("footer.contact_us")}
            </a>
          </div>
        </div>
        <div className={styles["footer-bottom"]}>
          <span>
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </span>
          <span>{t("footer.legal")}</span>
        </div>
      </footer>
      <div className={styles["notice"]}>{t("notice")}</div>
    </main>
  );
}
