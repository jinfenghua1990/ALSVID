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
  if (name === '商业') return <span><a href="/dealers">经销商</a> · <a href="/commerce">订单事实</a> · <a href="/finance">财务</a></span>;
  if (name === '车辆') return <a href="/vehicle360">Vehicle 360 基础工作台 →</a>;
  if (name === '人员与系统') return <span><a href="/people/employees">员工中心</a> · <a href="/settings/environment">环境与基础设施</a></span>;
  return '已规划 · 暂无业务数据';
}

export default function OverviewPage() {
  return (
    <AppShell navigation={navigationFor('/overview')} footer="ALSVID 内部管理后台" workspaceId="overview">
      <main className={styles.page}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <p className={styles.eyebrow}>ALSVID / BUSINESS OVERVIEW</p>
            <h1>围绕每一台自行车，连接产品、运营、车辆与售后。</h1>
          </div>
          <a className={styles.portalLink} href="/admin"><span className={styles.portalDot} />管理首页</a>
        </header>

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p>从产品工程、供应与生产，到欧洲经销商、车辆交付、所有权、售后与生命周期记录。ALSVID 只沉淀自己的业务事实，同时让 Shopify、WMS 等专业系统继续承担各自职责。</p>
            <div className={styles.heroMeta}><span>内部管理</span><span>单一业务事实</span><span>跨模块追踪</span></div>
          </div>
          <div className={styles.flowCard}>
            <span>CORE BUSINESS FLOW</span>
            <div className={styles.flow}>产品 <b>→</b> 运营 <b>→</b> 商业 <b>→</b> 车辆 <b>→</b> 客户 <b>→</b> 售后</div>
          </div>
        </section>

        <div className={styles.sectionHead}>
          <div><span>WORKSPACES</span><h2>业务工作区</h2></div>
          <p>没有录入的数据保持为空，不用演示数字填充真实业务页面。</p>
        </div>

        <section className={styles.grid} aria-label="ALSVID 业务工作区">
          {domains.map(([name, description], index) => (
            <article className={styles.card} key={name}>
              <div className={styles.cardTop}><span>业务模块</span><span className={styles.index}>{String(index + 1).padStart(2, '0')}</span></div>
              <h3>{name}</h3>
              <p>{description}</p>
              <div className={styles.cardFoot}>{domainStatus(name)}</div>
            </article>
          ))}
        </section>
      </main>
    </AppShell>
  );
}
