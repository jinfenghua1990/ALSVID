import type { CatalogSnapshot } from './crmeb-catalog';
import { translator, type Locale } from '../../_lib/i18n';
import styles from './catalog-panel.module.css';

export function LabCatalogPanel({ snapshot, locale }: { snapshot: CatalogSnapshot; locale: Locale }) {
  const t = translator(locale);
  const messages = {
    'not-configured': 'shopPreview.connectionUnconfigured',
    'configuration-error': 'shopPreview.connectionConfiguration',
    unavailable: 'shopPreview.connectionUnavailable',
    connected: 'shopPreview.connectionReady',
  } as const;
  return <section className={styles.panel} data-crmeb-catalog data-state={snapshot.state}>
    <h2>{t('shopPreview.connectionHeading')}</h2>
    <p role="status">{t(messages[snapshot.state])}</p>
    {snapshot.state === 'connected' && <>
      <p>{t('shopPreview.connectionScope')}</p>
      <p>{t('shopPreview.connectionCount', { count: snapshot.products.length })}</p>
      <ul>{snapshot.products.map(item => <li key={item.id}>{item.title}</li>)}</ul>
    </>}
    <p>{t('shopPreview.connectionChecked')} <time dateTime={snapshot.checkedAt}>
      {new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : locale === 'de' ? 'de-DE' : 'en-GB',
        { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(snapshot.checkedAt))} UTC
    </time></p>
    <p>{t('shopPreview.connectionRefresh')}</p>
  </section>;
}
