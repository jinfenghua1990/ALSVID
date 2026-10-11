import { PortalShell } from '../_components/portal-shell';
import styles from '../admin/portal-page.module.css';

const sections = [
  ['公司资料', '经审核的公司信息、联系人与服务地址', '待开发'],
  ['订单与物流', '外部 Commerce 渠道返回的本经销商订单状态', '待开发'],
  ['车辆与交付', '已授权范围内的车辆分配与交付记录', '待开发'],
  ['售后与保修', '经销商范围内的服务申请、保修与配件信息', '待开发'],
] as const;

export default function DealerPortalPage() {
  return (
    <PortalShell kind="dealer">
      <header className={styles.heading}>
        <div><p className={styles.eyebrow}>ALSVID / DEALER PORTAL</p><h1>经销商工作台</h1><p>为已启用的经销商成员提供公司范围内的订单、车辆与售后信息。</p></div>
        <span className={styles.badge}>Preview · 待接入权限</span>
      </header>
      <div className={styles.callout}><strong>数据范围</strong><span>真实页面必须由服务端校验用户与 Dealer/Partner 成员关系。当前没有连接经销商账户或业务记录。</span></div>
      <section className={styles.moduleGrid} aria-label="经销商门户功能预览" style={{ marginTop: 13 }}>
        {sections.map(([name, detail, status]) => (
          <article className={styles.moduleCard} key={name}>
            <span className={styles.moduleStatus}>{status}</span><h2>{name}</h2><p>{detail}</p>
          </article>
        ))}
      </section>
      <div className={styles.callout} style={{ marginTop: 13 }}><strong>B2B 下单</strong><span>下单和支付仍由 Shopify 或获批外部 B2B 渠道处理；ALSVID 不建立第二套购物车或结账系统。</span></div>
    </PortalShell>
  );
}
