/**
 * ALSVID Admin IA: one code-owned top-level module registry.
 * It describes routing and implementation progress, not ERP/Commerce data authority.
 * Keep business boundaries in docs/ALSVID_ADMIN_IA.md in sync.
 */
export type ModuleReadiness = 'core' | 'partial' | 'early';

export type BusinessModule = {
  label: string;
  href: string;
  description: string;
  legacyAreas: readonly string[];
  readiness: ModuleReadiness;
  focus: string;
};

export const ADMIN_MODULES: readonly BusinessModule[] = [
  { label: '商城方案对比', href: '/admin/commerce-lab', description: '独立比较 Medusa 风格购买页面与 CRMEB 风格后台；仅演示数据', legacyAreas: ['商城方案对比'], readiness: 'early', focus: '独立交互样机与接口评估，不连接原有业务数据' },
  { label: '工作台', href: '/admin', description: '跨模块运营概览、待办与异常', legacyAreas: ['工作台'], readiness: 'core', focus: '跨模块待办、业务异常与模块入口' },
  { label: '产品研发', href: '/admin/product', description: '产品类型、型号、SKU、BOM 与工程规格', legacyAreas: ['产品'], readiness: 'partial', focus: '可扩展型号、BOM 版本与商城商品 ID 关联' },
  { label: '订单管理', href: '/admin/orders', description: '跨渠道订单查询与履约导航；订单事实仍由所属业务域维护', legacyAreas: ['订单'], readiness: 'partial', focus: '统一查询与履约视图，不复制 Commerce 或 Dealer 订单事实' },
  { label: '电商', href: '/admin/ecommerce', description: '自建商城商品发布、首页展示、DE/AT 价格与 B2C 订单', legacyAreas: ['电商'], readiness: 'partial', focus: '商城可售判定、结账支付与真实交易闭环' },
  { label: '经销商/B2B', href: '/admin/dealers', description: '经销商档案、授权、报价与 B2B 订单协同', legacyAreas: ['经销商'], readiness: 'partial', focus: '经销商授权、阶梯价格、B2B 下单与交付' },
  { label: '生产制造', href: '/admin/production', description: '工厂生产计划、工单、装配、质检和 VIN 出生', legacyAreas: ['生产'], readiness: 'partial', focus: '工厂生产进度、质检与 VIN 完整追踪' },
  { label: '仓储物流', href: '/admin/inventory', description: '成品/零件库存、仓储操作、出口物流与 WMS 协同', legacyAreas: ['库存', '物流'], readiness: 'partial', focus: '库存接口隔离、WMS 适配与库存预警' },
  { label: '供应链采购', href: '/admin/supply', description: '供应商、采购订单、到货确认与采购成本', legacyAreas: ['供应链'], readiness: 'partial', focus: '采购到货数量上限、对账与供应商绩效' },
  { label: '客户车主', href: '/admin/customers', description: '客户档案、车主身份、车辆归属与服务历史', legacyAreas: ['客户'], readiness: 'partial', focus: '客户 / 车主资料弹窗、VIN 归属认证与档案联动' },
  { label: '售后服务', href: '/admin/after-sales', description: '保修、维修工单、配件申请和服务网点', legacyAreas: ['售后'], readiness: 'partial', focus: '售后工单 SLA、保修证据与配件库存联动' },
  { label: '财务结算', href: '/admin/finance', description: '应收应付、发票、收付款、核对和成本分配', legacyAreas: ['财务'], readiness: 'partial', focus: 'PSP 实际收款、退款凭证、结算与税务处理' },
  { label: '数据分析', href: '/admin/analytics', description: '各经营领域的汇总与分析', legacyAreas: ['数据'], readiness: 'early', focus: '全领域真实经营指标与授权数据钻取' },
  { label: '设置', href: '/admin/settings', description: '身份权限、审计、邮件、集成与系统架构', legacyAreas: ['设置'], readiness: 'partial', focus: '角色权限、通知中心与第三方集成健康状态' },
];

