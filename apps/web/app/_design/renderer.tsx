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
import { LiveWorkbenchTodos } from './live-workbench-todos';
import { AdminThemePicker } from './admin-theme-picker';

const AREAS = ADMIN_MODULES;
const PRIMARY_AREAS = AREAS.filter(area => ['工作台', '产品研发', '订单管理', '电商', '生产制造', '仓储物流', '售后服务'].includes(area.label));
const MORE_AREAS = AREAS.filter(area => !PRIMARY_AREAS.includes(area));

const QUICK_LINKS: readonly { label: string; portal: 'www' | 'dealer' | 'my'; localHref: string }[] = [
  { label: '官方首页', portal: 'www', localHref: '/home' },
  { label: '经销商平台', portal: 'dealer', localHref: '/dealer' },
  { label: '车主中心', portal: 'my', localHref: '/my' },
];

function isAreaActive(area: string, label: string): boolean {
  return AREAS.some(item => item.label === label && item.legacyAreas.includes(area));
}

const scopedMenus: Readonly<Record<string, readonly { group: string; items: string[] }[]>> = {
  '商城方案对比': [
    { group: '独立商城', items: ['方案总览与布局比较', '独立商品管理', '旧版交互样机'] },
  ],
  '数据': [
    { group: '数据分析', items: ['数据总览', '销售分析', '生产与库存分析', '售后与经销商分析'] },
    { group: '已接入专题', items: ['FC1 颜色偏好'] },
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
    { group: '整车库存', items: ['成品车辆', '待交付车辆', '经销商库存', '库存详情'] },
    { group: '物料库存', items: ['零件库存', '半成品库存', '原材料库存'] },
    { group: '仓储管理', items: ['仓库管理', '库位管理', '库存调拨'] },
    { group: '库存分析', items: ['库存预警', '周转分析', '呆滞库存'] },
  ],
  '经销商': [
    { group: '经销商档案', items: ['经销商列表', '联系信息', '合作状态'] },
    { group: '渠道管理', items: ['区域授权', '销售区域', '渠道等级', '合作协议'] },
    { group: '采购管理', items: ['B2B订单', '采购历史', '采购预测'] },
    { group: '经销商运营', items: ['经销商库存', '销售数据', '售后能力', '培训认证'] },
  ],
  '生产': [
    { group: '生产计划', items: ['生产计划', '排产管理'] },
    { group: '生产执行', items: ['生产工单', '装配流程', '生产进度'] },
    { group: '质量管理', items: ['来料检验', '装配质检', '出厂检测'] },
    { group: '车辆追溯', items: ['VIN 管理', '出厂记录', '车辆档案'] },
  ],
  '供应链': [
    { group: '供应商体系', items: ['供应商列表', '供应商档案', '认证管理', '合作状态'] },
    { group: '采购管理', items: ['采购申请', '采购订单', '到货管理', '入库记录'] },
    { group: '零件供应', items: ['零件目录', '供应关系', '交付计划', '缺料预警'] },
    { group: '供应商分析', items: ['质量分析', '交付分析', '成本分析', '综合评分'] },
  ],
  '客户': [
    { group: '客户档案', items: ['客户列表', '联系信息', '账户状态'] },
    { group: '车辆资产', items: ['VIN绑定', '我的车辆', '车辆状态', '车辆历史'] },
    { group: '购买记录', items: ['订单记录', '交付记录', '经销商来源'] },
    { group: '服务生命周期', items: ['保修状态', '维修记录', '保养记录', '配件记录'] },
  ],
  '售后': [
    { group: '车辆查询', items: ['VIN查询', '车辆档案', '出厂记录'] },
    { group: '保修管理', items: ['保修申请', '保修审核', '保修状态'] },
    { group: '维修管理', items: ['维修工单', '维修进度', '完成记录'] },
    { group: '配件服务', items: ['配件申请', '配件库存', '配件更换记录'] },
    { group: '服务分析', items: ['售后数据', '故障分析', '服务质量'] },
  ],
  '订单': [
    { group: '销售订单', items: ['全部订单', 'B2C消费者订单', 'B2B经销商订单', '配件订单'] },
    { group: '生产关联', items: ['待排产订单', '生产中订单', '待交付订单'] },
    { group: '履约管理', items: ['发货管理', '物流跟踪', '交付完成'] },
    { group: '售后订单', items: ['维修订单', '保养订单', '配件补发'] },
  ],
  '设置': [
    { group: '人员与权限', items: ['员工管理', '用户与访问权限', '角色与权限'] },
    { group: '安全与审计', items: ['安全与登录', '审计日志'] },
    { group: '系统与集成', items: ['通信与邮件', '系统集成', '环境与基础设施'] },
    { group: '架构与知识', items: ['系统架构'] },
  ],
};

