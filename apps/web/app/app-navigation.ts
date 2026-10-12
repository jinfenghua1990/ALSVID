import type { AppNavItem } from '@alsvid/ui';

export const appNavigation: readonly AppNavItem[] = [
  { label: '管理首页', href: '/admin', area: '首页', section: '概览' },
  { label: '业务概览', href: '/', area: '首页', section: '概览' },

  { label: '产品总览', href: '/product', area: '产品中心', section: '产品管理' },
  { label: '产品系列', href: '/product#series', area: '产品中心', section: '产品管理' },
  { label: '车型 / Variant / SKU', href: '/product#models', area: '产品中心', section: '产品管理' },
  { label: '配置管理', href: '/product#configuration', area: '产品中心', section: '产品管理' },
  { label: '外观与颜色', href: '#', area: '产品中心', section: '产品资料', status: '规划中', disabled: true },
  { label: '技术资料', href: '#', area: '产品中心', section: '产品资料', status: '规划中', disabled: true },
  { label: '供应商关联', href: '#', area: '产品中心', section: '产品资料', status: '预留', disabled: true },
  { label: '图片 / 视频素材', href: '#', area: '产品中心', section: '产品资料', status: '规划中', disabled: true },

  { label: '全流程追踪', href: '/production', area: 'Vehicle 360', section: '车辆档案', status: '基础' },
  { label: '车辆档案', href: '#', area: 'Vehicle 360', section: '车辆档案', status: '建设中', disabled: true },
  { label: 'VIN / 车架号查询', href: '#', area: 'Vehicle 360', section: '车辆档案', status: '建设中', disabled: true },
  { label: '交付 / 所有权', href: '#', area: 'Vehicle 360', section: '生命周期', status: '规划中', disabled: true },
  { label: '客户反馈记录', href: '#', area: 'Vehicle 360', section: '生命周期', status: '规划中', disabled: true },

  { label: '外部订单事实', href: '/commerce', area: '订单管理', section: '订单与履约' },
  { label: '采购 / 供应', href: '/supply', area: '订单管理', section: '订单与履约' },
  { label: '库存 / 仓库', href: '/inventory', area: '订单管理', section: '订单与履约' },
  { label: '物流', href: '/logistics', area: '订单管理', section: '订单与履约' },
  { label: '财务', href: '/finance', area: '订单管理', section: '结算' },

  { label: '经销商总览', href: '/dealers', area: '经销商', section: '经销商管理' },
  { label: '合作伙伴', href: '/partners', area: '经销商', section: '经销商管理' },
  { label: '业务员代下单', href: '#', area: '经销商', section: '经销商业务', status: '预留', disabled: true },

  { label: '售后 / 保修', href: '#', area: '售后服务', section: '售后工作台', status: '规划中', disabled: true },
  { label: '维修 / 配件记录', href: '#', area: '售后服务', section: '售后工作台', status: '规划中', disabled: true },
  { label: 'My ALSVID 支持', href: '#', area: '售后服务', section: '客户支持', status: '规划中', disabled: true },

  { label: 'BOM 结构', href: '/product#engineering', area: '配件 BOM', section: '工程' },
  { label: '零部件主数据', href: '/product#parts', area: '配件 BOM', section: '工程' },
  { label: '配件目录 / 3D', href: '#', area: '配件 BOM', section: '可视化', status: '规划中', disabled: true },

  { label: '客户档案', href: '#', area: '客户中心', section: '客户', status: '规划中', disabled: true },
  { label: 'My ALSVID', href: '#', area: '客户中心', section: '客户', status: '规划中', disabled: true },

  { label: '员工中心', href: '/people/employees', area: '系统设置', section: '人员', status: '骨架' },
  { label: '用户与访问权限', href: '#', area: '系统设置', section: '人员', status: '待完善', disabled: true },
  { label: '角色 / 权限', href: '#', area: '系统设置', section: '人员', status: '待完善', disabled: true },
  { label: '通讯中心', href: '#', area: '系统设置', section: '系统', status: '规划中', disabled: true },
  { label: '集成', href: '#', area: '系统设置', section: '系统', status: '待配置', disabled: true },
  { label: '审计日志', href: '#', area: '系统设置', section: '系统', status: '待完善', disabled: true },
  { label: '环境与基础设施', href: '/settings/environment', area: '系统设置', section: '系统' },
] as const;

export function navigationFor(activeHref: string): readonly AppNavItem[] {
  return appNavigation.map((item) => ({ ...item, active: !item.disabled && item.href === activeHref }));
}
