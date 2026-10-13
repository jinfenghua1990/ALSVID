# ALSVID 四大门户与 Shopify 一体化架构 — 2026-10-13 决策基准

> **状态：业务规划已确认；不代表功能已开发或域名已部署。** 本文件是后续 AI / 开发人员的跨会话交接基准。不得把 Shopify Shop 误拆成独立公开站点。代码现状以 CURRENT_STATE.md 和实际代码为准。

## 0. 不能重新讨论的已确认边界
- **四个独立开发工作流/门户**：ALSVID Official、ALSVID Admin、ALSVID Dealer Portal、My ALSVID；可以共用 monorepo、API、设计系统和基础设施，不等于必须部署四套服务器。
- **www.chaibenn.com = 品牌官网 + Shopify 商城的一体化客户体验**；没有第五个 ALSVID Shop 项目，**不以 shop.chaibenn.com 作为独立公开商城入口**。
- Admin 是员工内部运营系统；Dealer 是经销商 B2B 门户；My 是车主会员/车辆生命周期门户。官网的会员、经销商入口可以导航至对应门户，但不复制其后台业务逻辑。
- Portal Launcher 仅用于内部身份/角色切换，不作为公开官网首页，也不在用户访问首页时增加无意义中间跳转。
- 当前网站域名及 Dev 子域名均为**目标命名**，DNS、证书、发布状态必须分别验收，不可假称已上线。
- Shopify 负责 B2C 商城交易、购物车、结账、支付、退款和订单权威事实；ALSVID 负责 Vehicle/VIN、产品工程、客户车辆关系、经销商、生产、保修与售后等长期业务事实。WMS/外部仓储执行不能在 ALSVID 内重新造一套。

## 1. 门户及域名矩阵
| 工作流 | Production 目标 | Development/Test 目标 | 核心受众 |
| --- | --- | --- | --- |
| ALSVID Official / ALSVID 官网 | www.chaibenn.com | www.dev.chaibenn.com | 全球访客、潜在消费者、购车客户 |
| ALSVID Admin / 内部运营中心 | admin.chaibenn.com | admin.dev.chaibenn.com | 员工、管理层 |
| ALSVID Dealer Portal | dealer.chaibenn.com | dealer.dev.chaibenn.com | 授权经销商 |
| My ALSVID | my.chaibenn.com | my.dev.chaibenn.com | 车主、会员 |

“Dev”是环境标识，不是第五个产品。正式和测试环境隔离数据库、R2 资源、凭据、Shopify 测试配置；不能把 Test 数据迁到 Production。测试通过后以同一 Git commit 发布，按现有 CI/PR 流程执行。

## 2. ALSVID Official — 官网与 Shopify 商城一体化
### 公开信息架构
- 首页：品牌主视觉、核心产品、品牌价值、场景化故事、精选型号、行动入口；高品质自行车实物图片与品牌一致。
- 产品：FC Folding Carbon、CT City Touring、FT Fat Tire、GT Grand Touring 四大技术平台；型号 FC1/CT1/FT1/GT1；Standard/PRO/Limited 等版本、规格、颜色、配件及对比。
- 产品详情：车型主图、不同角度/可选 3D 预览、关键卖点、详细参数、尺寸/配置、图集/视频、选配件、购买按钮、售后支持链接。
- 商城：商品列表、筛选、价格与库存展示（以 Shopify 权威数据为准）、购物车、结账、支付、订单通知/查询。交易能力采用 Shopify，官网品牌导航和体验保持一致。
- 支持：说明书、常见问题、保修政策、维修支持、联系售后，进入 My ALSVID 的车辆服务。
- 品牌：关于 ALSVID、品牌故事、联系我们、经销商合作申请；不单设公开“供应商合作系统”，也不强制添加无明确价值的“技术与探索”顶级栏目。
- 顶部/底部：品牌 Logo、产品、支持、关于、经销商合作、账户入口、购物车、地区/语言、法律/隐私/联系方式。具体层级由页面设计验收确定，不得为导航而制造重复页面。

