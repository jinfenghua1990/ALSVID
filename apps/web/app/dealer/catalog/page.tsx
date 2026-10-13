import { requirePortalSession } from '../../_lib/portal-access';
import { PortalShell } from '../../_components/portal-shell';
import { PortalSectionPage } from '../../_components/portal-section-page';

const cards = [
  { title: '自行车产品', description: '查看当前经销商可见的 FC、CT、FT、GT 等产品系列与可售车型。' },
  { title: '车型与规格', description: '查看 Variant、SKU、颜色、配置、技术参数与经销商可见的商业信息。' },
  { title: '配件目录', description: '查看面向当前经销商开放的原厂配件、适配关系与申请入口。' },
] as const;

export default async function DealerCatalogPage() {
  await requirePortalSession('dealer', '/dealer/catalog');
  return (
    <PortalShell kind="dealer" activeHref="/dealer/catalog">
      <PortalSectionPage
        eyebrow="DEALER PORTAL / CATALOG"
        title="产品目录"
        description="经销商在这里查看 ALSVID 对其市场和账户开放的产品，不暴露内部 BOM、成本、供应商或生产资料。"
        cards={cards}
        notice="目录只展示经销商可见字段；内部产品主数据仍由 ALSVID Admin 维护。"
      />
    </PortalShell>
  );
}
