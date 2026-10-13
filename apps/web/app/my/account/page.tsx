import { requirePortalSession } from '../../_lib/portal-access';
import { PortalShell } from '../../_components/portal-shell';
import { PortalSectionPage } from '../../_components/portal-section-page';

const cards = [
  { title: '账户身份', description: '查看当前 ALSVID 账户的已验证身份信息与登录方式。' },
  { title: '联系偏好', description: '后续用于管理服务通知、车辆提醒与品牌通讯偏好。' },
  { title: '隐私与授权', description: '展示车辆关系、数据访问和已授权服务的可见范围。' },
] as const;

export default async function MyAccountPage() {
  await requirePortalSession('my', '/my/account');
  return (
    <PortalShell kind="my" activeHref="/my/account">
      <PortalSectionPage
        eyebrow="MY ALSVID / ACCOUNT"
        title="账户与偏好"
        description="账户身份与车辆所有权是两个独立关系。账户设置不会绕过车辆交付、激活或审核流程取得车辆数据权限。"
        cards={cards}
        notice="当前仅建立页面与权限边界；真实客户账户设置将在身份体系完成车主接入后开放。"
      />
    </PortalShell>
  );
}
