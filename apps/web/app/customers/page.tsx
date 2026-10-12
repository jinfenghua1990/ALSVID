import { AppShell } from '@alsvid/ui';
import { requireInternalPreviewSession } from '../_lib/portal-access';
import { PortalSectionPage } from '../_components/portal-section-page';
import { navigationFor } from '../app-navigation';

const cards = [
  { eyebrow: '客户身份', title: '客户档案', description: '统一查看与真实订单、交付或车辆所有权关系绑定的客户资料。' },
  { eyebrow: '车辆关系', title: '名下车辆', description: '只有可信交付、激活或审核关系成立后，车辆才进入客户档案。' },
  { eyebrow: '服务关系', title: '售后与沟通', description: '后续汇总与客户相关的真实服务工单、维修记录和授权通讯。' },
] as const;

export default async function CustomersPage() {
  await requireInternalPreviewSession();
  return <AppShell navigation={navigationFor('/customers')} footer="ALSVID · 客户中心"><PortalSectionPage eyebrow="CUSTOMER CENTER" title="客户档案" description="客户中心围绕真实客户身份、车辆所有权和业务关系建立，不通过车架号或账号注册自动生成所有权。" cards={cards} notice="当前先完成客户中心信息架构；没有真实客户关系时保持空置。" /></AppShell>;
}
