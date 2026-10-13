import { requirePortalSession } from '../../_lib/portal-access';
import { PortalShell } from '../../_components/portal-shell';
import { PortalSectionPage } from '../../_components/portal-section-page';

const cards = [
  { title: '产品资料', description: '查看当前经销商可使用的产品手册、规格资料与销售说明。' },
  { title: '技术文件', description: '查看对经销商开放的安装、维护、服务与技术支持资料。' },
  { title: '品牌素材', description: '获取获准使用的图片、视频、品牌规范与经销商营销素材。' },
] as const;

export default async function DealerDocumentsPage() {
  await requirePortalSession('dealer', '/dealer/documents');
  return (
    <PortalShell kind="dealer" activeHref="/dealer/documents">
      <PortalSectionPage
        eyebrow="DEALER PORTAL / DOCUMENTS"
        title="文件资料"
        description="经销商只获取获准对外使用的产品、技术与品牌文件，不暴露 ALSVID 内部运营文档。"
        cards={cards}
        notice="文件权限跟随经销商账户、市场与产品授权；未授权资料不会出现在门户中。"
      />
    </PortalShell>
  );
}
