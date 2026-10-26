# 商城源码导入与发布范围（负责人澄清，2026-10-26）

status: active / independent catalog slice deployed; authenticated production write acceptance pending

负责人再次确认：Admin 必须单独增加一级菜单进行布局与比较。商城方案对比直接出现在主导航，独立二级入口为方案总览与布局比较、独立商品管理；不放入“更多模块”或原有电商业务菜单。复用数据库/身份属于技术接入，不改变这一独立布局要求。

负责人要求把 Medusa 前台与 CRMEB 中文后台源码引入自己的 GitHub，然后发布至现有 ALSVID 官方网站和 Admin 的独立菜单，保留原系统用于比较。已有 Neon PostgreSQL、Cloudflare R2、Google Cloud Run；负责人进一步确认重新编写代码复用现有数据库。实现决定见 [PostgreSQL 适配 ADR](adr/2026-10-26-commerce-comparison-postgresql.md)。

## 源码与适配
- external/medusa-dtc：固定版本官方 DTC 源码和许可证；商品预览组件适配在 apps/web 中，沿用 ALSVID 三语词库与现有界面。
- external/crmeb：固定版本 CRMEB 源码和许可证；src/alsvid 商品管理适配版使用导入项目中的 Vue/Element UI 运行资源。
- docs/COMMERCE_SOURCE_LOCK.json：原始导入提交、文件数、摘要与排除项。后续适配代码与原始快照分开记录。
- PHP/MySQL 容器与原生验收保留为隔离参考，不是本次生产商品功能的运行依赖。

## 本次可交付范围
- WWW：/{zh,de,en}/shop-preview 读取已发布实验商品；支持查看与独立预览购物袋，原固定样例移至 /shop-preview/reference。
- Admin：独立“商城方案对比”菜单中的 /admin/commerce-lab/catalog 管理三语名称、说明、参考图、方案价、草稿与发布状态；保存进入现有 Node API。
- 数据：增量迁移 0039 创建 commerce_lab.catalog_products；复用既有身份、权限、审计与数据库事务。原商品、SKU、库存、订单、支付表不改写。
- 商品管理页面适配属于本次范围；没有声称移植 CRMEB 所有模块或运行完整 Medusa 第二套交易引擎。
- 购物袋仅用于比较，不创建真实订单或支付；方案价不等于正式可售价格。图片使用已有 FC1/FC2 参考资源，本次没有新增上传/R2 映射。

## 验收与发布
PostgreSQL 18 集成测试覆盖持久化、授权、乐观锁、三语/金额校验、私有草稿与审计失败回滚。浏览器测试使用隔离 API fixture，覆盖真实 Vue 页面与 Next 服务端代理，不能冒充生产数据库端到端验收。CI 容器检查另行验证真实 API 的空目录、未授权拒绝与静态页面。

### 已核实上线记录（2026-10-26）
- [PR #372](https://github.com/jinfenghua1990/ALSVID/pull/372) 已合并，发布提交为 `1d2475559b529d8a6d65789b5e42157e7eed03f9`。
- 精确提交的 [main CI](https://github.com/jinfenghua1990/ALSVID/actions/runs/40286376942) 和 [完整生产发布](https://github.com/jinfenghua1990/ALSVID/actions/runs/40286738086) 均成功。现有 Cloud Run 迁移任务 `alsvid-migrate-hkgvp` 成功完成；Neon 只读表元数据确认 `commerce_lab.catalog_products` 已存在。
- WWW 与 Admin 的 `/release-check` 均返回上述发布提交。三语 `/shop-preview` 页面均连接成功；独立商品管理静态页面 HTTP 200，匿名访问管理 API 返回 401。
- 核验时公共目录已发布商品总数为 0。这是某次核验的观测值，不是长期约束，也不证明没有私有草稿。
- PR 的 [浏览器检查](https://github.com/jinfenghua1990/ALSVID/actions/runs/40285536365) 与 [登录检查](https://github.com/jinfenghua1990/ALSVID/actions/runs/40285536238) 均通过。浏览器写入使用隔离 fixture；生产管理员实际新增、编辑、发布再到官网刷新的操作尚未验收。

### 整理与后续工作
| 项目 | 当前情况 | 下一步 / 范围 |
| --- | --- | --- |
| 上线记录 | 已核实上述提交、迁移和公共页面 | 维护本记录；文档更新不等于重新发布应用 |
| 生产操作验收 | 隔离测试已通过，真实管理员写入未核验 | 记录角色、商品编码、保存/刷新/发布/撤回结果及审计证据；不索要密码，不把测试单当真实订单 |
| 页面整理 | 旧交互样机与已保存商品管理在同一总览页；空设计预览分组仍显示 0 | 后续收起/单独归档旧样机，隐藏空分组，并保留比较入口；尚未修改界面 |
| 商品资料 | 核验时尚无已发布商品 | 录入经确认的车型、三语资料与方案价；占位图为负责人允许的当前阶段选择 |
| 媒体扩展 | 仅使用既有 FC1/FC2 参考图片 | 需要自定义图片时，再接现有 R2 上传、对象关联与权限校验；不新增存储服务 |
| 正式交易扩展 | 本区不提供真实下单、支付或履约 | 如推进正式商城，复用已存在的 Product/Commerce/Inventory/Finance 合同，评估 SKU、正式售价、可售库存、税费运费、PSP、发货与退款；不重建原模块，不为比较布局默认开启交易 |
| CRMEB 其他模块 | 源码已导入，未全部适配为可用功能 | 优惠券、会员、营销按实际需要逐项选择，不能因源码存在就列为已交付 |

本次上线的是独立商品比较与发布这一部分。源码导入、隔离测试、精确版本发布和生产真实账号操作验收是不同证据，不得相互替代。
