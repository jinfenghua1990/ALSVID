import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale } from '../../_lib/i18n/routing';
import { translator } from '../../_lib/i18n';
import { PublicShell } from '../../_components/public-network/public-shell';
import styles from '../../_components/public-network/network.module.css';

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = translator(locale);
  return { title: t('network.hero.title') + ' | ALSVID',
    description: t('network.hero.body'),
    alternates: { canonical: 'https://www.alsvidbike.com/' + locale + '/dealers',
      languages: { zh: 'https://www.alsvidbike.com/zh/dealers', de: 'https://www.alsvidbike.com/de/dealers', en: 'https://www.alsvidbike.com/en/dealers' } } };
}
export default async function DealerPartnershipPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = translator(locale);
  const base = '/' + locale;
  const platforms = [
    { code: 'FC', label: t('network.models.fc'), img: '/home/original/fc1-product.webp', href: base + '/explore/fc1' },
    { code: 'CT', label: t('network.models.ct'), img: '/home/original/scene-city.webp', href: base + '/explore/ct' },
    { code: 'FT', label: t('network.models.ft'), img: '/home/original/scene-fat-tire.webp', href: base + '/explore/ft' },
    { code: 'GT', label: t('network.models.gt'), img: '/home/original/scene-touring.webp', href: base + '/explore/gt' },
  ];
  const benefits = ['one', 'two', 'three'] as const;
  const modes = ['retail', 'demo', 'service'] as const;
  return <PublicShell locale={locale}>
    <main>
      <section className={styles.hero}>
        <img className={styles.heroImage} src="/home/original/scene-touring.webp" alt="" />
        <div className={styles.heroShade} />
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>{t('network.hero.eyebrow')}</p>
          <h1>{t('network.hero.title')}</h1>
          <p>{t('network.hero.body')}</p>
          <div className={styles.heroActions}>
            <a className={styles.outlineButton} href="#apply">{t('network.hero.apply')} <span aria-hidden="true">↗</span></a>
            <a className={styles.textButton} href={base + '/dealers/locations'}>{t('network.hero.find')} <span aria-hidden="true">↗</span></a>
          </div>
          <div className={styles.heroNote}>{t('network.hero.note')}</div>
        </div>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>{t('network.benefits.eyebrow')}</p>
          <h2>{t('network.benefits.title')}</h2>
        </div>
        <div className={styles.threeGrid}>
          {benefits.map((item, index) => <article className={styles.benefitCard} key={item}>
            <span className={styles.index}>0{index+1}</span>
            <h3>{t(('network.benefits.' + item + '.title') as 'network.benefits.one.title')}</h3>
            <p>{t(('network.benefits.' + item + '.body') as 'network.benefits.one.body')}</p>
          </article>)}
        </div>
      </section>
      <section className={styles.section + ' ' + styles.soft}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>{t('network.models.eyebrow')}</p>
          <h2>{t('network.models.title')}</h2>
        </div>
        <div className={styles.fourGrid}>{platforms.map(p => <a className={styles.platformCard} key={p.code} href={p.href}>
          <img src={p.img} alt="" loading="lazy"/>
          <div><span>{p.code} PLATFORM</span><h3>{p.label}</h3><b aria-hidden="true">↗</b></div>
        </a>)}</div>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>{t('network.modes.eyebrow')}</p>
          <h2>{t('network.modes.title')}</h2>
        </div>
        <div className={styles.threeGrid}>{modes.map(item => <article className={styles.modeCard} key={item}>
          <h3>{t(('network.modes.' + item) as 'network.modes.retail')}</h3>
          <p>{t(('network.modes.' + item + '.body') as 'network.modes.retail.body')}</p>
        </article>)}</div>
      </section>
      <section className={styles.applySection} id="apply">
        <div className={styles.applyCopy}>
          <p className={styles.eyebrow}>{t('network.apply.eyebrow')}</p>
          <h2>{t('network.apply.title')}</h2>
          <p>{t('network.apply.body')}</p>
          <a className={styles.partnerLogin} href="https://dealer.alsvidbike.com">{t('network.apply.login')} ↗</a>
        </div>
        <div className={styles.applicationPreview}>
          <form aria-label={t('network.apply.title')}>
            <fieldset disabled>
              <div className={styles.formGrid}>
                <label>{t('network.apply.company')}<input name="company" autoComplete="organization" /></label>
                <label>{t('network.apply.country')}<input name="country" autoComplete="country-name"/></label>
                <label>{t('network.apply.contact')}<input name="contact" autoComplete="name"/></label>
                <label>{t('network.apply.email')}<input name="email" type="email" autoComplete="email"/></label>
                <label>{t('network.apply.type')}<input name="type"/></label>
                <label className={styles.wide}>{t('network.apply.message')}<textarea name="message" rows={3}/></label>
              </div>
              <button className={styles.disabledSubmit} type="submit" disabled>{t('network.apply.pending')}</button>
            </fieldset>
          </form>
        </div>
      </section>
      <section className={styles.finalBanner}>
        <div><p className={styles.eyebrow}>{t('network.locations.eyebrow')}</p><h2>{t('network.locations.title')}</h2><p>{t('network.locations.body')}</p></div>
        <a className={styles.outlineButton} href={base + '/dealers/locations'}>{t('network.hero.find')} ↗</a>
      </section>
    </main>
  </PublicShell>;
}
