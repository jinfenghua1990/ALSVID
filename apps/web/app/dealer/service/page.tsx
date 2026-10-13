import { requirePortalSession } from '../../_lib/portal-access';
import { PortalShell } from '../../_components/portal-shell';
import { PortalSectionPage } from '../../_components/portal-section-page';

const cards = [
  { title: '新建售后申请', description: '围绕具体车辆、订单或产品提交售后问题、故障信息与必要证据。' },
  { title: '申请处理中', description: '查看当前经销商已提交售后申请的审核、处理与责任状态。' },
  { title: '已完成记录', description: '查看已完成的售后、保修、维修与关联配件处理结果。' },
] as const;

export default async function DealerServicePage() {
  await requirePortalSession('dealer', '/dealer/service');
  return (
    <PortalShell kind="dealer" activeHref="/dealer/service">
      <PortalSectionPage
        eyebrow="DEALER PORTAL / AFTER SALES"
        title="售后申请"
        description="经销商在这里提交并跟踪自己的售后业务。后台审核、责任判定和内部处理流程仍由 ALSVID Admin 完成。"
        cards={cards}
        notice="售后申请必须关联真实业务事实；未接入真实记录前页面保持空状态。"
      />
    </PortalShell>
  );
}
