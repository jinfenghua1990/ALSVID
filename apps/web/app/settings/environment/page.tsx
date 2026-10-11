import { AppShell } from '@alsvid/ui';
import { navigationFor } from '../../app-navigation';

function configured(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export default function EnvironmentPage() {
  const environment = process.env.ALSVID_ENV === 'production' ? 'production' : 'test';
  const isProduction = environment === 'production';
  const databaseReady = configured(process.env.DATABASE_URL);
  const storageReady = configured(process.env.OBJECT_STORAGE_BUCKET)
    && configured(process.env.OBJECT_STORAGE_ACCESS_KEY)
    && configured(process.env.OBJECT_STORAGE_SECRET_KEY);
  const releaseSha = process.env.K_REVISION ?? process.env.GITHUB_SHA ?? '未注入';
  const bucket = process.env.OBJECT_STORAGE_BUCKET ?? (isProduction ? 'alsvid-production（预期）' : 'R2 Development（待注入）');

  return (
    <AppShell navigation={navigationFor('/settings/environment')} footer="系统 / 环境与基础设施">
      <header className="pageHeader">
        <div>
          <div className="eyebrow">系统 / 环境与基础设施</div>
          <h1>环境与基础设施</h1>
          <p className="pageIntro">查看运行环境、发布版本与资源配置。此页仅反映 Web 服务可见的配置，不代表 API / Worker 的连接健康状态。</p>
        </div>
        <span className={`statusPill ${isProduction ? 'ready' : 'pending'}`}>{isProduction ? '正式环境' : '测试环境'}</span>
      </header>

      <div className="infoGrid">
        <section className="infoCard">
          <h2>当前环境</h2>
          <p>环境身份来自运行时配置；运行平台为该环境的架构标准。</p>
          <div className="infoRows">
            <div className="infoRow"><span>ALSVID 环境</span><strong>{isProduction ? 'Production / 正式' : 'Development / Test'}</strong><span>{environment}</span></div>
            <div className="infoRow"><span>运行平台</span><strong>{isProduction ? 'Google Cloud Run' : 'M1 + Docker'}</strong><span>架构标准</span></div>
            <div className="infoRow"><span>发布版本</span><strong>{releaseSha}</strong><span>只读</span></div>
          </div>
        </section>

        <section className="infoCard">
          <h2>Web 配置可见性</h2>
          <p>API / Worker 可独立注入密钥。Web 未注入不等于后端未配置；真实连接需通过后端运维验收核实。</p>
          <div className="infoRows">
            <div className="infoRow"><span>密钥权威</span><strong>{isProduction ? 'Google Secret Manager' : 'Development/Test 专用安全注入'}</strong><span>{isProduction ? 'Production' : 'Development/Test only'}</span></div>
            <div className="infoRow"><span>数据库密钥</span><strong>{databaseReady ? '已配置' : 'Web 未注入'}</strong><span className={`statusPill ${databaseReady ? 'ready' : 'pending'}`}>{databaseReady ? '已注入' : '待核实'}</span></div>
            <div className="infoRow"><span>对象存储密钥</span><strong>{storageReady ? '已配置' : 'Web 未注入'}</strong><span className={`statusPill ${storageReady ? 'ready' : 'pending'}`}>{storageReady ? '已注入' : '待核实'}</span></div>
          </div>
        </section>

        <section className="infoCard">
          <h2>数据库 / Neon</h2>
          <p>{isProduction ? '正式业务数据库必须使用 Neon Production 资源。' : 'Development/Test 只能连接隔离的 Neon Development 资源。'}</p>
          <div className="infoRows">
            <div className="infoRow"><span>资源</span><strong>{isProduction ? 'Neon Production' : 'Neon Development'}</strong><span className={`statusPill ${databaseReady ? 'ready' : 'pending'}`}>{databaseReady ? '已配置' : 'Web 未注入'}</span></div>
            <div className="infoRow"><span>连接串</span><strong>敏感值已隐藏</strong><span>不会展示</span></div>
            <div className="infoRow"><span>控制台入口</span><strong>待登记具体项目链接</strong><span>安全元数据</span></div>
          </div>
        </section>

        <section className="infoCard">
          <h2>对象存储 / Cloudflare R2</h2>
          <p>Development/Test 与 Production Bucket 和凭证必须物理隔离，不能共用写权限。</p>
          <div className="infoRows">
            <div className="infoRow"><span>Bucket</span><strong>{bucket}</strong><span className={`statusPill ${storageReady ? 'ready' : 'pending'}`}>{storageReady ? '已配置' : '待核实'}</span></div>
            <div className="infoRow"><span>Access / Secret Key</span><strong>敏感值已隐藏</strong><span>不会展示</span></div>
            <div className="infoRow"><span>控制台入口</span><strong>待登记具体账户链接</strong><span>安全元数据</span></div>
          </div>
        </section>
      </div>

      <div className="mutedBox">Production 运行链路：GitHub Environment → Workload Identity → Cloud Run → Google Secret Manager → Neon Production / R2 Production。Development/Test 则由 M1 + Docker 使用独立凭证连接 Neon Development / R2 Development。</div>
    </AppShell>
  );
}
