import { requirePortalSession } from '../../_lib/portal-access';
import { PortalShell } from '../../_components/portal-shell';
import { PortalSectionPage } from '../../_components/portal-section-page';

const cards = [
  { title: '采购清单', description: '从当前经销商可采购的产品中选择车型、SKU、数量和交付需求。' },
  { title: '采购确认', description: '确认经销商公司、收货地址、商业条件与本次采购内容。' },
  { title: '补货采购', description: '针对已有经销商业务快速发起常规补货，并进入统一 B2B 订单流程。' },
] as const;

export default async function DealerPurchasePage() {
  await requirePortalSession('dealer', '/dealer/purchase');
  return (
    <PortalShell kind="dealer" activeHref="/dealer/purchase">
      <PortalSectionPage
        eyebrow="DEALER PORTAL / PURCHASE"
        title="采购"
        description="这里负责经销商发起 B2B 采购。采购确认后进入统一订单数据中心，不在门户内复制第二套订单主数据。"
        cards={cards}
        notice="支付、授信、价格与下单渠道按最终 B2B 商业规则接入；当前页面不生成模拟采购单。"
      />
    </PortalShell>
  );
}