### 视觉与内容标准
- 苹果 / DJI 风格：简洁、克制、高级、充足留白、清晰排版、强产品视觉、响应式移动端。
- 真实车型结构不可擅自改变。产品素材可以改善光影、背景和颜色，但必须保持实物车型、车轮、电机、脚踏、结构和配件真实；选配前篮不能误当标配。
- 支持多语言与国际客户体验；中文设计沟通不意味着仅中文站点。
- 无真实产品/订单数据时展示明确空状态或占位，不伪造价格、库存、订单或评价。

### Shopify 实现边界与迁移策略
- 目标是**统一 www 域名和品牌体验**，不是承诺 Shopify 原生主题与 Next.js 页面能无损一键迁移。
- 可评估 Next.js Headless + Shopify Storefront/Checkout API，也可用 Shopify 原生主题；**技术路线尚待验证，不得把 Headless 写成已实施事实**。
- 优先复用品牌素材、内容、设计 tokens、组件规范、产品信息结构；商品、SKU、价格、库存、支付与结账须按 Shopify API/主题机制逐项对接。
- 商城订单由 Shopify 负责；ALSVID 仅保存车辆绑定、售后、客户服务所需的订单引用与最小事实，遵守 docs/BUSINESS_BOUNDARY.md。
- 会员与 Shopify Customer 身份关联需定义明确授权、映射、隐私与安全机制，不假设账户天然互通。

## 3. ALSVID Admin — 内部运营后台
**一级导航顺序固定（V1.0）**：
1. 工作台：运营概况、待办、销售/订单、生产、库存、售后、风险与预警。
2. 产品：FC/CT/FT/GT 平台、型号/版本、SKU、BOM、零部件、工程资料、3D/爆炸图、产品生命周期。
3. 订单：B2B 经销商订单、外部 B2C 订单引用、销售/配件/售后业务凭证、生产需求；不要复制 Shopify 的完整 OMS。
4. 生产：计划、任务、装配、QC、VIN/车架号、电池/电机编号、出厂与追溯。
5. 库存：成品、半成品、零件、库存状态、仓库、出入库/调拨与预警；仓储执行系统权威边界仍遵守 WMS 决策。
6. 经销商：档案、区域、授权等级、合作关系、采购与销售情况。
7. 客户：客户档案、车辆绑定、购买引用、保修与服务历史。
8. 售后：工单、保修、维修、配件申请、技术知识库、维修爆炸图、服务统计。
9. 供应链：供应商档案、采购、采购订单、来料检验、供应商评价、成本；供应商不设独立公开门户。
10. 数据：销售、产品、生产、库存、经销商、客户、售后、供应链分析。
11. 设置：员工、角色、权限、审计、集成、系统配置与环境状态。

UI：中文优先，**左侧一级导航**，顶部搜索/快捷操作/通知/人员与角色切换，亮暗主题；每个一级栏目都有实质二级工作页，避免多层大卡片套娃；统一字体、克制圆角、现代 SaaS 视觉；未完成的功能明确标注规划中/预留/待配置。以上为目标 IA，现有路由与 UI 是否已全部收敛须以代码核验，不可宣称已完成。

## 4. ALSVID Dealer Portal — 经销商 B2B
- 登录与授权：仅授权经销商访问，经销商组织、成员、角色、地区及价格权限隔离。
- 工作台：采购概况、待处理事项、订单状态、交付/售后提醒。
- 产品采购：经销商可售产品、型号/版本/规格、适用区域、采购价格/报价、下单与订单跟踪。
- 车辆/交付：与 VIN、车辆出厂、发运、到货、交付记录关联；不得替代内部生产与仓库执行。
- 售后协作：经销商服务工单、保修、配件申请、维修资料/爆炸图、与 ALSVID 售后团队沟通。
- 经销商资料：门店、人员、授权状态、联系方式。
- Dealer Portal 是经销商自助业务界面；Admin 的“经销商”模块是内部管理端，二者共享业务 API 但页面和权限分开。
- 尚未确认的价格策略、结算方式和信用条款应标注待决策，不得自行编造。

