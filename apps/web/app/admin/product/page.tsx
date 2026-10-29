import AdminScreen from '../../_design/renderer';
import { screenById } from '../../_design';

export const metadata = { title: "产品中心 · ALSVID" };

export default function Page() {
  return <AdminScreen screen={screenById('product')} />;
}
