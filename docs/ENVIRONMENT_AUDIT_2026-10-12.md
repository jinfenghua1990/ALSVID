# ALSVID 环境命名与双环境审计

审计日期：2026-10-12。关联：Issue #61。

## 后续沟通必须使用的名称

- 开发/测试：`ALSVID Development`
- 正式/生产：`ALSVID Production`

Production、正式、生产指同一个环境；Development、开发、测试指同一个环境。
不要把 Test 描述为第三个业务环境。程序中的 NODE_ENV=test、测试脚本和文件名不代表新增环境。
机器人说明状态、配置、链接和发布结果时，先写上面的中文名称和完整 ALSVID 名称。

## 已核验的线上状态

| 项目 | 开发/测试：ALSVID Development | 正式/生产：ALSVID Production |
| --- | --- | --- |
| Google Cloud 项目 | alsvid-dev | alsvid-prod |
| Web 入口 | https://alsvid-web-wq72cftr3q-ey.a.run.app/ | https://alsvid-web-51910044792.europe-west3.run.app/ |
| 自定义域名 | 无，使用 Cloud Run HTTPS | https://chaibenn.com/ |
| 分支与运行镜像提交 | develop / 4bef591a4bcc51f7499c40559868afe2d0ceaf55 | main / 568d34e6cf03f5d304cca2804c76f3c9273c3dbb |
| Web / API / Worker | Ready | Ready |
| API 直接健康检查 | 200 / status=ok | 200 / status=ok |
| Neon 数据库 | alsvid_dev，真实只读连接成功 | alsvid_prod，真实只读连接成功 |
| 数据库隔离 | 两套连接的主机不同 | 两套连接的主机不同 |
| 迁移 | 19 项，最新 0019_amazon_commerce_provider.sql | 同左 |
| R2 桶 | alsvid-development | alsvid-production |
| R2 权限 | 本环境列举成功；访问另一环境桶被拒绝 403 | 本环境列举成功；访问另一环境桶被拒绝 403 |
| 最新发布 | Actions 38199158657 成功 | Actions 38194777507 成功 |
| 未登录门户访问 | /admin、/dealer、/my 转 /login | 同左 |

本次 R2 核查是只读列举和跨桶权限验证；没有重新执行对象上传、签名下载和删除。
Web、API、Worker 镜像在各自环境内使用相同提交。迁移任务最近一次均成功。
未读取、提交或记录密钥值及连接串。

## 页面差异的原因

部署时间较晚不等于包含较新的页面代码。两个分支已经分叉：
main 有 6 个 develop 未包含的提交，包括首页门户、登录修复、后台和产品中心界面；
develop 有 2 个 main 未包含的提交，包括共享开发发布及 R2 接入。
因此不能把正式/生产描述为单纯落后于开发/测试。

正式/生产首页实际返回 INTERNAL PORTAL / PRODUCTION / 登录中心；
开发/测试仍是较早的首页，并显示 [测试] ALSVID / 测试环境。
PR #78 尚未合并且 GitHub 报告存在合并冲突。
应先将 main 的已有页面和登录修复整合到 develop，保留独立开发资源配置，
在开发/测试完成验收后，再按发布流程将验证过的代码合入 main。
仅提升软件版本，不复制开发数据库和 R2 文件到正式环境。

## 尚未完成或未验证的验收项

- 两套 Web 入口 /api/health 均返回 404；API 自身 /api/health 返回 200。统一入口的健康路由仍有缺口。
- main 与 develop 当前未启用分支保护。成功的 CI 不等于合并前已强制执行检查。
- PR #78 的分支冲突尚未解决，开发/测试尚未整合 main 的新页面。
- 本次未执行登录后的业务流程、文件上传/下载和数据库恢复演练。
- 发布流程支持指定历史提交，但本次没有实际执行正式/生产回退；代码回退不自动撤销数据库迁移。
- USD 1 预算告警本次未能核验：使用 alsvid-dev 查询时 Billing Budget API 未启用，不能据此判断预算存在或不存在。
- 最近一小时正式/生产未检出 ERROR；开发/测试有两条发生于首次失败发布期间的 API ERROR，后续发布和服务已恢复。
- 两套 Worker 均配置一个持续运行实例；预算告警不是支出上限，成本是否符合 USD 1 要单独核算。

结论：两套基础运行资源已经接入并可访问；完整发布、回退和业务验收不能标为全部完成。
