import { requirePortalSession } from '../../_lib/portal-access';
import { PortalShell } from '../../_components/portal-shell';
import { PortalSectionPage } from '../../_components/portal-section-page';

const cards = [
  { title: '待交付车辆', description: '展示已经与当前经销商及订单建立可信关系、尚未完成交付的车辆。' },
  { title: '交付记录', description: '记录车辆交付时间、交付凭据与后续所有权关系建立状态。' },
  { title: '车辆查询', description: '按 ALSVID 车辆身份与车架号查看当前经销商有权限访问的车辆。' },
] as const;

export default async function DealerVehiclesPage() {
  await requirePortalSession('dealer', '/dealer/vehicles');
  return (
    <PortalShell kind="dealer" activeHref="/dealer/vehicles">
      <PortalSectionPage
        eyebrow="DEALER PORTAL / VEHICLES"
        title="车辆交付"
        description="车辆必须先由生产与质检产生可信身份，再通过订单和交付关系进入经销商可见范围。知道车架号本身不会获得车辆权限。"
        cards={cards}
        notice="当前仅完成经销商车辆交付入口，不生成模拟车辆或模拟所有权。"
      />
    </PortalShell>
  );
}
