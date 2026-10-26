# 商城源码导入与发布范围（负责人澄清，2026-10-26）

status: active

负责人要求把 Medusa 前台与 CRMEB 中文后台源码引入自己的 GitHub，然后发布至现有 ALSVID 官方网站和 Admin 的独立菜单，保留原系统用于比较。仅仿制界面、浏览器样机或只读接口试验不满足完整交付。

已有数据库、对象存储与 Google Cloud Run。后续先核对和复用现有资源，不要求负责人先提供一个现成 CRMEB 实例，也不把新增云服务器作为默认前置条件。现有应用使用 PostgreSQL；是否另有可用 MySQL 必须据实盘点，不能从应用配置缺失推断整个云账户没有资源。

## 源码
- external/medusa-dtc：固定版本的官方 DTC 项目，含 storefront 原始源码和许可证。
- external/crmeb：固定版本的 CRMEB 原始源码，含中文 Admin 与 PHP API、依赖和许可证。
- docs/COMMERCE_SOURCE_LOCK.json：导入后记录真实上游提交、文件数量、内容摘要和排除项。
- 导入不执行上游安装脚本；排除 Git 元数据、.env 实例配置、安装状态和 node_modules。保留源码与原有版权，不宣称已完成运行整合。

## 发布目标
- WWW：基于引入的 Medusa storefront 源码调整 ALSVID 车型、三语词库、现有视觉及 CRMEB 数据调用。
- Admin：独立“商城方案对比”菜单进入本账户部署的原生 CRMEB 后台，原有业务模块保留。
- 商品/账号/购物车/订单适配逐项验收；不得双写原业务数据。支付继续遵循 ADR 0005/0006。
- 原生 CRMEB 需要其兼容的 PHP/MySQL 运行环境。验证范围、已有资源盘点和实际部署状态分别记录，源码存在不等于发布完成。