function menuDestination(screen: Screen, label: string): string | undefined {
  if (screen.area === '商城方案对比') {
    if (label === '方案总览与布局比较') return '/admin/commerce-lab';
    if (label === '独立商品管理') return '/admin/commerce-lab/catalog';
    if (label === '旧版交互样机') return '/admin/commerce-lab/reference';
    return undefined;
  }
  if (screen.area === '经销商' && ['联系信息', '合作状态'].includes(label)) return '/admin/dealers';
  if (screen.area === '供应链' && label === '合作状态') return '/admin/supply';
  if (screen.area === '客户' && label === '联系信息') return '/admin/customers';
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
    '数据总览': '/admin/analytics', '销售分析': '/admin/analytics/sales', '生产分析': '/admin/analytics/production',
    '生产与库存分析': '/admin/analytics/production', '售后与经销商分析': '/admin/analytics/service',
    '质量分析': '/admin/supply/score', '交付分析': '/admin/supply/score', '成本分析': '/admin/supply/score',
    '应收 / 应付与资金': '/admin/finance',
    '到岸成本与汇率': '/admin/finance',
    '库存台账': '/admin/inventory',
    '库存详情': '/admin/inventory/detail', '库存预警': '/admin/inventory/warnings', '经销商库存': '/admin/inventory/dealer-stock',
    '成品车辆': '/admin/inventory', '待交付车辆': '/admin/inventory', '零件库存': '/admin/inventory',
    '半成品库存': '/admin/inventory', '原材料库存': '/admin/inventory', '仓库管理': '/admin/inventory',
    '库位管理': '/admin/inventory', '库存调拨': '/admin/inventory/transfers/new', '周转分析': '/admin/inventory', '呆滞库存': '/admin/inventory',
    '出口物流与清关': '/admin/logistics',
    '经销商档案': '/admin/dealers',
    '渠道与区域授权': '/admin/dealers/regions', 'B2B采购申请': '/admin/dealers/purchase/request', 'B2B采购审核': '/admin/dealers/purchase/approval',
    'B2B采购审核与履约': '/admin/dealers/purchase/fulfillment', 'B2B收货与入库结果': '/admin/dealers/purchase/received',
    '区域授权': '/admin/dealers/regions', '销售区域': '/admin/dealers/regions', '渠道等级': '/admin/dealers/regions', '合作协议': '/admin/dealers/regions',
    '经销商列表': '/admin/dealers', 'B2B订单': '/admin/dealers/purchase/fulfillment', '采购历史': '/admin/dealers/purchase/received',
    '采购预测': '/admin/dealers/purchase/request', '销售数据': '/admin/dealers', '售后能力': '/admin/after-sales', '培训认证': '/admin/dealers/regions',
    '试骑申请与网点': '/admin/dealers/test-rides',
    '生产工作台': '/admin/production',
    '生产计划': '/admin/production', '排产管理': '/admin/production', '生产工单': '/admin/production', '装配流程': '/admin/production',
    '生产进度': '/admin/production', '来料检验': '/admin/production', '装配质检': '/admin/production', '出厂检测': '/admin/production', '出厂记录': '/admin/production/vin',
    '新建生产计划 · 选择型号': '/admin/production/new/model', '新建生产计划 · 选择 BOM': '/admin/production/new/bom',
    '新建生产计划 · 排产信息': '/admin/production/new/schedule', 'VIN 管理': '/admin/production/vin', '装配异常登记': '/admin/production/assembly/exception',
    '异常处理与复检': '/admin/production/assembly/recheck', '复检通过继续装配': '/admin/production/assembly/passed',
    'VIN / 车辆档案': '/admin/production/vin-detail',
    'VIN 详情 · ALS00001': '/admin/production/vin-detail',
    '新建调拨申请': '/admin/inventory/transfers/new', '调拨审批': '/admin/inventory/transfers/approval',
    '调拨出库': '/admin/inventory/transfers/outbound', '调拨物流跟踪': '/admin/inventory/transfers/tracking',
    '调拨收货入库': '/admin/inventory/transfers/receiving', '调拨申请已退回': '/admin/inventory/transfers/returned',
    '登记运输异常': '/admin/inventory/transfers/exception', '登记收货差异': '/admin/inventory/transfers/difference',
    '调拨入库完成': '/admin/inventory/transfers/completed',
    '供应商与采购订单': '/admin/supply',
    '供应商列表': '/admin/supply', '供应商档案': '/admin/supply/supplier-detail', '认证管理': '/admin/supply/supplier-detail',
    '采购申请': '/admin/supply/purchase/request', '采购订单': '/admin/supply/purchase/approval',
    '到货管理': '/admin/supply/purchase/inspection', '入库记录': '/admin/supply/purchase/received', '零件目录': '/admin/supply/parts',
    '供应关系': '/admin/supply/parts', '交付计划': '/admin/supply', '缺料预警': '/admin/supply/purchase/request', '综合评分': '/admin/supply/score',
    '供应商详情 · 供应商 A': '/admin/supply/supplier-detail', '供应商综合评分': '/admin/supply/score', '采购申请 · 缺料需求': '/admin/supply/purchase/request',
    '采购审批与下单确认': '/admin/supply/purchase/approval', '到货与质量检验': '/admin/supply/purchase/inspection', '采购入库完成': '/admin/supply/purchase/received', '零件供应关系': '/admin/supply/parts',
    '客户与车主档案': '/admin/customers',
    '客户列表': '/admin/customers', '账户状态': '/admin/customers', 'VIN绑定': '/admin/customers/binding/search',
    '我的车辆': '/admin/customers', '车辆状态': '/admin/customers', '车辆历史': '/admin/customers/history', '订单记录': '/admin/orders',
    '交付记录': '/admin/logistics', '经销商来源': '/admin/dealers', '保修状态': '/admin/after-sales/warranty',
    '维修记录': '/admin/after-sales', '保养记录': '/admin/after-sales', '配件记录': '/admin/after-sales/parts/replacement',
    '客户详情': '/admin/customers/detail', '企业客户': '/admin/customers/enterprise', '车辆资产绑定 · 查询 VIN': '/admin/customers/binding/search',
    '车辆资产绑定 · 确认车辆': '/admin/customers/binding/confirm', '购买与服务履历': '/admin/customers/history',
    '售后工单': '/admin/after-sales',
    'VIN查询': '/admin/production/vin-detail', '车辆档案': '/admin/production/vin-detail', '保修申请': '/admin/after-sales/warranty',
    '保修审核': '/admin/after-sales/warranty', '维修工单': '/admin/after-sales', '维修进度': '/admin/after-sales',
    '完成记录': '/admin/after-sales', '配件申请': '/admin/after-sales/parts/request', '配件库存': '/admin/inventory',
    '配件更换记录': '/admin/after-sales/parts/replacement', '售后数据': '/admin/analytics/service', '故障分析': '/admin/analytics/service', '服务质量': '/admin/analytics/service',
    '保修管理': '/admin/after-sales/warranty', '服务网络与工单分派': '/admin/after-sales/network',
    '配件申请与库存核验': '/admin/after-sales/parts/request', '配件审批与发货': '/admin/after-sales/parts/shipping', '缺货与采购处理': '/admin/after-sales/parts/shortage',
    '旧版订单查询': '/admin/orders',
    '订单详情': '/admin/orders/detail', '选择订单类型': '/admin/orders/new',
    '自建商城 B2C 订单': '/admin/ecommerce/orders', '全部订单': '/admin/orders', 'B2C消费者订单': '/admin/ecommerce/orders',
    'B2B经销商订单': '/admin/dealers/purchase/fulfillment', '配件订单': '/admin/ecommerce/orders',
    '待排产订单': '/admin/production', '生产中订单': '/admin/production', '待交付订单': '/admin/inventory',
    '发货管理': '/admin/logistics', '物流跟踪': '/admin/logistics', '交付完成': '/admin/logistics',
    '维修订单': '/admin/after-sales', '保养订单': '/admin/after-sales', '配件补发': '/admin/after-sales/parts/shipping',
  };
  if (label in operational) return operational[label];
  if (label.includes('（待')) return undefined;
  if (screen.area === '产品') {
    const destinations: Record<string, string> = {
      'FC Platform': '/admin/product#series', 'CT Platform': '/admin/product#series', 'FT Platform': '/admin/product#series', 'GT Platform': '/admin/product#series',
      '产品类型': '/admin/product#product-types', '产品平台': '/admin/product#series', '技术平台': '/admin/product#series', '型号': '/admin/product#model-register', '配置': '/admin/product#models', 'SKU': '/admin/product#models',
      'BOM': '/admin/product#engineering', '零件库': '/admin/product#parts', '工程文件': '/admin/product#engineering', '版本控制': '/admin/product#engineering',
      '开发中': '/admin/product#model-register', '量产': '/admin/product#model-register', '停产': '/admin/product#model-register', '归档': '/admin/product#model-register',
    };
    if (destinations[label]) return destinations[label];
  }
  if (screen.area === '设置' && label === '系统架构') return '/admin/architecture';
  if (screen.area === '设置') {
    const settingsRoutes: Record<string, string> = {
      '员工管理': '/admin/settings/employees', '组织管理': '/admin/settings/organization', '角色与数据权限': '/admin/settings/roles',
      '角色与权限': '/admin/settings/roles', '用户与访问权限': '/admin/settings/roles',
      '登录安全': '/admin/settings/security', '安全与登录': '/admin/settings/security', '审计日志': '/admin/settings/audit',
      '第三方集成': '/admin/settings/integrations', '系统集成': '/admin/settings/integrations',
      '通信与邮件': '/admin/settings/messages', '消息中心': '/admin/settings/messages', 'API管理': '/admin/settings/api',
      '环境与基础设施': '/admin/architecture',
    };
    if (settingsRoutes[label]) return settingsRoutes[label];
  }
  if (screen.area === '产品') {
    const productRoutes: Record<string, string> = {
      '新建型号 · 选择产品平台': '/admin/product/new/platform', '新建型号 · 创建型号': '/admin/product/new/model',
      '新建型号 · 创建配置': '/admin/product/new/configuration', '新建型号 · 生成 SKU': '/admin/product/new/sku',
      '新建型号 · 绑定 BOM': '/admin/product/new/bom', 'FC1 Pro · 型号追踪详情': '/admin/product/trace',
    };
    if (productRoutes[label]) return productRoutes[label];
  }
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

