import { requirePortalSession } from '../../_lib/portal-access';
import { OwnerShell } from '../../_components/owner-shell';
import { getOwnerGarage } from '../_data/garage';
import styles from '../owner-portal.module.css';

export default async function MyAccountPage() {
  await requirePortalSession('my', '/my/account');

  const { ownerName, vehicles } = await getOwnerGarage();

  return (
    <OwnerShell activeHref="/my/account">
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <p className={styles.eyebrow}>MY ALSVID / ACCOUNT</p>
          <h1>我的账户</h1>
          <p>账户身份与车辆所有权相互独立。登录只证明你是你，不自动授予任何车辆的访问权限。</p>
        </header>

        <section className={styles.contentGrid}>
          <article className={styles.card}>
            <h2>账户信息</h2>
            <div className={styles.accountRows}>
              <div className={styles.accountRow}><span>姓名</span><strong>{ownerName}</strong></div>
              <div className={styles.accountRow}><span>登录方式</span><strong>统一身份认证</strong></div>
              <div className={styles.accountRow}><span>已绑定车辆</span><strong>{vehicles.length} 台</strong></div>
              <div className={styles.accountRow}><span>门户</span><strong>My ALSVID</strong></div>
            </div>
            <div className={styles.notice} style={{ marginTop: '20px' }}>
              跨门户共享会话不等于共享权限：客户不能进入 Admin，经销商不能读取其他经销商数据。
            </div>
          </article>

          <aside className={styles.card}>
            <h2>所有权说明</h2>
            <p>车辆进入车库必须通过交付、购买或审核事实核验。知道 VIN 不会自动获得车辆权限。</p>
            <div className={styles.steps}>
              <div className={styles.step}><span className={styles.stepIndex}>A</span><div><strong>已核验</strong><p>{vehicles.length} 台车辆已完成所有权核验。</p></div></div>
            </div>
          </aside>
        </section>
      </div>
    </OwnerShell>
  );
}
