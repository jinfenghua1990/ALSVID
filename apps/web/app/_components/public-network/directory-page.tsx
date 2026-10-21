import { translator, type Locale } from '../../_lib/i18n';
import { publishedLocations } from './locations';
import { PublicShell } from './public-shell';
import styles from './network.module.css';

export async function DirectoryPage({ locale, kind }: { locale: Locale; kind: 'sales' | 'service' }) {
 const t=translator(locale);
 const sales=kind==='sales';
 const base='/'+locale;
 const {locations,available}=await publishedLocations(kind);
 return <PublicShell locale={locale}>
  <main>
   <section className={styles.directoryHero}>
    <img src={sales?'/home/original/scene-city.webp':'/home/original/scene-touring.webp'} alt=""/>
    <div className={styles.directoryShade}/>
    <div className={styles.heroContent}>
     <p className={styles.eyebrow}>{t(sales?'network.locations.eyebrow':'network.service.eyebrow')}</p>
     <h1>{t(sales?'network.locations.title':'network.service.title')}</h1>
     <p>{t(sales?'network.locations.body':'network.service.body')}</p>
     <a className={styles.outlineButton} href={sales?base+'/dealers#apply':'https://my.alsvidbike.com'}>
      {t(sales?'network.locations.apply':'network.service.owner')} <span aria-hidden="true">↗</span>
     </a>
    </div>
   </section>
   <section className={styles.directorySection}>
    <div className={styles.sectionIntro}>
     <p className={styles.eyebrow}>{t('network.shared.status')}</p>
     <h2>{t(sales?'network.locations.title':'network.service.title')}</h2>
    </div>
    <div className={styles.countryGrid}>
     {(['DE','AT'] as const).map(country=>{
      const records=locations.filter(x=>x.country===country);
      return <article className={styles.countryCard} key={country}>
       <div className={styles.countryHeader}>
        <h3>{t(country==='DE'?'network.locations.de':'network.locations.at')}</h3><span>{country}</span>
       </div>
       {records.length?<ul className={styles.locationList}>
        {records.map(location=><li key={location.id}>
         <strong>{location.name}</strong>
         <span>{location.address}, {location.city}</span>
         <small>{t(sales?'network.locations.sales':'network.locations.service')}</small>
        </li>)}
       </ul>:<div className={styles.empty}><span className={styles.emptyIcon} aria-hidden="true">○</span>
        <p>{!available?t('network.locations.unavailable'):t(sales?'network.locations.empty':'network.service.empty')}</p>
       </div>}
      </article>;
     })}
    </div>
    <div className={styles.directoryAfter}>
     <a href={base+'/dealers'}>{t('network.shared.back')} ↗</a>
     {!sales&&<a href="https://my.alsvidbike.com">{t('network.service.owner')} ↗</a>}
    </div>
   </section>
  </main>
 </PublicShell>;
}
