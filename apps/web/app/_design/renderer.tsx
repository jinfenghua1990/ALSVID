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

const AREAS: readonly { label: string; href: string }[] = [
  { label: '工作台', href: '/admin' },
  { label: '产品', href: '/admin/product' },
  { label: '订单', href: '/admin/orders' },
  { label: '生产', href: '/admin/production' },
  { label: '库存', href: '/admin/inventory' },
  { label: '经销商', href: '/admin/dealers' },
  { label: '客户/车主', href: '/admin/customers' },
  { label: '售后', href: '/admin/after-sales' },
  { label: '供应链', href: '/admin/supply' },
  { label: '数据', href: '/admin/analytics' },
  { label: '设置', href: '/admin/settings' },
];

const QUICK_LINKS: readonly { label: string; portal: 'www' | 'dealer' | 'my'; localHref: string }[] = [
  { label: '官方首页', portal: 'www', localHref: '/home' },
  { label: '经销商平台', portal: 'dealer', localHref: '/dealer' },
  { label: '车主中心', portal: 'my', localHref: '/my' },
];

function isAreaActive(area: string, label: string): boolean {
  if (area === '客户' && label === '客户/车主') return true;
  return area === label;
}

function menuDestination(screen: Screen, label: string): string | undefined {
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
  if (screen.area === '产品' && /商品发布|商品审核|官网发布|产品发布/.test(label)) return '/admin/product#catalog-publications';
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
  const secondaryNavigation = isLiveProductRoot
    ? [
        { group: '产品工作区', items: ['产品总览', '产品类型', '技术平台', '产品型号'] },
        { group: '型号与工程', items: ['型号配置与 SKU', '新建型号与配置', 'BOM 与零件库'] },
      ]
    : screen.area === '设置'
      ? [...(screen.secondary ?? []), { group: '架构与知识', items: ['系统架构'] }]
      : (screen.secondary ?? []);
  const hasSecondaryNavigation = secondaryNavigation.length > 0;
  const isIntegratedOverview = Boolean(screen.sourceNode && screen.route.split('/').length === 3 && hasIntegratedOperations(screen.area));
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

      <div className={`av-body${hasSecondaryNavigation ? '' : ' av-body--wide'}${isLiveProductRoot ? ' av-body--product' : ''}`}>
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
                    >
                      {item}
                    </a> : <span className="av-railitem" aria-disabled="true" title="该业务入口尚未单独实现">{item}</span>}
                  </span>
                ))}
                <div className="av-railspacer" />
              </div>
            ))}
            {!isLiveProductRoot ? <div className="av-railgroup">
              <div className="av-railtitle">设计页面与流程 · {moduleScreens.length}</div>
              {moduleScreens.map(item => <a className="av-railitem" key={item.route} href={item.route} data-active={item.route === screen.route} aria-current={item.route === screen.route ? 'page' : undefined}>{item.title}</a>)}
            </div> : null}
          </aside>
        ) : null}

        <main className="av-workspace">
          {screen.id !== 'workbench' && screen.sourceNode && !isLiveProductRoot && <p className="av-fixture-note">{isIntegratedOverview || isVehicleDetail ? '真实业务操作已接入已有领域 API；下方保留独立设计示例供对照。' : '界面示例 · 业务数据与审批、库存、发货等服务尚未接入'}</p>}
          {!isLiveProductRoot && <div className="av-pagehead">
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
              <LiveWorkbench />
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
            <>
              <IntegratedOperations area={screen.area} />
              {!isLiveProductRoot && <details className="av-card av-design-archive">
                <summary>查看原 Ardot 页面示例（仅设计预览，不保存）</summary>
                <Blocks blocks={screen.blocks} stacked />
              </details>}
            </>
          ) : (
            <>
              {screen.sourceNode && screen.route.split('/').length === 3
                ? <LiveOperationEntry area={screen.area} />
                : null}
              <Blocks blocks={screen.blocks} stacked={Boolean(screen.sourceNode)} />
            </>
          )}
          {!isLiveProductRoot && moduleScreens.length > 1 && <nav className="av-card av-screen-links" aria-label="相关页面与流程状态"><h2 className="av-cardtitle">相关页面与流程</h2>{moduleScreens.filter(item => item.route !== screen.route).map(item => <a className="av-chip" key={item.route} href={item.route}>{item.title}</a>)}</nav>}
        </main>
      </div>
    </div>
  );
}

export default AdminScreen;
