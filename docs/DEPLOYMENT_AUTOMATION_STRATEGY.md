# ALSVID Deployment Automation Strategy

## 1. Purpose

ALSVID 不要求“必须 Docker 才能自动更新”。

自动更新能力来自 CI/CD（Continuous Integration / Continuous Deployment），Docker 是其中一种标准化运行方式。

本项目的目标：

- 本地现有仓库作为日常代码修改主位置；GitHub 作为同步、审查、CI 与发布入口；
- 提交代码后自动完成测试；
- 验证通过后自动部署；
- 减少人工登录服务器操作；
- 保持未来云迁移能力。

---

## 2. Docker 与自动更新的关系

### 不使用 Docker 也可以自动部署

传统流程：

```text
GitHub
  |
  v
GitHub Actions
  |
  v
服务器
  |
  +-- git pull
  +-- install dependencies
  +-- build
  +-- restart service
```

可以实现自动更新。

### 使用 Docker 后

推荐企业流程：

```text
GitHub
  |
  v
GitHub Actions
  |
  v
Build Docker Image
  |
  v
Container Registry
  |
  v
Production Runtime
```

优势：

- 环境一致；
- 版本可追踪；
- 快速回滚；
- 开发/Test/Production 行为更加接近。

---

## 3. ALSVID 当前建议架构

```text
Developer
    |
    v
GitHub Repository
    |
    v
GitHub Actions
    |
    +--> Test
    |
    +--> Docker Build
    |
    v
Google Cloud Run Production
```

数据服务保持独立：

```text
Application Container
        |
        +--> Neon PostgreSQL
        |
        +--> Cloudflare R2
        |
        +--> Secret Manager
```

---

## 4. 当前阶段策略

ALSVID 当前不应该因为 Docker 而拖慢业务开发。

执行顺序：

1. 完成 Portal 页面和业务模块；
2. 完善 Docker Compose 开发环境；
3. 增加 GitHub Actions 自动测试；
4. 增加自动部署流程；
5. Production 使用容器化部署。

---

## 5. Deployment Rules

必须遵守：

- 本地是日常修改主副本；同步 GitHub 前先比较并保留双方改动；
- Production 发布仍以通过既有门禁的 Git commit/version 为准；
- 不直接修改 Production 服务器代码；
- Production 通过 CI/CD 更新；
- 每次上线对应明确 Git commit/version；
- 保留快速回滚能力。

---

## 6. Future Roadmap

阶段 1：

```text
GitHub
 + Docker Compose
 + Manual Production Deploy
```

阶段 2：

```text
GitHub Actions
 + Automated Test
 + Automated Deployment
```

阶段 3：

```text
Container Registry
 + Cloud Run
 + Monitoring
 + Rollback
```

阶段 4：

```text
Multi-service
 + Scaling
 + Advanced Observability
```

---

## Decision

ALSVID 不把 Docker 作为开发前置条件，但将 Docker 作为长期部署标准之一。

自动更新依靠 CI/CD，Docker 用于保证运行环境稳定和可迁移。
