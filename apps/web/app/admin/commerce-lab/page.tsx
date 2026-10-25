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
export default function Page() {
  return <AdminScreen screen={screen}><CommerceLab /></AdminScreen>;
}
