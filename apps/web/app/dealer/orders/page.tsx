import { requirePortalSession } from '../../_lib/portal-access';
import { PortalShell } from '../../_components/portal-shell';
import { PortalSectionPage } from '../../_components/portal-section-page';

const cards = [
  { title: '全部 B2B 订单', description: '展示当前经销商可见的 B2B 订单、订单号、金额、时间与处理状态。' },
  { title: '采购订单', description: '查看由经销商采购流程形成的订单，并进入对应订单详情。' },
  { title: '订单单据', description: '集中查看与当前经销商业务相关、允许其访问的订单与商业单据。' },
] as const;

export default async function DealerOrdersPage() {
  await requirePortalSession('dealer', '/dealer/orders');
  return (
    <PortalShell kind="dealer" activeHref="/dealer/orders">
      <PortalSectionPage
        eyebrow="DEALER PORTAL / B2B ORDERS"
        title="B2B 订单"
        description="这里是经销商自己的 B2B 订单中心，只展示当前经销商有权查看的订单事实；订单状态、物流与车辆交付继续引用同一订单关系。"
        cards={cards}
        notice="门户不复制第二套订单主数据。真实订单记录接入前保持空状态。"
      />
    </PortalShell>
  );
}
