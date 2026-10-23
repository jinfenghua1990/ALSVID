import { headers } from 'next/headers';
import './design-system.css';
import type { Block, Screen } from './types';
import { screens } from './index';
import { DesignTable } from './design-table';
import { DesignForm } from './design-form';
import { LiveWorkbench, LiveOperationEntry, AdminLogout } from './live-operations';
import { AdminGlobalSearch } from './admin-global-search';
import { IntegratedOperations, hasIntegratedOperations } from './integrated-operations';
import { VehicleRecordDetail } from './vehicle-record-detail';
import { portalUrlFor } from '../_lib/portal-routing';
import { ArchitectureOverview } from './architecture-overview';
import { ADMIN_MODULES } from './business-module-registry';
import { AdminModuleDirectory } from './admin-module-directory';
import { P0OperationsCenter } from './p0-operations-center';

const AREAS = ADMIN_MODULES;

const QUICK_LINKS: readonly { label: string; portal: 'www' | 'dealer' | 'my'; localHref: string }[] = [
  { label: '官方首页', portal: 'www', localHref: '/home' },
  { label: '经销商平台', portal: 'dealer', localHref: '/dealer' },
  { label: '车主中心', portal: 'my', localHref: '/my' },
];

function isAreaActive(area: string, label: string): boolean {
  return AREAS.some(item => item.label === label && item.legacyAreas.includes(area));
}

const scopedMenus: Readonly<Record<string, readonly { group: string; items: string[] }[]>> = {
  '数据': [
    { group: '分析与统计', items: ['FC1 颜色偏好', '跨模块经营指标（待接入）'] },
  ],
  '电商': [
    { group: '电商工作台', items: ['电商工作台'] },
    { group: '商品管理', items: ['官网商品发布与审核', '首页商品绑定'] },
    { group: '库存与交易', items: ['电商库存查询', '商城价格管理', 'B2C 订单管理'] },
    { group: '后续能力', items: ['营销活动（待接入）', '支付配置（待接入）'] },
  ],
  '财务': [
    { group: '财务工作区', items: ['应收 / 应付与资金', '到岸成本与汇率'] },
  ],
  '物流': [
    { group: '仓储物流', items: ['库存台账', '出口物流与清关'] },
  ],
  '库存': [
    { group: '仓储物流', items: ['库存台账', '出口物流与清关'] },
    { group: '后续集成', items: ['第三方仓 WMS（待接入）'] },
  ],
  '经销商': [
    { group: '经销商 / B2B', items: ['经销商档案', '试骑申请与网点', 'B2B 订单（待联动）'] },
  ],
  '生产': [
    { group: '工厂生产', items: ['生产工作台', 'VIN / 车辆档案'] },
  ],
  '供应链': [
    { group: '采购协同', items: ['供应商与采购订单'] },
  ],
  '客户': [
    { group: '客户资产', items: ['客户与车主档案'] },
  ],
  '售后': [
    { group: '售后服务', items: ['售后工单'] },
  ],
  '订单': [
    { group: '兼容入口', items: ['旧版订单查询', '自建商城 B2C 订单'] },
  ],
};

