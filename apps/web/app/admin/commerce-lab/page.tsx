import AdminScreen from '../../_design/renderer';
import type {Screen} from '../../_design';
import {CommerceLab} from './commerce-lab';
export const metadata={title:'商城方案对比 · ALSVID Admin',robots:{index:false,follow:false}};
const screen:Screen={id:'commerce-comparison-lab',area:'商城方案对比',route:'/admin/commerce-lab',
  title:'商城方案对比',subtitle:'独立商品管理与产品页面 · 保留原系统进行比较',blocks:[]};
export const dynamic='force-dynamic';
export default function Page(){
  return <AdminScreen screen={screen}>
    <section style={{padding:24,marginBottom:20,border:'1px solid #dce2e6',borderRadius:12,background:'white'}}>
      <h2>独立商品管理与发布</h2><p>在中文后台保存独立商品，发布后由新版产品页读取。方案资料与原有业务数据分开保存。</p>
      <div style={{display:'flex',gap:24,flexWrap:'wrap'}}><a href="/admin/commerce-lab/catalog">进入商品管理 →</a>
        <a href="https://www.alsvidbike.com/zh/shop-preview" target="_blank" rel="noopener noreferrer">打开同步产品页 ↗</a></div>
      <p>下方保留此前的浏览器交互样机，用于比较界面；样机中的演示单不属于已保存商品或真实订单。</p>
    </section><CommerceLab/>
  </AdminScreen>;
}
