import Link from 'next/link';
import { requirePortalSession } from '../_lib/portal-access';
import { PortalShell } from '../_components/portal-shell';
import styles from '../admin/portal-page.module.css';

const sections = [
  ['产品目录', '查看面向当前经销商开放的车型、规格与 B2B 产品信息。', '/dealer/catalog'],
  ['采购', '从可采购产品进入询价、采购与补货流程。', '/dealer/purchase'],
  ['B2B 订单', '查看当前经销商提交和可见的 B2B 订单。', '/dealer/orders'],
  ['订单状态', '集中查看订单确认、备货、运输与完成状态。', '/dealer/order-status'],
  ['交付车辆', '查看已分配或已交付给当前经销商的车辆与 VIN。', '/dealer/vehicles'],
  ['库存 / 可供货', '查看 ALSVID 对当前经销商开放的可供货与库存信息。', '/dealer/availability'],
  ['售后申请', '提交并跟踪经销商范围内的售后与保修申请。', '/dealer/service'],
  ['配件申请', '提交维修、售后或经营所需的配件申请。', '/dealer/parts'],
  ['文件资料', '获取产品资料、技术文档、销售素材与经销商文件。', '/dealer/documents'],
  ['经销商账户', '管理经销商公司资料、联系人、地址与成员信息。', '/dealer/account'],
] as const;

export default async function DealerPortalPage() {
  await requirePortalSession('dealer', '/dealer');
  return (
    <PortalShell kind="dealer" activeHref="/dealer">
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>ALSVID / DEALER PORTAL</p>
          <h1>经销商工作台</h1>
          <p>这里是经销商自己操作业务的入口。只展示当前经销商有权查看的产品、采购、订单、车辆、库存、售后与资料。</p>
        </div>
        <span className={styles.badge}>B2B SELF-SERVICE</span>
      </header>

      <div className={styles.callout}>
        <strong>系统边界</strong>
        <span>Dealer Portal 面向经销商自助使用；公司员工管理经销商、生产、库存调度和内部审批仍在 ALSVID Admin。</span>
      </div>

      <section className={styles.section} aria-labelledby="dealer-workspace-title">
        <div className={styles.sectionHeadCompact}>
          <h2 id="dealer-workspace-title">业务入口</h2>
        </div>
        <div className={styles.moduleGrid}>
          {sections.map(([name, detail, href]) => (
            <Link className={styles.moduleCard} href={href} key={name}>
              <span className={styles.moduleStatus}>进入</span>
              <h2>{name}</h2>
              <p>{detail}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className={styles.callout} style={{ marginTop: 13 }}>
        <strong>数据原则</strong>
        <span>没有真实业务记录时保持空状态，不生成示例订单、车辆、库存或售后数据；后续直接接入同一套 ALSVID 后端数据中心。</span>
      </div>
    </PortalShell>
  );
}
