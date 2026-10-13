import { requirePortalSession } from '../../_lib/portal-access';
import { OwnerShell } from '../../_components/owner-shell';
import styles from '../owner-portal.module.css';

export default async function MyAccountPage() {
  await requirePortalSession('my', '/my/account');

  return (
    <OwnerShell activeHref="/my/account">
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <p className={styles.eyebrow}>MY ALSVID / ACCOUNT</p>
          <h1>账户设置</h1>
          <p>账户负责身份、联系方式和偏好；车辆所有权仍然由独立的车辆关系决定。</p>
        </header>

        <section className={styles.contentGrid}>
          <div>
            <article className={styles.card}>
              <h2>个人资料</h2>
              <p>后续从当前登录账户读取并允许车主维护必要联系信息。</p>
              <div className={styles.accountRows}>
                <div className={styles.accountRow}><span>姓名</span><strong>等待账户资料接入</strong></div>
                <div className={styles.accountRow}><span>邮箱</span><strong>当前登录身份</strong></div>
                <div className={styles.accountRow}><span>手机号</span><strong>未设置</strong></div>
                <div className={styles.accountRow}><span>地址</span><strong>未设置</strong></div>
              </div>
            </article>

            <article className={styles.card}>
              <h2>通知</h2>
              <p>保修提醒、服务进度和与车辆相关的重要通知将在这里统一管理。</p>
              <div className={styles.accountRows}>
                <div className={styles.accountRow}><span>保修与保养提醒</span><strong>待接入</strong></div>
                <div className={styles.accountRow}><span>售后进度</span><strong>待接入</strong></div>
                <div className={styles.accountRow}><span>配件与产品推荐</span><strong>待接入</strong></div>
              </div>
            </article>
          </div>

          <aside className={styles.card}>
            <h2>隐私与车辆权限</h2>
            <p>修改账户资料不会改变车辆所有权。车辆转让、共享或解绑必须走独立的车辆权限流程。</p>
            <div className={styles.notice} style={{ marginTop: 18 }}>当前仅更新车主中心 UI。账户资料编辑与持久化接口尚未在这里伪造。</div>
          </aside>
        </section>
      </div>
    </OwnerShell>
  );
}
