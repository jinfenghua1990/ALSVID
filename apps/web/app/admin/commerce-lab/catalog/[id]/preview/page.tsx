import {notFound} from 'next/navigation';
import AdminScreen from '../../../../../_design/renderer';
import type {Screen} from '../../../../../_design';
import {MedusaProductPreview} from '../../../../../_components/shop-preview/medusa-product-preview';
import {readComparisonAdminProduct} from '../../../../../_experiments/commerce-lab/admin-product.server';
import type {Locale} from '../../../../../_lib/i18n';
import styles from './preview.module.css';
export const metadata={title:'商品发布前预览 · ALSVID Admin',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{locale?:string}>}){
  const {id}=await params;
  const snapshot=await readComparisonAdminProduct(id);
  if(snapshot.state==='not-found')notFound();
  const screen:Screen={id:'commerce-product-preview',area:'商城方案对比',route:'/admin/commerce-lab/catalog/'+id+'/preview',
    title:'商品发布前预览',subtitle:'检查保存的名称、说明、参考图片与方案价',blocks:[]};
  if(snapshot.state!=='ready')return <AdminScreen screen={screen}><section className={styles.notice} role="status">
    <p>{snapshot.state==='forbidden'?'当前账号没有独立商品预览权限。':'暂时无法读取商品，请稍后重试。'}</p>
    <a href="/admin/commerce-lab/catalog">返回商品管理</a>
  </section></AdminScreen>;
  const query=await searchParams;
  const locale:Locale=query.locale==='de'?'de':query.locale==='en'?'en':'zh';
  const labels={zh:'中文',de:'德语',en:'英语'};
  const status={DRAFT:'草稿',PUBLISHED:'已发布',ARCHIVED:'已归档'}[snapshot.product.status];
  return <AdminScreen screen={screen}>
    <section data-private-product-preview data-status={snapshot.product.status} className={styles.preview}>
      <div className={styles.toolbar}><span>发布状态：{status} · 版本：{snapshot.product.version}</span>
        <a href="/admin/commerce-lab/catalog">返回商品管理</a></div>
      <p className={styles.notice}>本页仅管理员可见。草稿与已归档商品不会出现在官网；请回商品管理确认后发布。</p>
      <nav className={styles.languages} aria-label="预览语言">{(['zh','de','en'] as const).map(language=>
        <a key={language} href={'?locale='+language} aria-current={language===locale?'page':undefined}>{labels[language]}</a>)}</nav>
      <div className={styles.sample}><MedusaProductPreview product={snapshot.product} locale={locale}/></div>
    </section>
  </AdminScreen>;
}
