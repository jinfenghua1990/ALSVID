import './design-system.css';
import type { Block, Cell, Screen } from './types';

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

const QUICK_LINKS: readonly { label: string; href: string }[] = [
  { label: '官方首页', href: '/home' },
  { label: '经销商采购', href: '/admin/orders' },
  { label: '我的车库', href: '/my' },
];

function isAreaActive(area: string, label: string): boolean {
  if (area === '客户' && label === '客户/车主') return true;
  return area === label;
}

function CellView({ cell, first }: { cell: Cell; first: boolean }) {
  if (typeof cell === 'string') {
    return <td className={first ? 'av-strong' : undefined}>{cell}</td>;
  }
  return (
    <td>
      <span className="av-tag" data-tone={cell.tone ?? 'neutral'}>
        {cell.text}
      </span>
    </td>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
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
      return (
        <section className="av-card">
          <div className="av-cardhead">
            <div>
              <h2 className="av-cardtitle">{block.title}</h2>
              {block.hint ? <p className="av-cardhint">{block.hint}</p> : null}
            </div>
          </div>
          {block.search || block.filters ? (
            <div className="av-toolbar" style={{ marginBottom: 12 }}>
              {block.search ? (
                <input
                  className="av-search"
                  type="search"
                  placeholder={block.search}
                  aria-label={block.search}
                />
              ) : null}
              {(block.filters ?? []).map((filter, index) => (
                <button className="av-chip" type="button" key={filter} data-active={index === 0}>
                  {filter}
                </button>
              ))}
            </div>
          ) : null}
          <div className="av-tablewrap">
            <table className="av-table">
              <thead>
                <tr>
                  {block.columns.map((column) => (
                    <th key={column} scope="col">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <CellView cell={cell} first={cellIndex === 0} key={cellIndex} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      );

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
          <div className="av-timeline">
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
          </div>
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
          <div className="av-tasks">
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
          </div>
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
          <div className="av-trend">
            {block.bars.map((value, index) => (
              <div className="av-trendcol" key={index}>
                <div className="av-trendbar" style={{ height: `${(value / max) * 100}%` }} />
              </div>
            ))}
          </div>
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

function Blocks({ blocks }: { blocks: readonly Block[] }) {
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

export function AdminScreen({ screen, theme }: { screen: Screen; theme?: string }) {
  const actions = screen.actions ?? [];

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
            {QUICK_LINKS.map((link, index) => (
              <span key={link.label} style={{ display: 'contents' }}>
                {index > 0 ? <i /> : null}
                <a href={link.href}>{link.label}</a>
              </span>
            ))}
          </div>
          <button className="av-iconbtn" type="button" aria-label="搜索">
            ⌕
          </button>
          <button className="av-iconbtn" type="button" aria-label="通知">
            ◔
          </button>
          <button className="av-iconbtn" type="button" aria-label="主题">
            ◐
          </button>
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

      <div className="av-body">
        {screen.secondary && screen.secondary.length > 0 ? (
          <aside className="av-rail" aria-label="二级导航">
            {screen.secondary.map((group) => (
              <div className="av-railgroup" key={group.group}>
                <div className="av-railtitle">{group.group}</div>
                {group.items.map((item, index) => (
                  <span key={item} style={{ display: 'contents' }}>
                    <a
                      className="av-railitem"
                      href={screen.route}
                      data-active={index === 0}
                      aria-current={index === 0 ? 'page' : undefined}
                    >
                      {item}
                    </a>
                  </span>
                ))}
                <div className="av-railspacer" />
              </div>
            ))}
          </aside>
        ) : (
          <div />
        )}

        <main className="av-workspace">
          <div className="av-pagehead">
            <div>
              <p className="av-eyebrow">ALSVID OPERATIONS</p>
              <h1 className="av-pagetitle">{screen.title}</h1>
              <p className="av-pagesub">{screen.subtitle}</p>
            </div>
            {actions.length > 0 ? (
              <div className="av-pageactions">
                {actions.map((action, index) => (
                  <button
                    className="av-btn"
                    type="button"
                    key={action}
                    data-variant={index === actions.length - 1 ? 'primary' : undefined}
                  >
                    {action}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <Blocks blocks={screen.blocks} />
        </main>
      </div>
    </div>
  );
}

export default AdminScreen;
