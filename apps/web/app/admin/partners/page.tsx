import AdminScreen from '../../_design/renderer';
import type { Screen } from '../../_design';
import PartnersClient from '../../partners/partners-client';

export const metadata = { title: '经销商合作主体 · ALSVID Admin' };

const screen: Screen = {
  id: 'dealer-partner-master',
  area: '经销商',
  route: '/admin/partners',
  title: '合作伙伴主体',
  subtitle: '经销商的公司主体、联系人与法律信息统一保存在 Partner 主档',
  blocks: [],
  actions: [],
};

/** Reuse existing /api/partners and its permission checks; no second database. */
export default function Page() {
  return <AdminScreen screen={screen} hidePageHeading>
    <PartnersClient embedded />
  </AdminScreen>;
}
