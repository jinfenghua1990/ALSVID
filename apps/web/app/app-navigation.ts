import type { AppNavItem } from '@alsvid/ui';

const configuredNavigation: readonly AppNavItem[] = [
  { label: '商城方案对比', href: '/admin/commerce-lab', area: '商城方案对比', section: '独立商城' },
  { label: '独立商品管理', href: '/admin/commerce-lab/catalog', area: '商城方案对比', section: '独立商城' },
  { label: '旧版交互样机', href: '/admin/commerce-lab/reference', area: '商城方案对比', section: '独立商城' },
  { label: '工作台', href: '/admin', area: '工作台', section: '运营概览' },
  { label: '今日概览', href: '/admin', area: '工作台', section: '运营概览' },
  { label: '待办与异常', href: '/admin', area: '工作台', section: '运营概览' },

  { label: '产品研发', href: '/product', area: '产品研发', section: '产品中心' },
  { label: '产品列表', href: '/product', area: '产品研发', section: '产品中心' },
  { label: '产品平台', href: '/product#series', area: '产品研发', section: '产品中心' },
  { label: '型号 / 配置 / SKU', href: '/product#models', area: '产品研发', section: '产品中心' },
  { label: 'BOM 与零件库', href: '/product#engineering', area: '产品研发', section: '工程资料' },
  { label: '工程文件与版本', href: '/product/documents', area: '产品研发', section: '工程资料', status: '骨架' },
  // No lifecycle workflow exists yet. Keep the plan visible, but never point at an
  // anchor the product workspace does not render.
  { label: '产品生命周期', href: '/product', area: '产品研发', section: '工程资料', status: '骨架' },

  { label: '电商', href: '/admin/ecommerce', area: '电商', section: '商城运营' },
  { label: '商城商品与发布', href: '/admin/ecommerce/publications', area: '电商', section: '商城运营' },
  { label: '首页商品绑定', href: '/admin/ecommerce/homepage', area: '电商', section: '商城运营' },
  { label: '电商库存', href: '/admin/ecommerce/inventory', area: '电商', section: '库存查询' },
  { label: 'DE / AT 售价', href: '/admin/ecommerce/pricing', area: '电商', section: '商城交易' },
  { label: 'B2C 商城订单', href: '/admin/ecommerce/orders', area: '电商', section: '商城交易' },
  { label: '商城促销与支付配置', href: '/admin/ecommerce', area: '电商', section: '后续能力', status: '骨架' },
  { label: '旧版渠道订单查询', href: '/commerce', area: '电商', section: '兼容查询' },
  { label: 'B2B 经销商订单', href: '/admin/dealers', area: '经销商/B2B', section: 'B2B 销售', status: '骨架' },
  { label: '售后 / 配件订单', href: '/after-sales', area: '售后服务', section: '服务订单', status: '骨架' },
  { label: '出口物流与交付', href: '/logistics', area: '仓储物流', section: '履约' },

  { label: '生产制造', href: '/production', area: '生产制造', section: '生产中心' },
  { label: '生产计划', href: '/production', area: '生产制造', section: '生产中心' },
  { label: '生产任务 / 工单', href: '/production#work-orders', area: '生产制造', section: '生产中心' },
  { label: '装配与质检', href: '/production#quality', area: '生产制造', section: '生产中心' },
  { label: 'VIN / 出厂追溯', href: '/vehicle360/search', area: '生产制造', section: '车辆出生', status: '骨架' },

  { label: '仓储物流', href: '/inventory', area: '仓储物流', section: '库存中心' },
  { label: '成品库存', href: '/inventory', area: '仓储物流', section: '库存中心' },
  { label: '半成品 / 零件', href: '/inventory', area: '仓储物流', section: '库存中心', status: '骨架' },
  { label: '仓库与调拨', href: '/inventory#warehouses', area: '仓储物流', section: '库存中心' },
  { label: '库存预警', href: '/inventory', area: '仓储物流', section: '风险与预警', status: '骨架' },

  { label: '经销商/B2B', href: '/dealers', area: '经销商/B2B', section: '经销商中心' },
  { label: '经销商档案', href: '/dealers', area: '经销商/B2B', section: '经销商中心' },
  { label: '客户试骑申请与试骑网点', href: '/admin/dealers/test-rides', area: '经销商/B2B', section: '客户试骑' },
  { label: '区域与授权等级', href: '/partners', area: '经销商/B2B', section: '经销商中心', status: '骨架' },
  { label: '采购与销售记录', href: '/dealers', area: '经销商/B2B', section: '经营关系', status: '骨架' },

  { label: '客户车主', href: '/customers', area: '客户车主', section: '客户中心' },
  { label: '客户档案', href: '/customers', area: '客户车主', section: '客户中心', status: '骨架' },
  { label: '车辆绑定', href: '/vehicle360/ownership', area: '客户车主', section: '客户中心', status: '骨架' },
  { label: '购买与服务记录', href: '/customers', area: '客户车主', section: '客户中心', status: '骨架' },

  // The real after-sales workbench lives at /admin/after-sales: ServiceCaseClient there is
  // wired to /v1/service/cases (list, detail, create, activities, transition). The root-path
  // /after-sales and /after-sales/repairs routes are still PortalSectionPage placeholders, so
  // pointing the sidebar at them showed cards instead of the work orders.
  { label: '售后服务', href: '/admin/after-sales', area: '售后服务', section: '售后中心' },
  { label: 'VIN 查询', href: '/vehicle360/search', area: '售后服务', section: '售后中心', status: '骨架' },
  { label: '保修申请', href: '/admin/after-sales', area: '售后服务', section: '售后中心' },
  { label: '维修工单', href: '/admin/after-sales', area: '售后服务', section: '售后中心' },
  { label: '配件申请与服务记录', href: '/after-sales', area: '售后服务', section: '售后中心', status: '骨架' },

  { label: '供应链采购', href: '/supply', area: '供应链采购', section: '供应链中心' },
  { label: '供应商档案', href: '/supply', area: '供应链采购', section: '供应链中心' },
  { label: '采购与采购订单', href: '/supply#purchasing', area: '供应链采购', section: '采购协同' },
  { label: '来料检测 / 供应商评价', href: '/supply', area: '供应链采购', section: '质量与成本', status: '骨架' },
  { label: '成本分析', href: '/supply', area: '供应链采购', section: '质量与成本', status: '骨架' },

  { label: '财务结算', href: '/admin/finance', area: '财务结算', section: '资金与结算' },
  { label: '应收应付与资金', href: '/admin/finance', area: '财务结算', section: '资金与结算' },
  { label: '到岸成本与汇率', href: '/admin/finance', area: '财务结算', section: '成本与汇率' },

  { label: '数据分析', href: '/overview', area: '数据分析', section: '数据分析' },
  { label: '数据总览', href: '/overview', area: '数据分析', section: '数据分析' },
  { label: '销售分析', href: '/overview', area: '数据分析', section: '数据分析', status: '骨架' },
  { label: '生产与库存分析', href: '/overview', area: '数据分析', section: '数据分析', status: '骨架' },
  { label: '售后与经销商分析', href: '/overview', area: '数据分析', section: '数据分析', status: '骨架' },

  { label: '设置', href: '/settings/environment', area: '设置', section: '系统设置' },
  { label: '员工管理', href: '/people/employees', area: '设置', section: '人员与权限' },
  { label: '用户与访问权限', href: '/settings/access', area: '设置', section: '人员与权限', status: '骨架' },
  { label: '角色与权限', href: '/settings/roles', area: '设置', section: '人员与权限', status: '骨架' },
  { label: '安全与登录', href: '/settings/security', area: '设置', section: '安全与审计', status: '骨架' },
  { label: '审计日志', href: '/settings/audit', area: '设置', section: '安全与审计', status: '骨架' },
  { label: '通信与邮件', href: '/settings/communications', area: '设置', section: '系统与集成', status: '骨架' },
  { label: '系统集成', href: '/settings/integrations', area: '设置', section: '系统与集成' },
  { label: '环境与基础设施', href: '/settings/environment', area: '设置', section: '系统与集成' },
];

/**
 * Never route users into a placeholder as if it were a working feature.
 * Keep the planned entry visible, but disable it until its real workflow is delivered.
 *
 * An href may only carry a `#anchor` when the target workspace actually renders that
 * id; otherwise the click silently lands on the top of the page. Unfinished entries
 * therefore point at the workspace root, never at a section that does not exist.
 * `app-navigation.test.mjs` enforces this invariant.
 */
export const appNavigation: readonly AppNavItem[] = configuredNavigation.map((item) =>
  item.status === '骨架'
    ? { ...item, disabled: true, status: '建设中' }
    : item,
);

export function navigationFor(activeHref: string): readonly AppNavItem[] {
  let activeIndex = -1;
  appNavigation.forEach((item, index) => {
    if (!item.disabled && item.href === activeHref) activeIndex = index;
  });
  return appNavigation.map((item, index) => ({ ...item, active: index === activeIndex }));
}
