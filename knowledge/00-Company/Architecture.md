# ALSVID Knowledge Architecture

status: active
owner: ALSVID
last_reviewed: 2026-10-14

## 责任边界

- 根目录 `AGENTS.md`：工程规则、系统边界、架构和交付约束。
- `docs/`：技术决策、当前工程状态、数据库和运行时说明。
- `knowledge/`：公司事实、品牌、产品、业务规则、SOP 和 AI 可读答案。
- 数据库、Shopify、WMS 和对象存储：运行数据或外部系统事实，不复制成静态知识文件。

## 共享使用方式

```text
ALSVID 主仓库
├── AGENTS.md
├── docs/       技术真源
├── knowledge/  业务真源
├── apps/       产品应用
└── domains/    业务领域
```

所有新网页、系统模块、架构调整和 AI 工作，都要同时遵循 `AGENTS.md`、相关技术文档和相关知识文件。

## 状态

- `draft`：仍在整理，不能作为正式依据。
- `review`：等待负责人确认。
- `active`：已确认，可以被团队和 AI 使用。
- `deprecated`：历史内容，仅用于追溯。

