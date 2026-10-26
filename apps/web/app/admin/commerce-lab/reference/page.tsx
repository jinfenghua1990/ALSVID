import AdminScreen from '../../../_design/renderer';
import type {Screen} from '../../../_design';
import {CommerceLab} from '../commerce-lab';

export const metadata={title:'旧版交互样机 · ALSVID Admin',robots:{index:false,follow:false}};
const screen:Screen={id:'commerce-lab-reference',area:'商城方案对比',route:'/admin/commerce-lab/reference',
  title:'旧版交互样机',subtitle:'布局与交互比较 · 演示内容刷新即清空',blocks:[]};
export const dynamic='force-dynamic';
export default function Page(){
  return <AdminScreen screen={screen}><CommerceLab/></AdminScreen>;
}
