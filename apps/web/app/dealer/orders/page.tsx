import { requirePortalSession } from '../../_lib/portal-access';
import { PortalShell } from '../../_components/portal-shell';
import { PortalSectionPage } from '../../_components/portal-section-page';

const cards = [
  { title: '订单', description: '展示当前经销商可见的 B2B / 外部渠道订单事实与处理状态。' },
  { title: '履约与物流', description: '关联运输单、追踪信息、预计到达时间与实际交付事件。' },
  { title: '单据', description: '集中查看与当前经销商业务相关的可见商业单据。' },
] as const;

export default async function DealerOrdersPage() {
  await requirePortalSession('dealer', '/dealer/orders');
  return (
    <PortalShell kind="dealer" activeHref="/dealer/orders">
      <PortalSectionPage
        eyebrow="DEALER PORTAL / ORDERS"
        title="订单与物流"
        description="这里不会另建第二套商城。订单事实仍来自 ALSVID 已接入的真实渠道，门户只展示经销商有权查看的订单与履约信息。"
        cards={cards}
        notice="B2B 下单接口已预留；真实下单渠道与经销商权限完成接入前保持空状态。"
      />
    </PortalShell>
  );
}
