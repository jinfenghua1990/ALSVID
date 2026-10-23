import { ADMIN_MODULES } from './business-module-registry';

/** Navigation / progress only. No mock KPIs or implied production readiness. */
export function AdminModuleDirectory() {
  return <section className="av-module-directory" aria-label="ALSVID 业务模块总览">
    <div className="av-module-directory-head">
      <div>
        <p className="av-eyebrow">BUSINESS ARCHITECTURE · ADMIN</p>
        <h2>业务模块总览</h2>
        <p>已建立统一导航与职责边界。模块状态表示现有工作区建设程度，不代表全部业务流程、权限与外部接口已验收。</p>
      </div>
      <a className="av-btn" href="/admin/architecture">查看系统架构</a>
    </div>
    <div className="av-module-directory-grid">
      {ADMIN_MODULES.map(module => <a className="av-module-directory-card" href={module.href} key={module.href}>
        <div className="av-module-directory-card-head">
          <strong>{module.label}</strong>
          <span data-stage={module.readiness}>
            {module.readiness === 'core' ? '已有工作区' : module.readiness === 'partial' ? '部分功能接入' : '建设初期'}
          </span>
        </div>
        <p>{module.description}</p>
        <small>后续重点：{module.focus}</small>
      </a>)}
    </div>
  </section>;
}
