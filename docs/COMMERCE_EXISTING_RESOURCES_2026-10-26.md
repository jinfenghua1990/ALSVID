# 商城融合：复用已有资源与核实结果（2026-10-26）

负责人已有数据库、对象存储和云运行服务，要求把 Medusa 与 CRMEB 源码放入自己的 GitHub 并发布到现有官网/后台独立入口。后续明确选择改写商品功能复用现有 PostgreSQL，不再以前置 CRMEB 服务、MySQL 或新增服务器为条件。

## 已只读核实
Neon 项目和数据库均名为 ALSVID Production，生产分支 production，PostgreSQL 18，区域 aws-eu-central-1。通过连接器读取资源与表结构元数据，未获取/输出连接密码，未建库、迁移或修改数据。现有表覆盖 identity、product、commerce、inventory、finance、assets 等域。

仓库记录和原有部署链使用 Cloudflare R2 保存文件、Google Cloud Run 运行 WWW/Admin/API；已核实部署记录的项目为 alsvid-production，区域 europe-west1。实际发布仍由既有 production 环境配置确定，不切换项目。

## 当前实现
商品比较功能通过既有 Node API、身份授权和审计写入新 commerce_lab.catalog_products 表。迁移在 PR 中，生产尚未执行。原业务表保留。

此前拟定的 commerce-resource-inventory.yml 已删除：PostgreSQL 改写路径不需要盘点/创建 Cloud SQL，也不新增运维云身份。原生 PHP/MySQL 测试仅在临时 CI 中运行，不是要求负责人购买新资源。

## 源码与验收
源码已导入 external/medusa-dtc 与 external/crmeb，保留许可证与 COMMERCE_SOURCE_LOCK.json。实际适配范围为三语商品预览与独立中文商品管理，见 [交付范围](COMMERCE_SOURCE_DELIVERY_SCOPE_2026-10-26.md)。不将源码导入、fixture 浏览器验证或原生参考测试等同于全部功能发布；生产迁移、发布和线上验证仍需完成。
