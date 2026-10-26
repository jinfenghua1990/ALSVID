import AdminScreen from '../../_design/renderer';
import type {Screen} from '../../_design';
import styles from './commerce-lab.module.css';

export const metadata={title:'商城方案对比 · ALSVID Admin',robots:{index:false,follow:false}};
const screen:Screen={id:'commerce-comparison-lab',area:'商城方案对比',route:'/admin/commerce-lab',
  title:'商城方案对比',subtitle:'独立商品管理与产品页面 · 保留原系统进行比较',blocks:[]};
export const dynamic='force-dynamic';
export default function Page(){
  return <AdminScreen screen={screen}>
    <div className={styles.lab} data-commerce-lab-overview>
      <div className={styles.columns}>
        <section className={styles.panel}>
          <h2>已保存商品管理</h2>
          <p>在中文后台保存独立商品，发布后由新版产品页读取。刷新页面后资料仍保留。</p>
          <div className={styles.links}>
            <a href="/admin/commerce-lab/catalog">进入商品管理 →</a>
            <a href="https://www.alsvidbike.com/zh/shop-preview" target="_blank" rel="noopener noreferrer">打开同步产品页（新窗口）</a>
          </div>
        </section>
        <section className={styles.panel}>
          <h2>旧版交互样机</h2>
          <p>保留此前的布局与交互供比较。样机中的商品和演示单仅存在于页面内，刷新即清空。</p>
          <div className={styles.links}><a href="/admin/commerce-lab/reference">查看旧版交互样机 →</a></div>
        </section>
      </div>
    </div>
  </AdminScreen>;
}
