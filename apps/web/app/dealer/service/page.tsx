import { requirePortalSession } from '../../_lib/portal-access';
import { PortalShell } from '../../_components/portal-shell';
import { PortalSectionPage } from '../../_components/portal-section-page';

const cards = [
  { title: '售后工单', description: '查看当前经销商参与处理的真实售后申请、状态与责任关系。' },
  { title: '保修处理', description: '围绕具体车辆、故障证据和保修规则记录审核与处理结果。' },
  { title: '维修与配件', description: '关联维修记录、替换配件及车辆生命周期历史。' },
] as const;

export default async function DealerServicePage() {
  await requirePortalSession('dealer', '/dealer/service');
  return (
    <PortalShell kind="dealer" activeHref="/dealer/service">
      <PortalSectionPage
        eyebrow="DEALER PORTAL / SERVICE"
        title="售后服务"
        description="售后必须回到具体车辆和可信服务事实，不把经销商门户做成脱离 Vehicle 360 的独立售后数据库。"
        cards={cards}
        notice="售后领域尚未完成正式接入，因此页面保持真实空状态。"
      />
    </PortalShell>
  );
}