## 5. My ALSVID — 车主会员与服务
- 账户登录/资料：邮箱身份、个人信息、隐私同意和安全设置；具体认证流程依 Identity 实现核验。
- 我的车辆：按 VIN/车架号登记、绑定、车辆归属验证、车型与配置、购车/交付关联、Vehicle 360 时间线。
- 车主服务：保修状态、售后申请、维修进度、历史记录、服务网点、配件及说明书。
- 车辆识别：前期优先车架号或购车邮箱等轻量绑定；未来预留每车二维码/扫码入口，不要求现阶段物理车身一车一码。
- 与 Shopify 交易账户及经销商交付信息建立受控关联，不假定单凭车架号即可任意认领车辆。
- 移动端优先的轻量 Web/PWA 体验；暂不强制开发原生 APP。

## 6. 共用技术与数据权威
- GitHub monorepo 单一代码权威；现有 Next.js Web、NestJS API、Worker、Domain 分层、共享 UI/contracts，继续沿用，不因“四项目”拆成四套独立数据库。
- 当前目标运行：Cloud Run Production、Neon PostgreSQL、Cloudflare R2；Development/Test 隔离；以实际部署证据为准。
- 业务权威：Product/Engineering、Vehicle/VIN、Customer、Dealer、Warranty/Service 在 ALSVID；B2C 支付/结账/交易在 Shopify；外部仓库执行在 WMS。
- 通过 adapters/API、幂等同步、订单外部 ID 映射和受控刷新对接。默认定时校准与按需刷新；必要时再用 Webhook，避免整库复制。
- 产品 3D、工程爆炸图、说明书、照片/视频等资源存 R2，对象元数据和关联在 PostgreSQL。
- 统一品牌 UI 语言但各门户根据用户角色设计；权限和数据隔离不得因共享组件而混淆。

## 7. AI / 新会话交接规则
1. 开始任务先阅读 README.md、本文件、docs/CURRENT_STATE.md、docs/BUSINESS_BOUNDARY.md、docs/ALSVID-ADMIN-ARCHITECTURE-V1.md 与 AGENTS.md。
2. 不得将 WWW 和 Shop 分成两个项目或两个公开站点；四项目指 Official、Admin、Dealer、My。
3. 不得把 Dev 误当第五个业务门户；不得把 Portal Launcher 放在官网首页。
4. 不得把规划说成已经开发、发布、同步、可登录；每个结论应区分“已确认设计 / 已写代码 / CI 通过 / 已上线验收”。
5. 功能开发遵守 Issue → branch → PR → CI → merge → deploy，除非仓库流程另有正式变更。
6. 发生历史文档冲突时：此文件记录 **2026-10-13 四门户/官网商城整合业务决策**；正式名称与独立项目入口关系以 2026-10-14 更新的 SYSTEM_NAMING.md 和 APP_ENTRY_ARCHITECTURE.md 为准；底层代码与真实上线状态仍以实际仓库和部署证据为准。
7. 未明确决定的事项（Shopify Headless/主题、实际 DNS、账号联登细节、B2B 定价等）保留为待验证，不得臆造。


> 当前域名说明：现阶段使用 `chaibenn.com` 临时承载四大门户；`alsvid.com` 为未来正式品牌域名目标，系统结构不变。

## 8. 独立项目入口确认 — 2026-10-14

四者是独立前端项目，不是同一系统页面；通过统一身份认证及部分业务数据联动，大部分入口关系是跨应用跳转。正式项目名称为 ALSVID Official（ALSVID 官网）、My ALSVID（车主中心；消费者车辆区域可用“我的车库”）、ALSVID Dealer Portal（经销商平台）、ALSVID Admin（内部运营中心）。

Admin 顶部右侧增加 App Switcher 概念，建议按钮 `ALSVID Apps`，入口文案“官网、车主中心、经销商平台”，新标签打开目标项目并保留 Admin 状态。完整规范见 [APP_ENTRY_ARCHITECTURE.md](APP_ENTRY_ARCHITECTURE.md)。此处是文档确认，不代表 UI 或联登已完成。
