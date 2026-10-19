import { requirePortalSession } from '../_lib/portal-access';
import { PortalShell } from '../_components/portal-shell';
import { SupplierOrdersClient } from './supplier-orders-client';
import styles from '../admin/portal-page.module.css';

export default async function SupplierPortalPage(){
 await requirePortalSession('supplier','/supplier');
 return <PortalShell kind="supplier" activeHref="/supplier">
  <header className={styles.heading}><div><p className={styles.eyebrow}>ALSVID / SUPPLIER PORTAL</p>
   <h1>供应商采购单协同</h1>
   <p>仅显示与当前账号明确绑定的供应商组织的正式采购单，不包括其他供应商和草稿单。</p></div></header>
  <SupplierOrdersClient />
  <div className={styles.callout}><strong>业务边界</strong>
   <span>供应商可以确认已发布的完整采购单；交期/数量变更、部分确认、发货通知和附件将在独立审批流程完善后开放。收货、质检、付款仍由 ALSVID Admin 审批。</span>
  </div>
 </PortalShell>;
}
