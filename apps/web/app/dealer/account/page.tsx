import { requirePortalSession } from '../../_lib/portal-access';
import { PortalShell } from '../../_components/portal-shell';
import { PortalSectionPage } from '../../_components/portal-section-page';

const cards = [
  { title: '公司资料', description: '查看和维护经销商公司名称、业务信息与当前账户资料。' },
  { title: '联系人与地址', description: '管理采购、收货、售后等业务使用的联系人与地址。' },
  { title: '成员与权限', description: '查看当前经销商组织中的成员及其门户操作范围。' },
] as const;

export default async function DealerAccountPage() {
  await requirePortalSession('dealer', '/dealer/account');
  return (
    <PortalShell kind="dealer" activeHref="/dealer/account">
      <PortalSectionPage
        eyebrow="DEALER PORTAL / ACCOUNT"
        title="经销商账户"
        description="这里管理经销商自己的公司资料和门户成员，不提供 ALSVID 内部员工、审批或后台管理权限。"
        cards={cards}
        notice="账户资料必须与 ALSVID 后端中的 Dealer / Partner 关系保持一致，避免建立第二份经销商主数据。"
      />
    </PortalShell>
  );
}
