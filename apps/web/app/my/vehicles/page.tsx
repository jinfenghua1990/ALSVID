import { requireInternalPreviewSession } from '../../_lib/portal-access';
import { PortalShell } from '../../_components/portal-shell';
import { PortalSectionPage } from '../../_components/portal-section-page';

const cards = [
  { title: '车辆身份', description: '展示已与当前车主建立可信所有权关系的 ALSVID 车辆、车型与车架号。' },
  { title: '车辆历史', description: '汇总生产、质检、交付、所有权和后续服务生命周期记录。' },
  { title: '资料与配置', description: '按车辆实际 Build Specification 展示适配的配置和资料。' },
] as const;

export default async function MyVehiclesPage() {
  await requireInternalPreviewSession();
  return (
    <PortalShell kind="my" activeHref="/my/vehicles">
      <PortalSectionPage
        eyebrow="MY ALSVID / VEHICLES"
        title="车辆档案"
        description="车辆档案以可信车辆身份和所有权关系为前提。账号注册或输入车架号都不会自动取得车辆访问权限。"
        cards={cards}
        notice="当前为内部预览骨架；车主身份和所有权关系正式接入前不显示模拟车辆。"
      />
    </PortalShell>
  );
}
