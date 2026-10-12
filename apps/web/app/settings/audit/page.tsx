import { AppShell } from '@alsvid/ui';
import { requireInternalPreviewSession } from '../../_lib/portal-access';
import { PortalSectionPage } from '../../_components/portal-section-page';
import { navigationFor } from '../../app-navigation';

const cards = [
  { eyebrow: '审计', title: '操作记录', description: '后续查看关键业务与管理动作的真实审计事件。' },
  { eyebrow: '身份', title: '访问事件', description: '汇总需要审计的登录、角色变更和权限管理事实。' },
  { eyebrow: '追溯', title: '变更来源', description: '关联操作者、发生时间、业务对象和变更来源，支持后续合规追溯。' },
] as const;

export default async function AuditPage() {
  await requireInternalPreviewSession();
  return <AppShell navigation={navigationFor('/settings/audit')} footer="ALSVID · 系统设置"><PortalSectionPage eyebrow="SYSTEM / AUDIT" title="审计日志" description="审计页面只呈现真实记录。没有后端审计事件时保持为空，不用示例日志制造已发生操作。" cards={cards} notice="审计事件存储与查询接口接入前，本页面仅作为正式管理入口。" /></AppShell>;
}
