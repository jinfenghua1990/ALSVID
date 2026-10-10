import { AppShell } from '@alsvid/ui';
import { navigationFor } from './app-navigation';

const domains = [
  ['产品', '平台、车型、SKU、工程发布与后续配件目录'],
  ['运营', '采购、生产、质检、库存、仓库与出口物流'],
  ['商业', '经销商、合作伙伴、Shopify 订单事实与财务协同'],
  ['车辆', '车辆出生、Vehicle 360、交付、所有权与客户关系'],
  ['售后', '保修、服务工单、维修与配件更换历史'],
  ['人员与系统', '员工、访问权限、集成、审计与环境基础设施'],
] as const;

function domainStatus(name: string) {
  if (name === '产品') return <a href="/product">产品与工程基础已可用 →</a>;
  if (name === '运营') return <span><a href="/supply">采购</a> · <a href="/production">生产</a> · <a href="/inventory">库存</a> · <a href="/logistics">物流</a></span>;
  if (name === '商业') return <span><a href="/dealers">经销商</a> · <a href="/commerce">Shopify 事实</a> · <a href="/finance">财务</a></span>;
  if (name === '车辆') return <a href="/production">车辆出生已可用 · Vehicle 360 待继续 →</a>;
  if (name === '人员与系统') return <span><a href="/people/employees">员工中心</a> · <a href="/settings/environment">环境与基础设施</a></span>;
  return '已规划 · 等待后续实现';
}

export default function HomePage() {
  return (
    <AppShell navigation={navigationFor('/')} footer="ALSVID 内部管理后台" workspaceId="overview">
      <header className="topbar">
        <div>
          <div className="eyebrow">ALSVID 管理控制台</div>
          <h1>围绕每一台自行车，连接产品、运营、车辆与售后。</h1>
        </div>
        <a className="status" href="/login"><span /> 登录 / 账户</a>
      </header>
      <div className="hero">
        <p>从产品工程、供应与生产，到欧洲经销商、车辆交付、所有权、售后与生命周期记录。ALSVID 保留自己的业务事实，同时继续让 Shopify、WMS 等专业系统承担各自职责。</p>
        <div className="flow">产品 <b>→</b> 运营 <b>→</b> 商业 <b>→</b> 车辆 <b>→</b> 经销商 <b>→</b> 客户 <b>→</b> 售后</div>
      </div>
      <div className="grid">
        {domains.map(([name, description]) => (
          <article className="card" key={name}>
            <div className="cardTop"><span className="dot" /><span>业务模块</span></div>
            <h2>{name}</h2>
            <p>{description}</p>
            <div className="cardFoot">{domainStatus(name)}</div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
