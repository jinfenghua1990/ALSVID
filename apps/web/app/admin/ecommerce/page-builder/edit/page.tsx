import AdminScreen from '../../../../_design/renderer';
import type { Screen } from '../../../../_design';
import StorefrontBuilderClient from '../storefront-builder-client';

export const metadata = { title: '编辑商城装修 · ALSVID Admin' };

const screen: Screen = {
  id: 'ecommerce-page-builder-edit', area: '电商', route: '/admin/ecommerce/page-builder/edit',
  title: '编辑商城装修', subtitle: '', sourceNode: 'module:ecommerce', blocks: [],
};

export default function StorefrontPageBuilderEditPage() {
  return <AdminScreen screen={screen}><StorefrontBuilderClient /></AdminScreen>;
}
