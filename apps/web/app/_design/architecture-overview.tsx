/**
 * An owner-friendly map of ALSVID, not a second knowledge database.
 * Keep links aligned with docs/PROJECT_MEMORY_INDEX.md.
 * Do not label modules live or complete without release + production evidence.
 */
const repository = 'https://github.com/jinfenghua1990/ALSVID';

const portals = [
  { name: 'Official / WWW', role: '品牌展示、产品及配件、自建 B2C 商城入口', doc: 'knowledge/03-Systems/WWW.md', state: '建设中' },
  { name: 'My ALSVID', role: '车主账户、车辆、保修与售后服务', doc: 'knowledge/03-Systems/My-ALSVID.md', state: '建设中' },
  { name: 'Dealer Portal', role: '经销商采购、订单、交付与售后自助', doc: 'knowledge/03-Systems/Dealer-Portal.md', state: '建设中' },
  { name: 'ALSVID Admin', role: '内部运营中枢，管理产品、订单、生产及公司业务', doc: 'knowledge/03-Systems/Admin.md', state: '建设中' },
  { name: 'Supplier Portal', role: '供应商报价、采购协同与履约的后续目标', doc: 'knowledge/03-Systems/Supplier-Portal.md', state: '规划目标' },
] as const;

const domains = [
  { name: '产品', href: '/admin/product', details: '平台 → 型号 → 配置 → SKU → BOM' },
  { name: '订单', href: '/admin/orders', details: 'B2C / B2B 订单、支付状态与履约关联' },
  { name: '生产', href: '/admin/production', details: '生产计划、工单、质检、VIN' },
  { name: '库存', href: '/admin/inventory', details: '库存流水、仓库、第三方仓接口预留' },
  { name: '经销商', href: '/admin/dealers', details: '经销商档案、区域授权与合作管理' },
  { name: '客户', href: '/admin/customers', details: '车主档案、车辆归属和服务记录' },
  { name: '售后', href: '/admin/after-sales', details: '保修、维修工单、配件申请' },
  { name: '供应链', href: '/admin/supply', details: '供应商、采购、质量与成本' },
  { name: '数据', href: '/admin/analytics', details: '运营报表与跨业务分析' },
  { name: '设置', href: '/admin/settings', details: '权限、安全、审计、系统集成' },
] as const;

const memory = [
  { title: '统一记忆索引', path: 'docs/PROJECT_MEMORY_INDEX.md', info: '先从这里找到权威规则和对应文档' },
  { title: '长期业务知识', path: 'knowledge/README.md', info: '品牌、产品、门户、流程和公司知识' },
  { title: '历史决策', path: 'knowledge/00-Company/Decision-Log.md', info: '按日期记录已确认及被取代的决定' },
  { title: '架构决策 ADR', path: 'docs/adr', info: '保留原方案、变更原因和技术边界' },
  { title: '当前实施证据', path: 'docs/CURRENT_STATE.md', info: '只能以已核验记录作为交付依据' },
  { title: 'AI 开发规则', path: 'AGENTS.md', info: '跨 AI 协作、权限、验证与发布要求' },
] as const;

export function ArchitectureOverview() {
  return (
    <>
      <section className="av-card" aria-label="架构阅读说明">
        <h2 className="av-cardtitle">一个框架，两种用途</h2>
        <p className="av-cardhint">
          Admin 只展示整体结构，方便你理解项目；全部长期记忆、原始决策、文档、代码和版本记录仍保存在 GitHub。
          本页为已确认的架构方向，并非线上状态监控、开发完成率或 GitHub 自动同步结果。
        </p>
      </section>

      <section className="av-card" aria-label="平台整体结构">
        <div className="av-cardhead">
          <div>
            <h2 className="av-cardtitle">ALSVID 门户体系</h2>
            <p className="av-cardhint">多个独立前端，共享受权限保护的后端业务能力；不复制订单、库存或客户数据。</p>
          </div>
        </div>
        <div className="av-shortcuts">
          {portals.map((portal) => (
            <a className="av-shortcut" href={repository + '/blob/main/' + portal.doc} key={portal.name} target="_blank" rel="noopener noreferrer">
              <strong>{portal.name} <span className="av-tag">{portal.state}</span></strong>
              <span>{portal.role}</span>
              <span>查看 GitHub 规则</span>
              <i aria-hidden="true"></i>
            </a>
          ))}
        </div>
      </section>

      <section className="av-card" aria-label="模块架构">
        <h2 className="av-cardtitle">Admin 业务模块</h2>
        <p className="av-cardhint">点击模块可进入现有页面；存在界面不代表业务接口或数据已经接通。</p>
        <div className="av-shortcuts">
          {domains.map((module) => (
            <a className="av-shortcut" href={module.href} key={module.name}>
              <strong>{module.name}</strong>
              <span>{module.details}</span>
              <i aria-hidden="true">→</i>
            </a>
          ))}
        </div>
      </section>

      <section className="av-card" aria-label="数据和部署关系">
        <h2 className="av-cardtitle">关键数据与部署关系</h2>
        <div className="av-shortcuts">
          <div className="av-shortcut"><strong>商业流程</strong><span>商品 / SKU → 自有商城订单 → 第三方 PSP 支付 → 库存 / WMS 履约 → 车辆 / 售后</span></div>
          <div className="av-shortcut"><strong>数据边界</strong><span>Neon PostgreSQL 保存结构化业务事实；Cloudflare R2 保存文件对象；WMS 负责仓库执行。</span></div>
          <div className="av-shortcut"><strong>开发与发布</strong><span>GitHub 分支 / PR → Actions 校验 → main → Google Cloud Run 正式环境。此处不显示实时发布状态。</span></div>
        </div>
      </section>

      <section className="av-card" aria-label="GitHub 记忆库">
        <div className="av-cardhead">
          <div>
            <h2 className="av-cardtitle">GitHub 统一记忆库</h2>
            <p className="av-cardhint">这里只提供目录入口，不复制文档，也不另建一套可以与 GitHub 冲突的内容。</p>
          </div>
          <a className="av-more" href={repository} target="_blank" rel="noopener noreferrer">仓库首页 </a>
        </div>
        <div className="av-shortcuts">
          {memory.map(item => (
            <a className="av-shortcut" href={repository + (item.path === 'docs/adr' ? '/tree/main/' : '/blob/main/') + item.path} key={item.path} target="_blank" rel="noopener noreferrer">
              <strong>{item.title}</strong>
              <span>{item.info}</span>
              <i aria-hidden="true"></i>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
