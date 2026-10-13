import { requirePortalSession } from '../../_lib/portal-access';
import { PortalShell } from '../../_components/portal-shell';
import { PortalSectionPage } from '../../_components/portal-section-page';

const cards = [
  { title: '配件申请', description: '按车型、车辆或售后场景提交原厂配件申请与数量需求。' },
  { title: '申请状态', description: '查看配件申请的确认、备货、发出与完成状态。' },
  { title: '适配信息', description: '基于产品与车辆关系确认配件适配范围，减少错误申请。' },
] as const;

export default async function DealerPartsPage() {
  await requirePortalSession('dealer', '/dealer/parts');
  return (
    <PortalShell kind="dealer" activeHref="/dealer/parts">
      <PortalSectionPage
        eyebrow="DEALER PORTAL / PARTS"
        title="配件申请"
        description="经销商从这里提交配件需求，并与具体车型、车辆或售后记录建立关系；内部 BOM 和供应链信息不对外暴露。"
        cards={cards}
        notice="配件目录与申请数据接入前保持空状态，不生成虚构库存或配件可用量。"
      />
    </PortalShell>
  );
}
