import type { AppNavItem } from '@alsvid/ui';

export const appNavigation: readonly AppNavItem[] = [
  { label: '工作台', href: '/admin', area: '工作台', section: '运营概览' },
  { label: '今日概览', href: '/admin#overview', area: '工作台', section: '运营概览' },
  { label: '待办与异常', href: '/admin#attention', area: '工作台', section: '运营概览' },

  { label: '产品', href: '/product', area: '产品', section: '产品中心' },
  { label: '产品列表', href: '/product', area: '产品', section: '产品中心' },
  { label: '产品平台', href: '/product#series', area: '产品', section: '产品中心' },
  { label: '商品审核发布', href: '/product#catalog-publications', area: '产品', section: '产品中心' },
  { label: '型号 / 配置 / SKU', href: '/product#models', area: '产品', section: '产品中心' },
  { label: 'BOM 与零件库', href: '/product#engineering', area: '产品', section: '工程资料' },
  { label: '工程文件与版本', href: '/product/documents', area: '产品', section: '工程资料', status: '骨架' },
  { label: '产品生命周期', href: '/product#lifecycle', area: '产品', section: '工程资料', status: '骨架' },

  { label: '订单', href: '/commerce', area: '订单', section: '订单中心' },
  { label: '订单总览', href: '/commerce', area: '订单', section: '订单中心' },
  { label: 'B2C 商城订单', href: '/commerce#b2c', area: '订单', section: '订单中心', status: '骨架' },
  { label: 'B2B 经销商订单', href: '/commerce#b2b', area: '订单', section: '订单中心', status: '骨架' },
  { label: '售后 / 配件订单', href: '/commerce#parts', area: '订单', section: '订单中心', status: '骨架' },
  { label: '物流与交付', href: '/logistics', area: '订单', section: '履约' },

  { label: '生产', href: '/production', area: '生产', section: '生产中心' },
  { label: '生产计划', href: '/production', area: '生产', section: '生产中心' },
  { label: '生产任务 / 工单', href: '/production#work-orders', area: '生产', section: '生产中心', status: '骨架' },
  { label: '装配与质检', href: '/production#quality', area: '生产', section: '生产中心', status: '骨架' },
  { label: 'VIN / 出厂追溯', href: '/vehicle360/search', area: '生产', section: '车辆出生', status: '骨架' },

  { label: '库存', href: '/inventory', area: '库存', section: '库存中心' },
  { label: '成品库存', href: '/inventory', area: '库存', section: '库存中心' },
  { label: '半成品 / 零件', href: '/inventory#parts', area: '库存', section: '库存中心', status: '骨架' },
  { label: '仓库与调拨', href: '/inventory#warehouses', area: '库存', section: '库存中心', status: '骨架' },
  { label: '库存预警', href: '/inventory#alerts', area: '库存', section: '风险与预警', status: '骨架' },

  { label: '经销商', href: '/dealers', area: '经销商', section: '经销商中心' },
  { label: '经销商档案', href: '/dealers', area: '经销商', section: '经销商中心' },
  { label: '客户试骑申请与试骑网点', href: '/admin/dealers/test-rides', area: '经销商', section: '客户试骑' },
  { label: '区域与授权等级', href: '/partners', area: '经销商', section: '经销商中心', status: '骨架' },
  { label: '采购与销售记录', href: '/dealers#activity', area: '经销商', section: '经营关系', status: '骨架' },

  { label: '客户', href: '/customers', area: '客户', section: '客户中心' },
  { label: '客户档案', href: '/customers', area: '客户', section: '客户中心', status: '骨架' },
  { label: '车辆绑定', href: '/vehicle360/ownership', area: '客户', section: '客户中心', status: '骨架' },
  { label: '购买与服务记录', href: '/customers#history', area: '客户', section: '客户中心', status: '骨架' },

  { label: '售后', href: '/after-sales', area: '售后', section: '售后中心' },
  { label: 'VIN 查询', href: '/vehicle360/search', area: '售后', section: '售后中心', status: '骨架' },
  { label: '保修申请', href: '/after-sales', area: '售后', section: '售后中心', status: '骨架' },
  { label: '维修工单', href: '/after-sales/repairs', area: '售后', section: '售后中心', status: '骨架' },
  { label: '配件申请与服务记录', href: '/after-sales/repairs#parts', area: '售后', section: '售后中心', status: '骨架' },

  { label: '供应链', href: '/supply', area: '供应链', section: '供应链中心' },
  { label: '供应商档案', href: '/supply', area: '供应链', section: '供应链中心', status: '骨架' },
  { label: '采购与采购订单', href: '/supply#purchasing', area: '供应链', section: '采购协同', status: '骨架' },
  { label: '来料检测 / 供应商评价', href: '/supply#quality', area: '供应链', section: '质量与成本', status: '骨架' },
  { label: '成本分析', href: '/supply#cost', area: '供应链', section: '质量与成本', status: '骨架' },

  { label: '数据', href: '/overview', area: '数据', section: '数据分析' },
  { label: '数据总览', href: '/overview', area: '数据', section: '数据分析' },
  { label: '销售分析', href: '/overview#sales', area: '数据', section: '数据分析', status: '骨架' },
  { label: '生产与库存分析', href: '/overview#operations', area: '数据', section: '数据分析', status: '骨架' },
  { label: '售后与经销商分析', href: '/overview#service', area: '数据', section: '数据分析', status: '骨架' },

  { label: '设置', href: '/settings/environment', area: '设置', section: '系统设置' },
  { label: '员工管理', href: '/people/employees', area: '设置', section: '人员与权限' },
  { label: '用户与访问权限', href: '/settings/access', area: '设置', section: '人员与权限', status: '骨架' },
  { label: '角色与权限', href: '/settings/roles', area: '设置', section: '人员与权限', status: '骨架' },
  { label: '安全与登录', href: '/settings/security', area: '设置', section: '安全与审计', status: '骨架' },
  { label: '审计日志', href: '/settings/audit', area: '设置', section: '安全与审计', status: '骨架' },
  { label: '通信与邮件', href: '/settings/communications', area: '设置', section: '系统与集成', status: '骨架' },
  { label: '系统集成', href: '/settings/integrations', area: '设置', section: '系统与集成', status: '骨架' },
  { label: '环境与基础设施', href: '/settings/environment', area: '设置', section: '系统与集成' },
] as const;

export function navigationFor(activeHref: string): readonly AppNavItem[] {
  let activeIndex = -1;
  appNavigation.forEach((item, index) => {
    if (!item.disabled && item.href === activeHref) activeIndex = index;
  });
  return appNavigation.map((item, index) => ({ ...item, active: index === activeIndex }));
}