export async function AdminScreen({ screen, theme, children, hidePageHeading = false }: { screen: Screen; theme?: string; children?: React.ReactNode; hidePageHeading?: boolean }) {
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
        { group: '产品主数据', items: ['产品类型', '技术平台', '型号'] },
        { group: '规格与工程', items: ['配置', 'SKU', 'BOM', '零件库'] },
        { group: '商城联动', items: ['官网商品发布与审核', '首页商品绑定'] },
      ]
    : [...(scopedMenus[screen.area] ?? screen.secondary ?? [])];
  const menuRouteFor = (item: string) => menuDestination(screen, item) ?? screens.find(candidate => candidate.area === screen.area && candidate.route.endsWith(`#${item}`))?.route;
  const menuActive = (item: string) => {
    const href=menuRouteFor(item);
    return href===screen.route||(href==='/admin/commerce-lab/catalog'&&screen.route.startsWith(href+'/'));
  };
  const hasSecondaryNavigation = secondaryNavigation.length > 0;
  const isIntegratedOverview = Boolean(screen.sourceNode && hasIntegratedOperations(screen.area) && (
    (screen.route.split('/').length === 3 && screen.area !== '订单') ||
    (screen.area === '订单' && screen.route === '/admin/orders') ||
    (screen.area === '电商' && screen.route.startsWith('/admin/ecommerce/'))
  ));
  const isEcommerceWorkspace = screen.area === '电商' && isIntegratedOverview;
  const isVehicleDetail = screen.route === '/admin/production/vin-detail' || screen.route === '/admin/production/vin';

  return (
    <div className="av av-ambient" data-admin-theme data-theme={theme ?? 'day'}>
      <header className="av-topbar">
        <a className="av-brand" href="/admin">
          ALSVID <span>OPERATIONS</span>
        </a>
        <nav className="av-primarynav" aria-label="一级导航">
          {PRIMARY_AREAS.map((area) => (
            <a className="av-navitem" key={area.label} href={area.href} title={area.description}
              data-active={isAreaActive(screen.area, area.label)}
              aria-current={isAreaActive(screen.area, area.label) ? 'page' : undefined}>
              {area.label}
            </a>
          ))}
          <a className="av-navitem" href="/admin/commerce-lab" title="独立商城方案、商品管理与页面比较"
            data-active={screen.area === '商城方案对比'}
            aria-current={screen.area === '商城方案对比' ? 'page' : undefined}>商城方案对比</a>
          <details className="av-moremenu">
            <summary className="av-navitem" data-active={MORE_AREAS.some(area => isAreaActive(screen.area, area.label))}>更多模块</summary>
            <div className="av-moremenu-panel">
              {MORE_AREAS.map(area => (
                <a className="av-moremenu-link" key={area.label} href={area.href} title={area.description}
                  data-active={isAreaActive(screen.area, area.label)}
                  aria-current={isAreaActive(screen.area, area.label) ? 'page' : undefined}>{area.label}</a>
              ))}
            </div>
          </details>
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
          <AdminThemePicker initialTheme={theme ?? 'day'} />
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
                    {menuRouteFor(item) ? <a
                      className="av-railitem"
                      href={menuRouteFor(item)}
                      data-active={menuActive(item)}
                      aria-current={menuActive(item) ? 'page' : undefined}
                    >
                      {item}
                    </a> : <span className="av-railitem" aria-disabled="true" title="该业务入口尚未单独实现">{item}</span>}
                  </span>
                ))}
                <div className="av-railspacer" />
              </div>
            ))}
            {!isIntegratedOverview && !isLiveProductRoot && moduleScreens.length > 0 ? <div className="av-railgroup">
              <div className="av-railtitle">设计页面 / 流程预览 · {moduleScreens.length}</div>
              {moduleScreens.map(item => <a className="av-railitem" key={item.route} href={item.route} data-active={item.route === screen.route} aria-current={item.route === screen.route ? 'page' : undefined}>{item.title}</a>)}
            </div> : null}
          </aside>
        ) : null}

        <main className="av-workspace">
          {screen.id !== 'workbench' && screen.sourceNode && !isIntegratedOverview && !isLiveProductRoot && !isCustomLiveModule && <p className="av-fixture-note">{screen.area === '数据' ? '分析布局预览 · 除已接入的 FC1 颜色偏好外，经营指标与报表数据源尚未接入。' : '流程布局预览 · 本页内容为设计示例；可保存操作请使用对应模块的真实业务工作台。'}</p>}
          {!hidePageHeading && !isEcommerceWorkspace && !isIntegratedOverview && <div className="av-pagehead">
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
          {children ?? (screen.id === 'workbench' ? (
            <>
              <P0OperationsCenter />
              <LiveWorkbenchTodos />
              <details className="av-card av-design-archive"><summary>其他业务数据概览（原有看板）</summary><LiveWorkbench /></details>
              <AdminModuleDirectory />
              <Blocks blocks={screen.blocks.filter((block) => block.kind !== 'kpis' && block.kind !== 'tasks')} />
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
              {screen.area === '订单' ? (
                <nav className="av-card av-order-channel-links" aria-label="订单业务入口">
                  <h2 className="av-cardtitle">订单业务入口</h2>
                  <p className="av-pagesub">按订单来源进入真实业务工作台；各业务域继续维护自身订单事实。</p>
                  <div className="av-pageactions">
                    <a className="av-btn" href="/admin/ecommerce/orders">自建商城 B2C 订单 →</a>
                    <a className="av-btn" href="/admin/dealers">经销商 B2B 订单 →</a>
                    <a className="av-btn" href="/admin/production">生产与排产 →</a>
                    <a className="av-btn" href="/admin/inventory">库存与交付 →</a>
                  </div>
                </nav>
              ) : null}
              <IntegratedOperations area={screen.area} route={screen.route} />
            </>
          ) : screen.area === '数据' ? (
            <>
              <section className="av-card av-analytics-empty" aria-live="polite">
                <h2 className="av-cardtitle">{screen.title} · 数据源状态</h2>
                <p>此分析页的版式已按 Ardot 保留；对应经营统计接口尚未接入，因此暂不展示设计稿中的演示数值或图表。</p>
                {screen.route === '/admin/analytics' ? <a className="av-btn" href="/admin/analytics/color-interest">查看已接入的 FC1 颜色偏好统计 →</a> : <a className="av-btn" href="/admin/analytics">返回数据总览 →</a>}
              </section>
            </>
          ) : (
            <>
              {screen.sourceNode && screen.route.split('/').length === 3
                ? <LiveOperationEntry area={screen.area} />
                : null}
              <Blocks blocks={screen.blocks} stacked={Boolean(screen.sourceNode)} />
            </>
          ))}
          {!isIntegratedOverview && !isLiveProductRoot && moduleScreens.length > 1 && <nav className="av-card av-screen-links" aria-label="相关页面与流程状态"><h2 className="av-cardtitle">相关页面与流程</h2>{moduleScreens.filter(item => item.route !== screen.route).map(item => <a className="av-chip" key={item.route} href={item.route}>{item.title}</a>)}</nav>}
        </main>
      </div>
    </div>
  );
}

export default AdminScreen;

