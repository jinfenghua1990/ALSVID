import { requirePortalSession } from '../../_lib/portal-access';
import { PortalShell } from '../../_components/portal-shell';
import { PortalSectionPage } from '../../_components/portal-section-page';

const cards = [
  { title: '可供货车型', description: '查看当前市场与经销商账户可采购的车型、SKU 与可供货状态。' },
  { title: '预计可供日期', description: '对暂不可供货的产品展示经销商可见的预计补货或开放时间。' },
  { title: '区域供货信息', description: '根据市场、仓库和商业规则展示与当前经销商相关的供货范围。' },
] as const;

export default async function DealerAvailabilityPage() {
  await requirePortalSession('dealer', '/dealer/availability');
  return (
    <PortalShell kind="dealer" activeHref="/dealer/availability">
      <PortalSectionPage
        eyebrow="DEALER PORTAL / AVAILABILITY"
        title="库存 / 可供货信息"
        description="这里给经销商看可供货事实，不开放公司内部仓库调度、库存成本、调拨或生产排程能力。"
        cards={cards}
        notice="Dealer Portal 只读取经销商可见的库存与供货结果；库存主数据和调度仍由 ALSVID Admin 管理。"
      />
    </PortalShell>
  );
}
