import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale } from '../../_lib/i18n/routing';
import { translator } from '../../_lib/i18n';
import { PublicShell } from '../../_components/public-network/public-shell';
import { DealerApplicationDialog, DealerApplicationTrigger } from '../../_components/public-network/application-dialog';
import styles from '../../_components/public-network/network.module.css';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Props = { params: Promise<{ locale: string }>; searchParams?: SearchParams };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = translator(locale);
  return { title: t('network.hero.title') + ' | ALSVID',
    description: t('network.hero.body'),
    alternates: { canonical: 'https://www.alsvidbike.com/' + locale + '/dealers',
      languages: { zh: 'https://www.alsvidbike.com/zh/dealers', de: 'https://www.alsvidbike.com/de/dealers', en: 'https://www.alsvidbike.com/en/dealers' } } };
}
export default async function DealerPartnershipPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = searchParams ? await searchParams : {};
  const applyRequested = Array.isArray(query.apply) ? query.apply[0] === '1' : query.apply === '1';
  if (!isLocale(locale)) notFound();
  const t = translator(locale);
  const base = '/' + locale;
  const dealerLoginUrl = 'https://dealer.alsvidbike.com/login?portal=dealer&locale=' + locale;
  const platforms = [
    { code: 'FC', label: t('network.models.fc'), img: '/home/original/fc1-product.webp', href: base + '/explore/fc1' },
    { code: 'CT', label: t('network.models.ct'), img: '/home/original/scene-city.webp', href: base + '/explore/ct' },
    { code: 'FT', label: t('network.models.ft'), img: '/home/original/scene-fat-tire.webp', href: base + '/explore/ft' },
    { code: 'GT', label: t('network.models.gt'), img: '/home/original/scene-touring.webp', href: base + '/explore/gt' },
  ];
  const benefits = ['one', 'two', 'three'] as const;
  const modes = ['retail', 'demo', 'service'] as const;
  return <PublicShell locale={locale}>
    <DealerApplicationDialog locale={locale} initialOpen={applyRequested}>
    <main>
      <section className={styles.hero}>
        <img className={styles.heroImage} src="/home/original/scene-touring.webp" alt="" />
        <div className={styles.heroShade} />
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>{t('network.hero.eyebrow')}</p>
          <h1>{t('network.hero.title')}</h1>
          <p>{t('network.hero.body')}</p>
          <div className={styles.heroActions}>
            <DealerApplicationTrigger className={styles.outlineButton}>{t('network.hero.apply')}</DealerApplicationTrigger>
            <a className={styles.textButton} href={dealerLoginUrl}>{t('network.nav.account')}</a>
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
          <div><span>{p.code} PLATFORM</span><h3>{p.label}</h3></div>
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
      <section className={styles.processSection}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>{t('network.process.eyebrow')}</p>
          <h2>{t('network.process.title')}</h2>
        </div>
        <div className={styles.processGrid}>
          {(['one','two','three'] as const).map((step,i)=><div key={step} className={styles.processStep}>
            <span>0{i+1}</span><h3>{t(('network.process.'+step+'.title') as 'network.process.one.title')}</h3>
            <p>{t(('network.process.'+step+'.body') as 'network.process.one.body')}</p>
          </div>)}
        </div>
      </section>
      <section className={styles.applySection} id="apply">
        <div className={styles.applyCopy}>
          <p className={styles.eyebrow}>{t('network.apply.eyebrow')}</p>
          <h2>{t('network.apply.title')}</h2>
          <p>{t('network.apply.body')}</p>
          <a className={styles.partnerLogin} href={dealerLoginUrl}>{t('network.apply.login')}</a>
        </div>
        <div className={styles.applyInvite}>
          <p className={styles.eyebrow}>{t('network.apply.eyebrow')}</p>
          <h3>{t('network.apply.title')}</h3>
          <p>{t('network.apply.body')}</p>
          <DealerApplicationTrigger className={styles.submitButton}>{t('network.hero.apply')}</DealerApplicationTrigger>
        </div>
      </section>
      <section className={styles.section + ' ' + styles.faqSection}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>{t('network.faq.eyebrow')}</p>
          <h2>{t('network.faq.title')}</h2>
        </div>
        <div className={styles.faqItems}>{(['one','two','three'] as const).map(f=>
          <details key={f} className={styles.faqItem}>
            <summary>{t(('network.faq.'+f+'.q') as 'network.faq.one.q')}</summary>
            <p>{t(('network.faq.'+f+'.a') as 'network.faq.one.a')}</p>
          </details>)}</div>
      </section>
      <section className={styles.finalBanner}>
        <div><p className={styles.eyebrow}>{t('network.locations.eyebrow')}</p><h2>{t('network.locations.title')}</h2><p>{t('network.locations.body')}</p></div>
        <a className={styles.outlineButton} href={base + '/dealers/locations'}>{t('network.hero.find')}</a>
      </section>
    </main>
    </DealerApplicationDialog>
  </PublicShell>;
}
