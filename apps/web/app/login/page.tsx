import { redirect } from 'next/navigation';
import { PortalLoginGate } from '../_components/portal-login';
import { readInternalPreviewSession } from '../_lib/portal-access';
import styles from './login.module.css';

export default async function LoginPage() {
  const session = await readInternalPreviewSession();
  if (session?.roles.includes('system_admin') && !session.passwordSetupRequired) redirect('/admin');

  return (
    <PortalLoginGate
      authenticated={Boolean(session)}
      passwordSetupRequired={Boolean(session?.passwordSetupRequired)}
      redirectTo="/admin"
    >
      <main className={styles.page} aria-hidden="true">
        <section className={styles.panel}>
          <div className={styles.brand}>ALSVID</div>
          <div className={styles.eyebrow}>INTERNAL PLATFORM</div>
          <h1 className={styles.title}>登录中心</h1>
          <p className={styles.lead}>使用公司邮箱验证或账户密码登录。成功后直接进入内部管理中心。</p>
        </section>
      </main>
    </PortalLoginGate>
  );
}
