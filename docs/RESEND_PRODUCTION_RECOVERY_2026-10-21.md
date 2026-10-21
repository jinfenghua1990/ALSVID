# ALSVID 生产部署邮件验证故障排查（2026-10-21）

> 适用：`.github/workflows/production-deploy.yml`，ALSVID 正式环境。
> 正式品牌域名为 **alsvidbike.com**，不能退回 `chaibenn.com` 或 `alsvid.com` 绕过验证。

## 已确认的故障

- 失败的 GitHub Actions: [Production Deploy #39456487114](https://github.com/jinfenghua1990/ALSVID/actions/runs/39456487114)。
- 失败步骤：`Verify configured Resend sender domain before changing Production`。
- Resend API `GET /domains` 返回 401，响应类型为 `restricted_api_key`，明确提示该密钥只能发送邮件。
- 原工作流错误地用 Google Secret Manager 的应用发信密钥 `alsvid-mail-api-key` 执行域名列表读取。**发送权限不等于域名管理权限**。
- 故障发生时 Resend 侧 `alsvidbike.com` 域名尚未通过验证。
- 2026-10-21 已按所有者指示在当前账号重新创建 `alsvidbike.com`，区域为 `eu-west-1`，域名及 DKIM、MX、SPF TXT、CNAME 均已验证为 `verified`。Cloudflare 的两台权威 DNS 已返回匹配记录。
- 现有 `ALSVID Production Mail` 发送密钥限制为 `chaibenn.com`，不能用于新域名。
- 本次失败发生在镜像构建与 Cloud Run 更新**之前**；不代表生产发布已经成功。

## 密钥权限隔离（修复后的设计）

| 用途 | 存储位置 | 密钥/变量名称 | 权限 |
|---|---|---|---|
| 应用发送验证码、通知邮件 | Google Secret Manager | `alsvidbike-mail-api-key` | **Resend Sending access**，仅限 `alsvidbike.com` 发信 |
| GitHub 部署前读取域名验证状态 | GitHub Actions → Environment: `production` → Secrets | `RESEND_DOMAIN_AUDIT_API_KEY` | **Resend Full access**，仅在部署检查使用 |
| 发件邮箱地址 | GitHub Actions → Variables | `MAIL_FROM_ADDRESS` | 必须是 `@alsvidbike.com` 上经验证的发件地址 |

**不要**将完整 API Key 写入 Git 仓库、PR、Actions 日志或 README；不要为消除 401 而给 Cloud Run 的运行时发信凭据提升权限。

部署工作流使用独立的 `alsvidbike-mail-api-key`。先准备新 Secret，部署时才同时切换发件地址与绑定；保留旧 `alsvid-mail-api-key` 及其版本，避免更新 `latest` 提前影响仍使用旧发件地址的修订。密钥保存、生产部署与实际邮件送达仍需单独验收，域名验证成功不代表已完成切换。

## 必须在域名 DNS 完成的配置

在 Resend 控制台查看 `alsvidbike.com` → DNS Records，以**控制台当前显示值**为准。在该域名的权威 DNS 托管方（如 Cloudflare）添加：

| 记录类型 | 主机名（相对于 alsvidbike.com） | 预期内容 |
|---|---|---|
| TXT (DKIM) | `resend._domainkey` | 从 Resend 域名详情复制完整 DKIM 公钥 `p=...` |
| MX (SPF/Return Path) | `send` | `feedback-smtp.eu-west-1.amazonses.com`，Priority 10 |
| TXT (SPF) | `send` | `v=spf1 include:amazonses.com ~all` |
| CNAME | `rsend` | `send.forge.rmta.net` |

- 上述主机名是相对域名；不要再次拼接 `.alsvidbike.com` 导致重复。
- Cloudflare CNAME 记录必须使用 **DNS only**，不能开启代理。
- 不要删除或覆盖网站/商城/后台现有 DNS 或主域名 MX。
- 添加后在 Resend 域名详情中触发 **Verify DNS Records**，等待状态为 `verified`；只添加记录但仍显示 `not_started` 不代表已经完成。
- 若 Resend 修改了 DNS 记录要求（例如 DKIM 轮换），以当前仪表板为准。

## 恢复部署

1. 核对 `alsvidbike.com` 在 Resend 的域名状态为 `verified`。
2. 在 Resend 创建**单独**的 Full access 域名检查密钥，并**仅**保存到 GitHub 的 `production` 环境 Secret：`RESEND_DOMAIN_AUDIT_API_KEY`；不要提交明文。
3. 为 `alsvidbike.com` 创建单独的 Sending access 密钥，安全保存为 GCP `alsvid-prod` 项目的新 Secret `alsvidbike-mail-api-key`；授予既有运行时服务账号读取此 Secret 的权限。保留旧 `alsvid-mail-api-key`，不要提升其权限或覆盖旧值。切勿将密钥贴入聊天、仓库或日志。
4. 确认 main 分支 CI 通过，再从 GitHub Actions 手动触发 `ALSVID Production Deploy`，按既有规范填 `confirm=deploy`。
5. 验证 API/Web 健康检查、`https://www.alsvidbike.com` 与 `https://admin.alsvidbike.com`，以及邮件验证码实际送达。

## 处理原则

- 未通过 DNS 和独立审核凭据验证前，**不要移除域名验证步骤或伪造成功状态**。
- 只修改 GitHub 文档/工作流，不等于正式环境已部署；必须查看 Actions 成功记录并核实线上访问。
- 不使用旧域名作为回退捷径。

## 切换完成验收（2026-10-21 实测）

以上「恢复部署」步骤已全部执行并通过，正式切换闭环完成：

| 验收项 | 结果 |
|---|---|
| 部署 Run | [ALSVID Production Deploy #39538438852](https://github.com/jinfenghua1990/ALSVID/actions/runs/39538438852)（success，2026-10-21 11:28 CST） |
| Cloud Run Revision | `alsvid-api-00076-bgr`（`europe-west1`，Release `fd90e66`） |
| Cloud Run 密钥绑定 | `MAIL_API_KEY` → `alsvidbike-mail-api-key:latest` |
| 发件地址 | `MAIL_FROM_ADDRESS=noreply@alsvidbike.com`，`ALSVID_EMAIL_TEST_MODE=false` |
| 健康检查 | API `/api/health`、`https://www.alsvidbike.com`、`https://admin.alsvidbike.com` 均 HTTP 200 |
| 真实发信 | `POST /api/v1/auth/email/start` 返回 201（Resend 同步接受），验证码邮件送达 `jinfenghua1990@gmail.com` 收件箱 |
| 验证码登录 | `POST /api/v1/auth/email/complete` 返回 201，真实会话建立（system_admin） |

## 切换过程中发现并修复的两个基础设施问题

1. **部署服务账号缺少新密钥的元数据读取权限**：PR #249 新增的 `Validate production mail secret exists` 步骤要求 `alsvid-github-deploy@alsvid-prod` 能 `gcloud secrets describe alsvidbike-mail-api-key`，但该账号此前只有 `artifactregistry.writer` 和 `run.admin`。已在新 Secret 上授予**密钥级** `roles/secretmanager.viewer`（仅元数据，不含明文读取；`secretViewer` 角色不支持密钥级绑定）。
2. **`www-deploy.yml` 与 `production-deploy.yml` 的镜像竞态**：main CI 成功后 `dispatch_www_production` 会构建并推送 `alsvid-web:<SHA>` 并部署 web 服务，导致 `production-deploy.yml` 的「三个镜像全有或全无」检查（`Only some release images exist`）对新提交必然失败。临时处置：删除孤立的 `alsvid-web:<SHA>` tag（digest 保留，按 digest 引用的线上服务不受影响）后立即触发全量部署。**长期修复建议**：让 `production-deploy.yml` 容忍"仅 web 镜像已由 www 流水线发布"的情形，或 www-deploy 改用独立 tag 命名空间。

## 回滚能力

- 旧发送密钥 `alsvid-mail-api-key` 及旧密钥值保留未动；旧域名 `chaibenn.com` DNS 未变更。
- 应用回滚：`ALSVID Production Deploy` 填 `release_sha=<旧 main 提交>` + `rollback=true`（要求该提交的三个发布镜像仍存在于 Artifact Registry）。
- 密钥回滚：如需退回旧发件地址，需同时修改 production 环境变量 `MAIL_FROM_ADDRESS` 与工作流 `secret_bindings`（见 `production-deploy.yml`），二者必须成对变更，不要只改其一。
