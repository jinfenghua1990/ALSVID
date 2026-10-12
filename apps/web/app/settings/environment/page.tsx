import { AppShell } from '@alsvid/ui';
import { navigationFor } from '../../app-navigation';

export const dynamic = 'force-dynamic';

function configured(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export default function EnvironmentPage() {
  const environment = process.env.ALSVID_ENV === 'production' ? 'production' : 'development';
  const isProduction = environment === 'production';
  const databaseReady = configured(process.env.DATABASE_URL);
  const storageReady = configured(process.env.OBJECT_STORAGE_BUCKET)
    && configured(process.env.OBJECT_STORAGE_ACCESS_KEY)
    && configured(process.env.OBJECT_STORAGE_SECRET_KEY);
  const releaseSha = process.env.ALSVID_RELEASE_SHA ?? process.env.K_REVISION ?? process.env.GITHUB_SHA ?? '未注入';
  const bucket = process.env.OBJECT_STORAGE_BUCKET ?? (isProduction ? 'alsvid-production（预期）' : 'R2 Development（待注入）');

  return (
    <AppShell navigation={navigationFor('/settings/environment')} footer="系统 / 环境与基础设施">
      <header className="pageHeader">
        <div>
          <div className="eyebrow">系统 / 环境与基础设施</div>
          <h1>环境与基础设施</h1>
          <p className="pageIntro">查看运行环境、发布版本与资源配置。此页仅反映 Web 服务可见的配置，不代表 API / Worker 的连接健康状态。</p>
        </div>
        <span className={`statusPill ${isProduction ? 'ready' : 'pending'}`}>{isProduction ? '正式环境' : '开发环境'}</span>
      </header>

      <div className="infoGrid">
        <section className="infoCard">
          <h2>当前环境</h2>
          <p>ALSVID 只有 Development 与 Production 两个云端业务环境；本地 M1 仅作为开发辅助，不是第三个云环境。</p>
          <div className="infoRows">
            <div className="infoRow"><span>ALSVID 环境</span><strong>{isProduction ? 'Production / 正式' : 'Development / 开发'}</strong><span>{environment}</span></div>
            <div className="infoRow"><span>Google Cloud 项目</span><strong>{isProduction ? 'alsvid-prod' : 'alsvid-dev'}</strong><span>独立项目</span></div>
            <div className="infoRow"><span>运行平台</span><strong>Google Cloud Run</strong><span>云端运行</span></div>
            <div className="infoRow"><span>发布版本</span><strong>{releaseSha}</strong><span>只读</span></div>
          </div>
        </section>

        <section className="infoCard">
          <h2>Web 配置可见性</h2>
          <p>API / Worker 可独立注入密钥。Web 未注入不等于后端未配置；真实连接需通过后端运维验收核实。</p>
          <div className="infoRows">
            <div className="infoRow"><span>密钥权威</span><strong>Google Secret Manager</strong><span>{isProduction ? 'Production' : 'Development'} only</span></div>
            <div className="infoRow"><span>数据库密钥</span><strong>{databaseReady ? '已配置' : 'Web 未注入'}</strong><span className={`statusPill ${databaseReady ? 'ready' : 'pending'}`}>{databaseReady ? '已注入' : '待核实'}</span></div>
            <div className="infoRow"><span>对象存储密钥</span><strong>{storageReady ? '已配置' : 'Web 未注入'}</strong><span className={`statusPill ${storageReady ? 'ready' : 'pending'}`}>{storageReady ? '已注入' : '待核实'}</span></div>
          </div>
        </section>

        <section className="infoCard">
          <h2>数据库 / Neon</h2>
          <p>{isProduction ? '正式业务数据库必须使用 Neon Production 资源。' : 'Development 只能连接隔离的 Neon Development 资源。'}</p>
          <div className="infoRows">
            <div className="infoRow"><span>资源</span><strong>{isProduction ? 'Neon Production' : 'Neon Development'}</strong><span className={`statusPill ${databaseReady ? 'ready' : 'pending'}`}>{databaseReady ? '已配置' : 'Web 未注入'}</span></div>
            <div className="infoRow"><span>连接串</span><strong>敏感值已隐藏</strong><span>不会展示</span></div>
            <div className="infoRow"><span>控制台入口</span><strong>待登记具体项目链接</strong><span>安全元数据</span></div>
          </div>
        </section>

        <section className="infoCard">
          <h2>对象存储 / Cloudflare R2</h2>
          <p>Development 与 Production Bucket 和凭证必须物理隔离，不能共用写权限。</p>
          <div className="infoRows">
            <div className="infoRow"><span>Bucket</span><strong>{bucket}</strong><span className={`statusPill ${storageReady ? 'ready' : 'pending'}`}>{storageReady ? '已配置' : '待核实'}</span></div>
            <div className="infoRow"><span>Access / Secret Key</span><strong>敏感值已隐藏</strong><span>不会展示</span></div>
            <div className="infoRow"><span>控制台入口</span><strong>待登记具体账户链接</strong><span>安全元数据</span></div>
          </div>
        </section>
      </div>

      <div className="mutedBox">Development：GitHub PR / 分支 → GitHub Environment development → Workload Identity → Google Cloud Run（alsvid-dev）→ Development Secret Manager → Neon Development / R2 Development。Production：main → GitHub Environment production → Google Cloud Run（alsvid-prod）→ Production Secret Manager → Neon Production / R2 Production。</div>
    </AppShell>
  );
}
