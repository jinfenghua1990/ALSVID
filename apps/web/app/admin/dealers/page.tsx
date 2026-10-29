import AdminScreen from '../../_design/renderer';
import { screenById } from '../../_design';

export const metadata = { title: '经销商管理 · ALSVID Admin' };

/**
 * Keep the entire dealer workspace in the Admin shell. Application intake and
 * test-ride operations are linked from its normal sidebar/header, not rendered
 * as unrelated banners ahead of the authenticated Admin navigation.
 */
export default function Page() {
  return <AdminScreen screen={screenById('dealers')} />;
}
