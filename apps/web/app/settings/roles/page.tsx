import { AppShell } from '@alsvid/ui';
import { requireInternalPreviewSession } from '../../_lib/portal-access';
import { PortalSectionPage } from '../../_components/portal-section-page';
import { navigationFor } from '../../app-navigation';

const cards = [
  { eyebrow: '角色', title: '角色定义', description: '集中管理 ALSVID 业务角色及其责任边界。' },
  { eyebrow: '权限', title: '权限矩阵', description: '后续按明确授权展示各角色可访问的工作区和允许执行的动作。' },
  { eyebrow: '审查', title: '权限复核', description: '为员工调岗、离职和定期权限审查预留流程入口。' },
] as const;

export default async function RolesPage() {
  await requireInternalPreviewSession();
  return <AppShell navigation={navigationFor('/settings/roles')} footer="ALSVID · 系统设置"><PortalSectionPage eyebrow="SYSTEM / ROLES" title="角色 / 权限" description="权限必须由 ALSVID 明确分配并可审计，不根据邮箱、GitHub 账号或其他第三方身份自动提升。" cards={cards} notice="当前保留正式管理位置，权限编辑能力将在角色模型完成后接入。" /></AppShell>;
}
