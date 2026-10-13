import { requirePortalSession } from '../../_lib/portal-access';
import { PortalShell } from '../../_components/portal-shell';
import { PortalSectionPage } from '../../_components/portal-section-page';

const cards = [
  { title: '待确认', description: '查看已提交但仍在等待确认、价格或商业条件处理的订单。' },
  { title: '备货与运输', description: '查看订单备货、出库、运输、预计到达与物流节点。' },
  { title: '已完成', description: '查看已完成交付或已关闭的 B2B 订单及对应交付记录。' },
] as const;

export default async function DealerOrderStatusPage() {
  await requirePortalSession('dealer', '/dealer/order-status');
  return (
    <PortalShell kind="dealer" activeHref="/dealer/order-status">
      <PortalSectionPage
        eyebrow="DEALER PORTAL / ORDER STATUS"
        title="订单状态"
        description="把经销商关心的确认、备货、运输和完成节点集中到一个状态视图中，数据仍来自统一订单与物流事实。"
        cards={cards}
        notice="状态页不允许经销商修改内部生产或仓库状态，只展示其有权查看的业务进度。"
      />
    </PortalShell>
  );
}
