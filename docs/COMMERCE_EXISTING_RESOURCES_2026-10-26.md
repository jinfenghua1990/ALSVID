# 商城融合：复用已有资源与核实结果（2026-10-26）

负责人已明确：已有数据库、对象存储和云运行服务，本任务负责把 Medusa 与 CRMEB 源码放入自己的 GitHub 并发布到现有官网/后台独立入口。不能再把“负责人先提供现成 CRMEB 服务”作为前置条件。

## 已只读核实
Neon 中现有项目和数据库均名为 ALSVID Production，生产分支 production，PostgreSQL 18，区域 aws-eu-central-1。已通过连接器读取资源与表结构元数据，未获取/输出连接密码，未建库、迁移或修改数据。现有表覆盖 identity、product、commerce、inventory、finance、assets 等域。

仓库记录和原有部署链使用 Cloudflare R2 保存文件、Google Cloud Run 运行 WWW/Admin/API；实际 Run 项目由 production 环境变量选择，不从过期文档猜测或切换项目。

## 下一步盘点
commerce-resource-inventory.yml 是使用既有 Production 身份的独立运维只读任务，不把 Production 凭据注入 PR 测试。仅在 main 精确提交 CI 成功后或人工触发时运行，读取 Run 服务及 Cloud SQL 实例元数据。不启用 API，不创建资源，不调整 IAM，不读取 Secret Manager 内容或客户业务数据。查询失败记录为 not-readable，不能写成“没有资源”。

Neon PostgreSQL 与原生 CRMEB 的 MySQL 兼容性是待解决的集成事项。不得用一个只读接口或界面副本宣称已兼容，亦不得在未盘点前推断需要新买服务器。新增持久化资源若确有必要，须先给出具体配置和费用影响。

## 源码状态
原始源码已经导入任务分支 external/medusa-dtc 与 external/crmeb，保留许可证。原版本/文件数量记录在 COMMERCE_SOURCE_LOCK.json；后续本仓库定制需要单独记录，不伪称仍为未经修改的上游快照。WWW 和 Admin 的实际原生发布、存储映射与业务联动仍须验收。
