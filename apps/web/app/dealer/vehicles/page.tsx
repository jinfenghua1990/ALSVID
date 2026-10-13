import { requirePortalSession } from '../../_lib/portal-access';
import { PortalShell } from '../../_components/portal-shell';
import { PortalSectionPage } from '../../_components/portal-section-page';

const cards = [
  { title: '待交付车辆', description: '查看已经与当前经销商订单建立关系、等待到店或等待交付的车辆。' },
  { title: '已交付车辆', description: '查看已交付给当前经销商的车辆、VIN / 车架号与对应订单关系。' },
  { title: '交付记录', description: '查看车辆到店、交接、最终交付与后续车主绑定相关的业务记录。' },
] as const;

export default async function DealerVehiclesPage() {
  await requirePortalSession('dealer', '/dealer/vehicles');
  return (
    <PortalShell kind="dealer" activeHref="/dealer/vehicles">
      <PortalSectionPage
        eyebrow="DEALER PORTAL / DELIVERED VEHICLES"
        title="交付车辆"
        description="这里从经销商视角查看与其订单和交付关系关联的车辆。车辆身份、VIN 和生命周期事实仍来自 ALSVID 的统一车辆数据。"
        cards={cards}
        notice="知道 VIN 本身不会获得车辆权限；只有与当前经销商建立可信业务关系的车辆才可见。"
      />
    </PortalShell>
  );
}
