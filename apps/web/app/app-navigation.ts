import type { AppNavItem } from '@alsvid/ui';

export const appNavigation: readonly AppNavItem[] = [
  { label: '概览', href: '/', section: '总览' },

  { label: '产品与工程', href: '/product', section: '产品' },
  { label: '配件目录 / 3D', href: '#', section: '产品', status: '规划中', disabled: true },

  { label: '采购 / 供应', href: '/supply', section: '运营' },
  { label: '生产 / 质检', href: '/production', section: '运营' },
  { label: '库存 / 仓库', href: '/inventory', section: '运营' },
  { label: '物流', href: '/logistics', section: '运营' },

  { label: '经销商', href: '/dealers', section: '商业' },
  { label: '合作伙伴', href: '/partners', section: '商业' },
  { label: '电商渠道', href: '/commerce', section: '商业' },
  { label: '业务员代下单', href: '#', section: '商业', status: '预留', disabled: true },
  { label: '财务', href: '/finance', section: '商业' },

  { label: '车辆中心', href: '/production', section: '车辆与售后', status: '基础' },
  { label: '交付 / 所有权', href: '#', section: '车辆与售后', status: '规划中', disabled: true },
  { label: '售后 / 保修', href: '#', section: '车辆与售后', status: '规划中', disabled: true },
  { label: 'My ALSVID 支持', href: '#', section: '车辆与售后', status: '规划中', disabled: true },

  { label: '员工中心', href: '/people/employees', section: '人员', status: '骨架' },
  { label: '用户与访问权限', href: '#', section: '人员', status: '待完善', disabled: true },
  { label: '角色 / 权限', href: '#', section: '人员', status: '待完善', disabled: true },

  { label: '通讯中心', href: '#', section: '系统', status: '规划中', disabled: true },
  { label: '集成', href: '#', section: '系统', status: '待配置', disabled: true },
  { label: '审计日志', href: '#', section: '系统', status: '待完善', disabled: true },
  { label: '环境与基础设施', href: '/settings/environment', section: '系统' },
  { label: '系统设置', href: '#', section: '系统', status: '待完善', disabled: true },
] as const;

export function navigationFor(activeHref: string): readonly AppNavItem[] {
  return appNavigation.map((item) => ({ ...item, active: !item.disabled && item.href === activeHref }));
}
