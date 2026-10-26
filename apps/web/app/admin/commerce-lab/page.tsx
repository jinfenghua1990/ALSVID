import { getLabCatalog } from '../../_experiments/commerce-lab/catalog.server';
import { LabCatalogPanel } from '../../_experiments/commerce-lab/catalog-panel';
import AdminScreen from '../../_design/renderer';
import type { Screen } from '../../_design';
import { CommerceLab } from './commerce-lab';

export const metadata = {
  title: '商城方案对比 · ALSVID Admin',
  robots: { index: false, follow: false },
};
const screen: Screen = {
  id: 'commerce-comparison-lab', area: '商城方案对比',
  route: '/admin/commerce-lab', title: '商城方案对比',
  subtitle: '独立实验区 · Medusa 风格购买页面 × CRMEB 风格中文运营后台',
  blocks: [],
};
export const dynamic = 'force-dynamic';
export default async function Page() {
  const snapshot = await getLabCatalog('admin');
  return <AdminScreen screen={screen}><LabCatalogPanel snapshot={snapshot} locale="zh" /><CommerceLab /></AdminScreen>;
}
