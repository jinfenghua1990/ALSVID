import { AppShell } from '@alsvid/ui';
import { navigationFor } from '../app-navigation';
import styles from './overview.module.css';

const domains = [
  ['产品', '平台、车型、SKU、工程发布与后续配件目录'],
  ['运营', '采购、生产、质检、库存、仓库与出口物流'],
  ['商业', '经销商、合作伙伴、Shopify 订单事实与财务协同'],
  ['车辆', '车辆出生、Vehicle 360、交付、所有权与客户关系'],
  ['售后', '保修、服务工单、维修与配件更换历史'],
  ['人员与系统', '员工、访问权限、集成、审计与环境基础设施'],
] as const;

function domainStatus(name: string) {
  if (name === '产品') return <a href="/product">进入产品中心 →</a>;
  if (name === '运营') return <span><a href="/supply">采购</a> · <a href="/production">生产</a> · <a href="/inventory">库存</a> · <a href="/logistics">物流</a></span>;
  if (name === '商业') return <span><a href="/dealers">经销商</a> · <a href="/commerce">订单</a> · <a href="/finance">财务</a></span>;
  if (name === '车辆') return <a href="/vehicle360">进入 Vehicle 360 →</a>;
  if (name === '人员与系统') return <span><a href="/people/employees">员工中心</a> · <a href="/settings/environment">系统环境</a></span>;
  return <span>暂无业务数据</span>;
}

export default function OverviewPage() {
  return (
    <AppShell navigation={navigationFor('/overview')} footer="ALSVID · Internal Platform" workspaceId="overview">
      <section className={styles.hero}>
        <p className={styles.eyebrow}>ALSVID BUSINESS OVERVIEW</p>
        <h1>围绕每一台自行车，连接产品、运营、车辆与售后。</h1>
        <p>ALSVID 保留自己的业务事实，同时让 Shopify、WMS 等专业系统继续承担各自职责。没有真实业务记录的模块保持空置，不生成演示数据。</p>
        <div className={styles.flow}>产品 <b>→</b> 运营 <b>→</b> 商业 <b>→</b> Vehicle 360 <b>→</b> 经销商 <b>→</b> 客户 <b>→</b> 售后</div>
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHead}><h2>业务模块</h2><p>统一入口 · 真实数据优先</p></header>
        <div className={styles.grid}>
          {domains.map(([name, description]) => (
            <article className={styles.card} key={name}>
              <div className={styles.cardTop}><span className={styles.dot} /><span>ALSVID</span></div>
              <h3>{name}</h3>
              <p>{description}</p>
              <div className={styles.cardFoot}>{domainStatus(name)}</div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
