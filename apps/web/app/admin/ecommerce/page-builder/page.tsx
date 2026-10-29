import StorefrontBuilderClient from './storefront-builder-client';
import AdminScreen from '../../../_design/renderer';
import type { Screen } from '../../../_design';

export const metadata = { title: '商城首页装修 · ALSVID Admin' };

const screen: Screen = {
  id: 'ecommerce-page-builder',
  area: '电商',
  route: '/admin/ecommerce/page-builder',
  title: '商城装修',
  subtitle: '',
  sourceNode: 'module:ecommerce',
  blocks: [],
};

export default function StorefrontPageBuilderPage() {
  return <AdminScreen screen={screen}><StorefrontBuilderClient /></AdminScreen>;
}
