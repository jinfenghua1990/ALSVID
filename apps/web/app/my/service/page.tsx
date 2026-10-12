import { requireInternalPreviewSession } from '../../_lib/portal-access';
import { PortalShell } from '../../_components/portal-shell';
import { PortalSectionPage } from '../../_components/portal-section-page';

const cards = [
  { title: '保修状态', description: '按具体车辆展示真实保修覆盖、起止条件与已确认权益。' },
  { title: '服务申请', description: '提交并追踪与车辆绑定的售后或维修请求。' },
  { title: '维修历史', description: '查看已完成维修、检测结果与实际替换配件记录。' },
] as const;

export default async function MyServicePage() {
  await requireInternalPreviewSession();
  return (
    <PortalShell kind="my" activeHref="/my/service">
      <PortalSectionPage
        eyebrow="MY ALSVID / SERVICE"
        title="保修与服务"
        description="所有服务记录围绕真实车辆展开，并与经销商、服务伙伴和后续 Vehicle 360 生命周期事实关联。"
        cards={cards}
        notice="保修与售后领域尚未正式接入，当前不展示模拟工单或保修状态。"
      />
    </PortalShell>
  );
}
