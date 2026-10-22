import AdminScreen from '../../_design/renderer';
import { screenById } from '../../_design';

export const metadata = { title: '系统架构 · ALSVID Admin' };

/**
 * Read-only system map. The GitHub knowledge base remains authoritative:
 * this view does not store memories, edit architecture or claim live health.
 */
export default function ArchitecturePage() {
  const settings = screenById('settings');
  return (
    <AdminScreen
      screen={{
        ...settings,
        id: 'system-architecture',
        area: '设置',
        route: '/admin/architecture',
        title: 'ALSVID 系统架构',
        subtitle: '门户、业务模块、数据关系与 GitHub 项目记忆入口 · 只读总览',
        sourceNode: undefined,
        actions: [],
        blocks: [],
      }}
    />
  );
}
