# 商城源码导入与发布范围（负责人澄清，2026-10-26）

status: active

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

PR #372 尚待最终验收、合并及现有生产流水线执行增量迁移和发布。源码或临时 CI 截图存在不等于线上已交付。
