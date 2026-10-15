# ALSVID GitHub + Notion 知识管理

status: review
owner: ALSVID
last_reviewed: 2026-10-15

## 分工

GitHub 已合并主分支上的 `docs/` 是工程规则真源，`knowledge/` 是业务知识真源。Notion 用于项目总览、会议草稿、需求收集及正式知识摘要。Notion 草稿不直接覆盖正式规则；只有已审阅并合并的记录可以作为正式依据。

沿用现有目录，不搬移旧文档，不另建重复的 architecture、ui 或 decisions 树。

| 内容 | 主位置 | Notion 用途 |
| --- | --- | --- |
| 工程架构、运行规则 | `docs/`、`docs/adr/` | 摘要与原文链接 |
| 业务规则与长期决策 | `knowledge/`、`00-Company/Decision-Log.md` | 摘要与原文链接 |
| 会议与聊天整理 | `07-Project-Management/meetings/`，必要时仅留 Notion 私有草稿 | 按日期阅读、待确认事项 |
| 需求及执行任务 | GitHub Issue | 需求草稿、任务链接与视图 |
| 实施与审阅 | GitHub PR | 状态镜像与发布阅读入口 |

仓库当前是公开仓库。内部会议全文、个人信息、商业敏感信息、凭据不进入 GitHub；先脱敏并确认适合公开后才提交可复用摘要。

## 使用入口

- [Notion 空间及字段蓝图](NOTION_WORKSPACE.md)
- [总结与同步流程](SYNC_RUNBOOK.md)
- [接入状态与验收](CONNECTION_STATUS.md)
- [会议目录](meetings/README.md)
- [会议模板](../99-Templates/Meeting-Summary.md)
- [决策模板](../99-Templates/Decision.md)
- [需求模板](../99-Templates/Requirement.md)
- [同步配置草案](sync.config.json)

这些文件是可实施的配置设计，不代表 Notion 页面、调度器或同步服务已创建。
