import { requirePortalSession } from '../../_lib/portal-access';
import { PortalShell } from '../../_components/portal-shell';
import { PortalSectionPage } from '../../_components/portal-section-page';

const cards = [
  { title: '公司资料', description: '展示经销商主体名称、注册信息、税务标识与经销商编号。' },
  { title: '联系人', description: '展示已授权联系人、业务邮箱与联系方式。' },
  { title: '收货地址', description: '展示经销商已审核的收货、账单与服务地址。' },
] as const;

export default async function DealerCompanyPage() {
  await requirePortalSession('dealer', '/dealer/company');
  return (
    <PortalShell kind="dealer" activeHref="/dealer/company">
      <PortalSectionPage
        eyebrow="DEALER PORTAL / COMPANY"
        title="我的公司"
        description="经销商只能查看与自己组织关系绑定的公司资料。当前页面先完成信息架构，真实经销商身份与数据权限接入后再显示业务记录。"
        cards={cards}
        notice="当前为内部预览骨架，不会展示模拟公司资料。"
      />
    </PortalShell>
  );
}
