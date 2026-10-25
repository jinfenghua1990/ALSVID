'use client';
import { useEffect, useRef, useState } from 'react';
import { translator, type Locale, type TranslationKey } from '../../_lib/i18n';
import { parsePreviewBag, previewBagKey, type PreviewLine, type PreviewModel, type PreviewVersion } from './preview-bag';
import styles from './shop-preview.module.css';

const models: { id: PreviewModel; code: string; image: string; description: TranslationKey }[] = [
  { id: 'fc1', code: 'ALSVID FC1', image: '/home/original/fc1-product.webp', description: 'shopPreview.fc1' },
  { id: 'fc2', code: 'ALSVID FC2', image: '/products/fc2/side-studio-1536.webp', description: 'shopPreview.fc2' },
];
const versionKeys: Record<PreviewVersion, TranslationKey> = {
  standard: 'shopPreview.standard', pro: 'shopPreview.pro', pending: 'shopPreview.pending',
};
export function ShopPreview({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [version, setVersion] = useState<'standard' | 'pro'>('standard');
  const [bag, setBag] = useState<PreviewLine[]>([]);
  const [ready, setReady] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [detail, setDetail] = useState<PreviewModel | null>(null);
  const [notice, setNotice] = useState('');
  const bagHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    try { setBag(parsePreviewBag(sessionStorage.getItem(previewBagKey))); } catch { /* storage is optional */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { sessionStorage.setItem(previewBagKey, JSON.stringify(bag)); } catch { /* retain in-memory interaction */ }
  }, [bag, ready]);
  const count = bag.reduce((sum, item) => sum + item.quantity, 0);
  const visible = models.filter(model => (filter === 'all' || filter === model.id) && model.code.toLowerCase().includes(search.toLowerCase()));
  function add(model: PreviewModel) {
    const selectedVersion = model === 'fc1' ? version : 'pending';
    setBag(previous => {
      const existing = previous.find(item => item.model === model && item.version === selectedVersion);
      return existing ? previous.map(item => item === existing ? { ...item, quantity: Math.min(9, item.quantity + 1) } : item)
        : [...previous, { model, version: selectedVersion, quantity: 1 }];
    });
    setNotice(t('shopPreview.added', { model: models.find(item => item.id === model)?.code ?? model }));
  }
  return <main className={styles.page} data-shop-preview lang={locale}>
    <div className={styles.noticeBar}>{t('shopPreview.notice')}</div>
    <section className={styles.hero}>
      <div><p className={styles.kicker}>{t('shopPreview.kicker')}</p><h1>{t('shopPreview.heading')}</h1>
        <p>{t('shopPreview.body')}</p><a href={'/' + locale + '/bikes'}>{t('shopPreview.original')} →</a></div>
      <img src="/home/original/fc1-product.webp" alt={t('shopPreview.reference')} width={900} height={600} />
    </section>
    <div className={styles.toolbar}>
      <div className={styles.filters} role="group" aria-label={t('shopPreview.all')}>
        {[{ id: 'all', label: t('shopPreview.all') }, ...models.map(model => ({ id: model.id, label: model.code }))].map(item =>
          <button type="button" key={item.id} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}
      </div>
      <label className={styles.search}>{t('shopPreview.search')}<input type="search" value={search} onChange={event => setSearch(event.target.value)} /></label>
      <button type="button" className={styles.bagButton} aria-expanded={bagOpen} aria-controls="independent-preview-bag" onClick={() => setBagOpen(open => !open)}>{t('shopPreview.bag', { count })}</button>
    </div>
    <div className={styles.catalogHeading}><h2>{t('shopPreview.title')}</h2><span>{t('shopPreview.count', { count: visible.length })}</span></div>
    <div className={styles.grid}>{visible.map(model => <article className={styles.product} key={model.id} data-preview-model={model.id}>
      <div className={styles.image}><img src={model.image} alt={model.code + ' · ' + t('shopPreview.reference')} width={700} height={460} /></div>
      <div className={styles.productBody}><span className={styles.label}>{t('shopPreview.detail')}</span><h2>{model.code}</h2><p>{t(model.description)}</p>
        <small>{t('shopPreview.reference')}</small>
        <div className={styles.versions}><span>{t('shopPreview.version')}</span>
          {model.id === 'fc1' ? <div role="group" aria-label={t('shopPreview.version')}>{(['standard', 'pro'] as const).map(item =>
            <button type="button" key={item} aria-pressed={version === item} onClick={() => setVersion(item)}>{t(versionKeys[item])}</button>)}</div> : <strong>{t('shopPreview.pending')}</strong>}
        </div>
        <div className={styles.price}>{t('shopPreview.price')}</div>
        <div className={styles.actions}><a href={'/' + locale + '/explore/' + model.id}>{t('shopPreview.details')}</a>
          <button type="button" onClick={() => add(model.id)}>{t('shopPreview.add')}</button></div>
        <button type="button" className={styles.more} aria-expanded={detail === model.id} aria-controls={'preview-detail-' + model.id} onClick={() => setDetail(value => value === model.id ? null : model.id)}>{detail === model.id ? t('shopPreview.close') : t('shopPreview.compare')}</button>
        <div id={'preview-detail-' + model.id} hidden={detail !== model.id}><p>{t('shopPreview.notice')}</p><a href={'/' + locale + '/explore/' + model.id}>{t('shopPreview.details')} →</a></div>
      </div>
    </article>)}</div>
    {!visible.length && <div className={styles.empty}><p>{t('shopPreview.empty')}</p><button type="button" onClick={() => { setFilter('all'); setSearch(''); }}>{t('shopPreview.clear')}</button></div>}
    <p className={styles.status} role="status">{notice}</p>
    <section id="independent-preview-bag" className={styles.bag} hidden={!bagOpen} aria-label={t('shopPreview.bagTitle')}>
      <div className={styles.bagTitle}><h2 ref={bagHeading}>{t('shopPreview.bagTitle')}</h2><button type="button" onClick={() => setBagOpen(false)}>{t('shopPreview.close')}</button></div>
      <p>{t('shopPreview.restore')}</p>
      {bag.length ? bag.map(line => <div className={styles.bagLine} key={line.model + line.version}>
        <div><strong>{models.find(item => item.id === line.model)?.code}</strong><span>{t(versionKeys[line.version])}</span></div>
        <label>{t('shopPreview.quantity')}<input type="number" min={1} max={9} value={line.quantity} onChange={event => {
          const quantity = Number(event.target.value);
          if (Number.isInteger(quantity) && quantity >= 1 && quantity <= 9)
            setBag(previous => previous.map(item => item === line ? { ...item, quantity } : item));
        }} /></label>
        <button type="button" onClick={() => setBag(previous => previous.filter(item => item !== line))}>{t('shopPreview.remove')}</button>
      </div>) : <p>{t('shopPreview.bagEmpty')}</p>}
      <p>{t('shopPreview.noTotal')}</p><button type="button" disabled>{t('shopPreview.noCheckout')}</button>
    </section>
    <p className={styles.footnote}>{t('shopPreview.notConnected')}</p>
  </main>;
}
