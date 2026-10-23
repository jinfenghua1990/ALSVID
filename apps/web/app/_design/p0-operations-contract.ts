/**
 * ALSVID Admin P0 operating area.
 *
 * This registry is a presentation map. Product, Commerce, Inventory,
 * Production and Identity/Audit remain the only respective data owners.
 * A working menu, readable API or passing CI is not business acceptance.
 */
export type P0AreaKey = 'product' | 'orders' | 'inventory' | 'production' | 'settings';
export type P0GateState = 'pending' | 'external' | 'verify';
export type P0Gate = { label: string; state: P0GateState; detail: string };
export type P0Area = {
  key: P0AreaKey;
  title: string;
  description: string;
  href: string;
  action: string;
  owner: string;
  sourceKeys: readonly string[];
  existing: readonly string[];
  gates: readonly P0Gate[];
};
export type P0ReadSource = {
  key: string;
  label: string;
  path: string;
  field?: string;
  secondaryField?: string;
  secondaryLabel?: string;
};

export const P0_READ_SOURCES: readonly P0ReadSource[] = [
  { key: 'product', label: '产品主数据', path: '/v1/product/catalog', field: 'models', secondaryField: 'skus', secondaryLabel: 'SKU' },
  { key: 'orders', label: '自建商城订单', path: '/v1/commerce/storefront/summary', field: 'orders', secondaryField: 'prices', secondaryLabel: '价格版本' },
  { key: 'inventory', label: '库存台账', path: '/v1/inventory', field: 'balances', secondaryField: 'reservations', secondaryLabel: '预留记录' },
  { key: 'production', label: '生产制造', path: '/v1/production', field: 'orders', secondaryField: 'units', secondaryLabel: '生产单元' },
  { key: 'staff', label: '内部员工', path: '/v1/auth/users' },
  { key: 'audit', label: '操作审计', path: '/v1/audit?limit=100' },
];

export const P0_AREAS: readonly P0Area[] = [
  {
    key: 'product', title: '产品中心', description: '唯一商品 ID → Variant → SKU → BOM',
    href: '/admin/product', action: '进入产品与工程资料', owner: 'Product / Engineering',
    sourceKeys: ['product'],
    existing: ['型号、Variant、SKU 与工程记录由 Product 管理', '官网发布和首页绑定在电商模块复用产品 ID'],
    gates: [
      { label: '多 SKU 与 BOM 版本追溯', state: 'verify', detail: '验证版本锁定、关联查询和实际保存记录' },
      { label: '发布前商品资料/适配核验', state: 'verify', detail: '校验素材、德英双语、配件适配和审核权限' },
    ],
  },
  {
    key: 'orders', title: '订单中心', description: 'B2C 订单、支付验证、履约与退款',
    href: '/admin/ecommerce/orders', action: '进入 B2C 订单管理', owner: 'Commerce',
    sourceKeys: ['orders'],
    existing: ['自建商城内部订单草稿与价格版本已接入', '历史渠道订单通过只读兼容入口独立查询'],
    gates: [
      { label: '公开结账与支付机构 PSP', state: 'external', detail: '支付服务商及商户资质、回调签名、金额校验、幂等和对账尚需验收' },
      { label: '可售库存 ATP 与预留', state: 'pending', detail: '订单提交前在服务端完成 DE/AT、SKU、仓库履约及并发预留规则' },
      { label: '取消、退款和完整履约', state: 'pending', detail: '必须使用真实财务/库存/物流事件，不能按按钮点击推断成功' },
    ],
  },
  {
    key: 'inventory', title: '库存仓储', description: 'SKU/VIN 分账、收发存、仓库与 WMS',
    href: '/admin/inventory', action: '进入库存与仓库', owner: 'Inventory / Warehouse',
    sourceKeys: ['inventory'],
    existing: ['真实库存余额、流水与预留可通过授权 API 查询', '仓库、库位、盘点和第三方仓配置分开管理'],
    gates: [
      { label: '电商 ATP 不等于台账可用', state: 'pending', detail: 'SKU 与 VIN 不叠加计算；市场可履约、冻结、预留和新鲜度须统一校验' },
      { label: '第三方 WMS 真实连接/对账', state: 'external', detail: '等待首家仓商官方接口、凭证和沙箱；不得把配置记录视作接通' },
    ],
  },
  {
    key: 'production', title: '生产管理', description: '工单 → 物料 → QC → VIN 出生',
    href: '/admin/production', action: '进入生产工单', owner: 'Production / Quality',
    sourceKeys: ['production'],
    existing: ['已有生产工单、工序检查和 VIN 数据领域', '销售订单不能直接改变生产工单或质检状态'],
    gates: [
      { label: '真实工单全链路复核', state: 'verify', detail: '检查 BOM 修订锁定、缺料、装配、质检签核和 VIN 唯一性' },
      { label: '生产与销售履约联动', state: 'pending', detail: '须有订单来源、授权工厂、交期、交付事件与完整审计' },
    ],
  },
  {
    key: 'settings', title: '系统设置', description: '员工/角色、接口、审计与安全',
    href: '/admin/settings', action: '进入身份权限与审计', owner: 'Identity / Platform',
    sourceKeys: ['staff', 'audit'],
    existing: ['员工列表、访问审计及现有会话保护可由授权 API 提供', '业务编辑与权限校验必须由服务端控制'],
    gates: [
      { label: '角色/数据范围授权矩阵', state: 'verify', detail: '按部门、角色、经销商组织和 API 动作测试越权拒绝' },
      { label: '系统集成健康与失败任务处理', state: 'pending', detail: '显示真实运行状态、最后成功时间、失败原因和可审计重试' },
    ],
  },
];

/** Read-only presentation contract; it never authorizes a business write. */
export type P0SourceResult =
  | { state: 'loading' }
  | { state: 'ready'; count: number; secondaryCount?: number; checkedAt: string }
  | { state: 'unauthorized'; reason: 'login' | 'permission' }
  | { state: 'unavailable'; reason: string };

export function parseP0Source(
  source: P0ReadSource, payload: unknown, checkedAt: string,
): P0SourceResult {
  if (!payload || typeof payload !== 'object' || !('data' in payload))
    return { state: 'unavailable', reason: '接口返回格式不正确' };
  const data = (payload as { data: unknown }).data;
  if (!source.field) {
    if (!Array.isArray(data)) return { state: 'unavailable', reason: '返回数据不是记录列表' };
    return { state: 'ready', count: data.length, checkedAt };
  }
  if (!data || typeof data !== 'object') return { state: 'unavailable', reason: '业务数据不存在' };
  const fields = data as Record<string, unknown>;
  const primary = fields[source.field];
  if (!Array.isArray(primary)) return { state: 'unavailable', reason: '业务记录格式不正确' };
  if (source.secondaryField) {
    const secondary = fields[source.secondaryField];
    if (!Array.isArray(secondary)) return { state: 'unavailable', reason: '关联记录格式不正确' };
    return { state: 'ready', count: primary.length, secondaryCount: secondary.length, checkedAt };
  }
  return { state: 'ready', count: primary.length, checkedAt };
}
