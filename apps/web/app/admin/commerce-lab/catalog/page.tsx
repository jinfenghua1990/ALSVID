import {NativeCatalogFrame} from './native-catalog-frame';
import AdminScreen from '../../../_design/renderer';
import type {Screen} from '../../../_design';
export const metadata={title:'独立商城商品管理 · ALSVID',robots:{index:false,follow:false}};
const screen:Screen={id:'commerce-lab-catalog',area:'商城方案对比',route:'/admin/commerce-lab/catalog',
  title:'独立商城商品管理',subtitle:'独立实验商品 · 保存后刷新仍保留 · 发布后在独立产品页展示',blocks:[]};
export default function Page(){
  return <AdminScreen screen={screen} hidePageHeading><NativeCatalogFrame/></AdminScreen>;
}