function menuDestination(screen: Screen, label: string): string | undefined {
  const operational: Record<string, string> = {
    '电商工作台': '/admin/ecommerce',
    '官网商品发布': '/admin/ecommerce/publications',
    '官网商品发布与审核': '/admin/ecommerce/publications',
    '首页商品绑定': '/admin/ecommerce/homepage',
    '商城售价与 B2C 订单': '/admin/ecommerce/orders',
    '商城价格管理': '/admin/ecommerce/pricing',
    'B2C 订单管理': '/admin/ecommerce/orders',
    '电商库存': '/admin/ecommerce/inventory',
    '电商库存查询': '/admin/ecommerce/inventory',
    'FC1 颜色偏好': '/admin/analytics/color-interest',
    '应收 / 应付与资金': '/admin/finance',
    '到岸成本与汇率': '/admin/finance',
    '库存台账': '/admin/inventory',
    '出口物流与清关': '/admin/logistics',
    '经销商档案': '/admin/dealers',
    '试骑申请与网点': '/admin/dealers/test-rides',
    '生产工作台': '/admin/production',
    'VIN / 车辆档案': '/admin/production/vin-detail',
    '供应商与采购订单': '/admin/supply',
    '客户与车主档案': '/admin/customers',
    '售后工单': '/admin/after-sales',
    '旧版订单查询': '/admin/orders',
    '自建商城 B2C 订单': '/admin/ecommerce#b2c',
  };
  if (label in operational) return operational[label];
  if (label.includes('（待')) return undefined;
  if (screen.area === '产品') {
    const destinations: Record<string, string> = {
      '产品总览': '/admin/product',
      '产品类型': '/admin/product#product-types',
      '技术平台': '/admin/product#series',
      '产品型号': '/admin/product#model-register',
      '型号配置与 SKU': '/admin/product#models',
      '新建型号与配置': '/admin/product#configuration',
      'BOM 与零件库': '/admin/product#engineering',
    };
    if (destinations[label]) return destinations[label];
  }
  if (screen.area === '设置' && label === '系统架构') return '/admin/architecture';
  if (screen.area === '产品' && /商品发布|商品审核|官网发布|产品发布/.test(label)) return '/admin/ecommerce#publications';
  // Go to the persisted first-party Commerce workflow, not a design-only order screen.
  if (screen.area === '订单' && label === '全部订单') return '/admin/orders';
  if (screen.area === '订单' && label === 'B2C消费者订单') return '/admin/orders#b2c';
  const clean = (value: string) => value.replace(/[\s·/]/g, '');
  const term = clean(label);
  const moduleScreens = screens.filter(item => item.area === screen.area);
  return moduleScreens.find(item => clean(item.title) === term)?.route
    ?? moduleScreens.find(item => clean(item.title).startsWith(term) && term.length > 2)?.route;
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case 'platforms':
      return <section className="av-platforms" aria-label="产品平台">{block.items.map(item => <article className="av-card" key={item.title}><h2 className="av-cardtitle">{item.title}</h2>{item.details.map((detail,i)=><p key={i} className="av-cardhint">{detail}</p>)}</article>)}</section>;
    case 'shortcuts':
      return (
        <section className="av-card">
          <div className="av-cardhead"><h2 className="av-cardtitle">{block.title}</h2></div>
          <div className="av-shortcuts">
            {block.items.map(item => <a className="av-shortcut" href={item.href} key={item.href}>
              <strong>{item.label}</strong><span>{item.description}</span><i aria-hidden="true">→</i>
            </a>)}
          </div>
        </section>
      );
    case 'form':
      return <DesignForm {...block} />;
    case 'kpis':
      return (
        <div className="av-kpis">
          {block.items.map((item) => (
            <div className="av-kpi" key={`${item.label}-${item.value}`}>
              <div className="av-kpivalue">{item.value}</div>
              <div className="av-kpilabel">{item.label}</div>
              {item.delta ? (
                <div className="av-kpidelta" data-tone={item.tone ?? 'neutral'}>
                  {item.delta}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      );

    case 'table':
      return <DesignTable block={block} />;

    case 'bars':
      return (
        <section className="av-card">
          <div className="av-cardhead">
            <div>
              <h2 className="av-cardtitle">{block.title}</h2>
              {block.hint ? <p className="av-cardhint">{block.hint}</p> : null}
            </div>
          </div>
          <div className="av-bars">
            {block.items.map((item) => (
              <div className="av-bar" key={item.name}>
                <span className="av-barname">{item.name}</span>
                <span className="av-bartrack">
                  <span
                    className="av-barfill"
                    style={{ width: `${Math.min(100, item.percent ?? 0)}%` }}
                  />
                </span>
                <span className="av-barvalue">
                  {item.value ?? `${item.percent}%`}
                  {item.extra ? <span className="av-cardhint"> · {item.extra}</span> : null}
                  {item.tag ? (
                    <span className="av-tag" data-tone={item.tone ?? 'neutral'} style={{ marginLeft: 8 }}>
                      {item.tag}
                    </span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        </section>
      );

    case 'list':
      return (
        <section className="av-card">
          <div className="av-cardhead">
            <div>
              <h2 className="av-cardtitle">{block.title}</h2>
              {block.hint ? <p className="av-cardhint">{block.hint}</p> : null}
            </div>
          </div>
          <div className="av-list">
            {block.items.map((item) => (
              <div className="av-listrow" key={item.name}>
                <span className="av-listname">
                  {item.name}
                  {item.extra ? <span className="av-cardhint"> · {item.extra}</span> : null}
                </span>
                <span>
                  {item.tag ? (
                    <span className="av-tag" data-tone={item.tone ?? 'neutral'} style={{ marginRight: 8 }}>
                      {item.tag}
                    </span>
                  ) : null}
                  <span className="av-listvalue">{item.value}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      );

    case 'fields':
      return (
        <section className="av-card">
          <h2 className="av-cardtitle" style={{ marginBottom: 10 }}>
            {block.title}
          </h2>
          <div className="av-fields">
            {block.items.map((field) => {
              const index = field.indexOf('：');
              const label = index > 0 ? field.slice(0, index + 1) : '';
              const value = index > 0 ? field.slice(index + 1) : field;
              return (
                <p className="av-field" key={field}>
                  {label ? <b>{label}</b> : null}
                  {value}
                </p>
              );
            })}
          </div>
        </section>
      );

    case 'flow':
      return (
        <section className="av-card">
          <div className="av-cardhead">
            <div>
              <h2 className="av-cardtitle">{block.title}</h2>
              {block.hint ? <p className="av-cardhint">{block.hint}</p> : null}
            </div>
          </div>
          <div className="av-flow">
            {block.steps.map((step, index) => (
              <span key={step.label} style={{ display: 'contents' }}>
                <span className="av-flowstep" data-state={step.state}>
                  {step.label}
                  {step.state ? ` · ${step.state}` : ''}
                </span>
                {index < block.steps.length - 1 ? <span className="av-flowarrow">→</span> : null}
              </span>
            ))}
          </div>
        </section>
      );

    case 'timeline':
      return (
        <section className="av-card">
          <div className="av-cardhead">
            <div>
              <h2 className="av-cardtitle">{block.title}</h2>
            </div>
            {block.more ? <span className="av-more">{block.more}</span> : null}
          </div>
          {block.tabs ? (
            <div className="av-toolbar" style={{ marginBottom: 12 }}>
              {block.tabs.map((tab, index) => (
                <button className="av-chip" type="button" key={tab} data-active={index === 0}>
                  {tab}
                </button>
              ))}
            </div>
          ) : null}
          {block.items.length === 0 ? <p className="av-empty-state" role="status">{block.emptyMessage ?? '暂无动态'}</p> : <div className="av-timeline">
            {block.items.map((item) => (
              <div className="av-tlitem" key={`${item.tag}-${item.text}`}>
                <span className="av-tag av-tltag" data-tone="brand">
                  {item.tag}
                </span>
                <span>
                  <span className="av-tltext">{item.text}</span>
                  {item.time ? <span className="av-tltime"> · {item.time}</span> : null}
                </span>
              </div>
            ))}
          </div>}
        </section>
      );

    case 'tasks':
      return (
        <section className="av-card">
          <div className="av-cardhead">
            <div>
              <h2 className="av-cardtitle">{block.title}</h2>
            </div>
            {block.more ? <span className="av-more">{block.more}</span> : null}
          </div>
          {block.items.length === 0 ? <p className="av-empty-state" role="status">{block.emptyMessage ?? '暂无任务'}</p> : <div className="av-tasks">
            {block.items.map((item) => (
              <div className="av-task" key={item.title}>
                <div className="av-tasktop">
                  <span className="av-tasktitle">{item.title}</span>
                  <span
                    className="av-tag"
                    data-tone={
                      item.status === '已完成' ? 'good' : item.status === '进行中' ? 'brand' : 'warn'
                    }
                  >
                    {item.status}
                  </span>
                </div>
                <div className="av-taskmeta">
                  {item.source ?? ''}
                  {item.time ? ` · ${item.time}` : ''}
                </div>
              </div>
            ))}
          </div>}
        </section>
      );

    case 'search':
      return (
        <section className="av-card">
          <div className="av-cardhead">
            <div>
              <h2 className="av-cardtitle">{block.title}</h2>
              {block.hint ? <p className="av-cardhint">{block.hint}</p> : null}
            </div>
          </div>
          <div className="av-toolbar">
            <input
              className="av-search"
              type="search"
              placeholder={block.placeholder}
              aria-label={block.placeholder}
            />
            <button className="av-btn" data-variant="primary" type="button">
              查询
            </button>
          </div>
          <div className="av-fields" style={{ marginTop: 12 }}>
            {block.fields.map((field) => {
              const index = field.indexOf('：');
              return (
                <p className="av-field" key={field}>
                  {index > 0 ? <b>{field.slice(0, index + 1)}</b> : null}
                  {index > 0 ? field.slice(index + 1) : field}
                </p>
              );
            })}
          </div>
        </section>
      );

    case 'trend': {
      const max = Math.max(...block.bars, 1);
      return (
        <section className="av-card">
          <div className="av-cardhead">
            <div>
              <h2 className="av-cardtitle">{block.title}</h2>
            </div>
          </div>
          {block.tabs ? (
            <div className="av-toolbar" style={{ marginBottom: 12 }}>
              {block.tabs.map((tab, index) => (
                <button className="av-chip" type="button" key={tab} data-active={index === 0}>
                  {tab}
                </button>
              ))}
            </div>
          ) : null}
          {block.bars.length === 0 ? <p className="av-empty-state" role="status">{block.emptyMessage ?? block.note ?? '暂无趋势数据'}</p> : <div className="av-trend">
            {block.bars.map((value, index) => (
              <div className="av-trendcol" key={index}>
                <div className="av-trendbar" style={{ height: `${(value / max) * 100}%` }} />
              </div>
            ))}
          </div>}
          {block.axis ? (
            <div className="av-trendaxis">
              {block.axis.map((tick) => (
                <span key={tick}>{tick}</span>
              ))}
            </div>
          ) : null}
          {block.legend ? (
            <div className="av-legend" style={{ marginTop: 10 }}>
              {block.legend.map((item) => (
                <span key={item}>
                  <i />
                  {item}
                </span>
              ))}
            </div>
          ) : null}
        </section>
      );
    }

    default:
      return null;
  }
}

function Blocks({ blocks, stacked = false }: { blocks: readonly Block[]; stacked?: boolean }) {
  const nodes: React.ReactNode[] = [];
  let fields: Extract<Block, { kind: 'fields' }>[] = [];

  const flushFields = () => {
    if (fields.length === 0) return;
    const group = fields;
    fields = [];
    nodes.push(
      <div className="av-fieldgrid" key={`fields-${nodes.length}`}>
        {group.map((block) => (
          <BlockView block={block} key={block.title} />
        ))}
      </div>,
    );
  };

  blocks.forEach((block) => {
    if (stacked) {
      nodes.push(<BlockView block={block} key={`${block.kind}-${nodes.length}`} />);
      return;
    }
    if (block.kind === 'fields') {
      fields.push(block);
      return;
    }
    flushFields();
    nodes.push(<BlockView block={block} key={`${block.kind}-${nodes.length}`} />);
  });
  flushFields();

  return <>{nodes}</>;
}

export async function AdminScreen({ screen, theme }: { screen: Screen; theme?: string }) {
  const requestHost = (await headers()).get('host') ?? '';
  const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(requestHost);
  const quickLinks = QUICK_LINKS.map(link => ({
    label: link.label,
    href: isLocal ? link.localHref : portalUrlFor(requestHost, link.portal),
  }));
  const actions = screen.actions ?? [];
  const moduleScreens = screens.filter(item => item.area === screen.area && item.sourceNode);
  const isLiveProductRoot = screen.id === 'product' && screen.route === '/admin/product';
  const isCustomLiveModule = Boolean(screen.sourceNode?.startsWith('module:'));
  const secondaryNavigation = isLiveProductRoot
    ? [
        { group: '产品工作区', items: ['产品总览', '产品类型', '技术平台', '产品型号'] },
        { group: '型号与工程', items: ['型号配置与 SKU', '新建型号与配置', 'BOM 与零件库'] },
      ]
    : screen.area === '设置'
      ? [...(screen.secondary ?? []), { group: '架构与知识', items: ['系统架构'] }]
      : [...(scopedMenus[screen.area] ?? screen.secondary ?? [])];
  const hasSecondaryNavigation = secondaryNavigation.length > 0;
  const isIntegratedOverview = Boolean(screen.sourceNode && hasIntegratedOperations(screen.area) && (
    screen.route.split('/').length === 3 ||
    (screen.area === '电商' && screen.route.startsWith('/admin/ecommerce/'))
  ));
  const isEcommerceWorkspace = screen.area === '电商' && isIntegratedOverview;
  const isVehicleDetail = screen.route === '/admin/production/vin-detail' || screen.route === '/admin/production/vin';

  return (
    <div className="av av-ambient" data-theme={theme}>
      <header className="av-topbar">
        <a className="av-brand" href="/admin">
          ALSVID <span>OPERATIONS</span>
        </a>
        <nav className="av-primarynav" aria-label="一级导航">
          {AREAS.map((area) => (
            <a
              className="av-navitem"
              key={area.label}
              href={area.href}
              title={area.description}
              data-active={isAreaActive(screen.area, area.label)}
              aria-current={isAreaActive(screen.area, area.label) ? 'page' : undefined}
            >
              {area.label}
            </a>
          ))}
        </nav>
        <div className="av-toputils">
          <div className="av-quicklinks">
            {quickLinks.map((link, index) => (
              <span key={link.label} style={{ display: 'contents' }}>
                {index > 0 ? <i /> : null}
                <a href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>
              </span>
            ))}
          </div>
          <AdminGlobalSearch />
          <button className="av-iconbtn" type="button" aria-label="通知尚未接入" title="通知中心尚未接入" disabled>
            ◔
          </button>
          <button className="av-iconbtn" type="button" aria-label="主题切换尚未接入" title="主题切换尚未接入" disabled>
            ◐
          </button>
          <AdminLogout />
          <div className="av-user">
            <span className="av-avatar" aria-hidden="true">
              A
            </span>
            <span className="av-username">
              管理员
              <small>ALSVID</small>
            </span>
          </div>
        </div>
      </header>

      <div className={`av-body${hasSecondaryNavigation ? '' : ' av-body--wide'}${isLiveProductRoot ? ' av-body--product' : ''}${isEcommerceWorkspace ? ' av-body--ecommerce' : ''}`}>
        {hasSecondaryNavigation ? (
          <aside className="av-rail" aria-label="二级导航">
            {secondaryNavigation.map((group) => (
              <div className="av-railgroup" key={group.group}>
                <div className="av-railtitle">{group.group}</div>
                {group.items.map((item) => (
                  <span key={item} style={{ display: 'contents' }}>
                    {menuDestination(screen, item) ? <a
                      className="av-railitem"
                      href={menuDestination(screen, item)}
                      data-active={menuDestination(screen, item) === screen.route}
                      aria-current={menuDestination(screen, item) === screen.route ? 'page' : undefined}
                    >
                      {item}
                    </a> : <span className="av-railitem" aria-disabled="true" title="该业务入口尚未单独实现">{item}</span>}
                  </span>
                ))}
                <div className="av-railspacer" />
              </div>
            ))}
            {!isIntegratedOverview && !isLiveProductRoot ? <div className="av-railgroup">
              <div className="av-railtitle">设计页面与流程 · {moduleScreens.length}</div>
              {moduleScreens.map(item => <a className="av-railitem" key={item.route} href={item.route} data-active={item.route === screen.route} aria-current={item.route === screen.route ? 'page' : undefined}>{item.title}</a>)}
            </div> : null}
          </aside>
        ) : null}

        <main className="av-workspace">
          {screen.id !== 'workbench' && screen.sourceNode && !isIntegratedOverview && !isLiveProductRoot && !isCustomLiveModule && <p className="av-fixture-note">{isIntegratedOverview || isVehicleDetail ? '真实业务操作已接入已有领域 API；下方保留独立设计示例供对照。' : '界面示例 · 业务数据与审批、库存、发货等服务尚未接入'}</p>}
          {!isLiveProductRoot && !isEcommerceWorkspace && <div className="av-pagehead">
            <div>
              <p className="av-eyebrow">ALSVID OPERATIONS</p>
              <h1 className="av-pagetitle">{isVehicleDetail ? 'VIN / 车辆档案' : screen.title}</h1>
              <p className="av-pagesub">{isVehicleDetail ? '真实车辆主键查询与售后导航；未确认的客户归属不在这里自动生成。' : screen.subtitle}</p>
            </div>
            {screen.id === 'workbench' ? <a className="av-btn" href="/admin/architecture">查看系统架构 →</a> : null}
            {actions.length > 0 && !isIntegratedOverview && !isVehicleDetail ? (
              <div className="av-pageactions">
                {actions.map((action, index) => {
                  // Only route business actions to real persisted workflows. Design-state pages remain accessible as previews.
                  const targets: Record<string, string> = { '新建型号': '/product', '新建生产计划': '/production' };
                  const href = targets[action.replace(/^[+＋↓\s]+/g,'')];
                  return href ? <a key={action} className="av-btn" data-variant="primary" href={href}>{action}</a> : <button
                    className="av-btn"
                    type="button"
                    key={action}
                    data-variant={index === actions.length - 1 ? 'primary' : undefined}
                    disabled
                    title="此操作尚无可保存的真实业务流程；请使用下方已接入业务工作台"
                  >
                    {action}
                  </button>;
                })}
              </div>
            ) : null}
          </div>}

          {screen.steps && !isVehicleDetail && <nav className="av-workflow-pages" aria-label="流程画面">{screen.steps.map((step,i) => <a key={step.href} href={step.href} className="av-chip" aria-current={step.href===screen.route?'step':undefined} data-active={step.href===screen.route}>{i+1}. {step.label}</a>)}</nav>}
          {screen.id === 'workbench' ? (
            <>
              <P0OperationsCenter />
              <details className="av-card av-design-archive"><summary>其他业务数据概览（原有看板）</summary><LiveWorkbench /></details>
              <AdminModuleDirectory />
              <Blocks blocks={screen.blocks.filter((block) => block.kind !== 'kpis')} />
            </>
          ) : screen.id === 'system-architecture' ? (
            <ArchitectureOverview />
          ) : isVehicleDetail ? (
            <>
              <VehicleRecordDetail />
              <details className="av-card av-design-archive">
                <summary>原 VIN 详情设计图（仅设计预览）</summary>
                <Blocks blocks={screen.blocks} stacked />
              </details>
            </>
          ) : isIntegratedOverview ? (
            <IntegratedOperations area={screen.area} route={screen.route} />
          ) : (
            <>
              {screen.sourceNode && screen.route.split('/').length === 3
                ? <LiveOperationEntry area={screen.area} />
                : null}
              <Blocks blocks={screen.blocks} stacked={Boolean(screen.sourceNode)} />
            </>
          )}
          {!isIntegratedOverview && !isLiveProductRoot && moduleScreens.length > 1 && <nav className="av-card av-screen-links" aria-label="相关页面与流程状态"><h2 className="av-cardtitle">相关页面与流程</h2>{moduleScreens.filter(item => item.route !== screen.route).map(item => <a className="av-chip" key={item.route} href={item.route}>{item.title}</a>)}</nav>}
        </main>
      </div>
    </div>
  );
}

export default AdminScreen;
