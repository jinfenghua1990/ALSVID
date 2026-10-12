import { AppShell } from '@alsvid/ui';
import { requireInternalPreviewSession } from '../../_lib/portal-access';
import { PortalSectionPage } from '../../_components/portal-section-page';
import { navigationFor } from '../../app-navigation';

const cards = [
  { eyebrow: '账户', title: '用户账户', description: '查看已经通过 ALSVID 身份策略创建的内部用户与账户状态。' },
  { eyebrow: '访问', title: '访问范围', description: '后续展示用户被明确授予的系统访问范围，不从第三方账号自动推断权限。' },
  { eyebrow: '安全', title: '停用与会话', description: '预留账号停用、会话撤销和异常访问处置入口。' },
] as const;

export default async function AccessPage() {
  await requireInternalPreviewSession();
  return <AppShell navigation={navigationFor('/settings/access')} footer="ALSVID · 系统设置"><PortalSectionPage eyebrow="SYSTEM / ACCESS" title="用户与访问权限" description="ALSVID 自己维护业务访问授权；邮箱、GitHub 等 Provider 只负责身份或外部账号，不成为权限权威。" cards={cards} notice="当前页面先完成管理入口，真实访问管理动作接入前不展示模拟用户。" /></AppShell>;
}
