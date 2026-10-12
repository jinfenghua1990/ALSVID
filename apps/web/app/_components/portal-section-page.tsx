import styles from './portal-section-page.module.css';

export interface PortalSectionCard {
  title: string;
  description: string;
  eyebrow?: string;
  footer?: string;
}

export function PortalSectionPage({
  eyebrow,
  title,
  description,
  cards,
  notice,
}: {
  eyebrow: string;
  title: string;
  description: string;
  cards: readonly PortalSectionCard[];
  notice?: string;
}) {
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <span className={styles.status}>页面已就位 · 暂无业务数据</span>
      </header>

      {notice ? <div className={styles.notice}>{notice}</div> : null}

      <div className={styles.grid}>
        {cards.map((card) => (
          <article className={styles.card} key={card.title}>
            <div className={styles.cardTop}>
              <span>{card.eyebrow ?? 'ALSVID'}</span>
              <span className={styles.emptyTag}>暂无数据</span>
            </div>
            <h2>{card.title}</h2>
            <p>{card.description}</p>
            <footer>{card.footer ?? '真实业务记录接入后在此展示。'}</footer>
          </article>
        ))}
      </div>
    </section>
  );
}
