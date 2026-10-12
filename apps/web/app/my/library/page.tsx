import { requireInternalPreviewSession } from '../../_lib/portal-access';
import { PortalShell } from '../../_components/portal-shell';
import { PortalSectionPage } from '../../_components/portal-section-page';

const cards = [
  { title: '说明书', description: '按当前车辆实际车型与配置版本提供匹配的使用和维护资料。' },
  { title: '技术资料', description: '展示对车主公开且与当前车辆版本兼容的技术文档。' },
  { title: '适配配件', description: '只推荐与车辆平台、车型和配置确认兼容的配件。' },
] as const;

export default async function MyLibraryPage() {
  await requireInternalPreviewSession();
  return (
    <PortalShell kind="my" activeHref="/my/library">
      <PortalSectionPage
        eyebrow="MY ALSVID / LIBRARY"
        title="说明书与配件"
        description="资料和配件必须从 ALSVID 产品主数据与车辆实际配置派生，避免向车主展示不匹配的版本。"
        cards={cards}
        notice="产品资料与配件目录接入前保持空状态，不使用示例文档或虚构配件。"
      />
    </PortalShell>
  );
}
