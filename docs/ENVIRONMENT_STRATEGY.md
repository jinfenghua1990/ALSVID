# Environment Strategy

## Current model

Owner decision 2026-10-31: ALSVID has one live business environment, **Production**, shared by any number of authorized computers. Every actual deployment and business session uses the same Production identity, business data and Cloudflare R2. No separate test business environment exists. Local or GitHub development is allowed; compare changes before syncing either direction and preserve existing functionality.

Automated CI may use ephemeral synthetic fixtures without Production data or credentials. Such checks are not a business deployment. Verify actual service and data bindings rather than relying on environment labels; protect Production secrets and do not initialize, overwrite or delete live data during setup or validation.

## Release flow

```text
GitHub pull request → CI → merge → exact-commit main CI → Production dispatch → Cloud Run
```

- Pull requests target `main`; production code is not edited directly.
- CI checks migrations, architecture boundaries, types, tests, application builds, Docker builds and startup smoke checks.
- After merge, the trusted auto-merge workflow explicitly opts the main CI run into Production dispatch; ordinary manual CI runs do not deploy. Direct pushes to `main` follow the same exact-commit CI gate.
- Production deploy accepts only the exact successful main commit and runs explicit migrations and live health checks. Obsolete releases are skipped when a newer `main` commit exists.
- Manual rollback selects a previously released main commit with explicit rollback confirmation. Application rollback does not reverse database migrations.
- No automatic synchronization to `develop` or cloud Development deployment is part of the current pipeline.

## Retired environment

The former `alsvid-dev` Cloud Run environment and its promotion workflows are retired. Historical audit documents may mention them as prior state. Do not recreate or delete cloud resources based solely on repository documentation; verify the live inventory and ownership first.

## 本地 Production 运行（2026-11-02 新增可选配置）

现有 Cloud Run 仍是公开 HTTPS 运行入口和 GitHub 发布目标，不下线；新增 `infra/docker-compose.local-production.yml` 和 `scripts/local-production.mjs`，只允许获授权的本地运维节点运行 Web/API/Gateway，并从既有 Google Secret Manager 获取运行密钥、连接与 Cloud Run 相同的 Neon Production 与 R2。禁止把此模式误当独立测试业务环境、第二套主库或正式数据库迁移执行节点。默认监听 `127.0.0.1:8080`，不允许未经安全审查就开放员工局域网/公网访问。员工仍经现有 HTTPS 门户和统一身份、权限访问实时权威数据。本地 Docker、云凭据及真实业务验收尚未执行，见 [本地运行与验收](LOCAL_PRODUCTION.md)。
