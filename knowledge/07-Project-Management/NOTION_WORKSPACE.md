# Notion 空间蓝图

status: review
owner: ALSVID
last_reviewed: 2026-10-15

在用户提供并授权访问的父页面下建立 `ALSVID Workspace`。先查找同名空间、数据库和记录，复用现有对象；不删除旧页面。默认内部访问，不发布到互联网。

## 页面结构

```text
ALSVID Workspace
├── 项目总览
├── 知识索引（数据库）
├── 决策记录（数据库）
├── 产品需求池（数据库）
├── 会议记录（数据库）
├── UI 参考（页面：链接到既有设计与规范）
├── 开发任务（页面：GitHub Issue 链接）
└── GitHub 同步（页面：PR 同步数据库或 PR 链接）
```

项目总览展示：正式知识入口、最近已确认决策、待确认会议事项、未完成需求、GitHub 仓库链接、最近同步成功时间与错误状态。没有成功同步时显示“尚未同步”。

## 数据库字段

各数据库的第一列为 Title；其余字段用以下类型创建。关系字段在所有数据库创建后再绑定。

| 数据库 | 字段与类型 | 推荐视图 |
| --- | --- | --- |
| 知识索引 | 标题 Title、稳定键 Rich text、分类 Select（工程/业务/SOP/AI/UI）、状态 Select（draft/review/active/deprecated）、源路径 Rich text、GitHub URL URL、源提交 Rich text、内容哈希 Rich text、最近同步 Date | 按分类、active 正式知识 |
| 决策记录 | 标题 Title、决策编号 Rich text、状态 Select（draft/review/active/deprecated）、日期 Date、负责人 People（实际成员待确认）、来源 URL URL、GitHub URL URL、源提交 Rich text、关联会议 Relation | 今日决策、待确认、历史 |
| 产品需求池 | 标题 Title、需求编号 Rich text、状态 Select（待整理/待确认/已建 Issue/进行中/完成/取消）、优先级 Select（P0/P1/P2/P3）、负责人 People、Issue URL URL、PR URL URL、关联决策 Relation | 需求看板、待确认 |
| 会议记录 | 标题 Title、日期 Date、状态 Select（draft/review/active）、来源 URL URL、源记录编号 Rich text、GitHub URL URL、未决事项 Rich text、关联决策 Relation | 日期倒序、待确认 |

不要用占位人名填 People 字段。正文按模板包含来源、已确认事实、建议、未决事项及行动项。

正式镜像的正文由同步程序管理；人工备注放独立字段，避免被覆盖。修改正式规则时，通过关联 GitHub Issue/PR 提议修订。

## GitHub 同步能力

核对日期：2026-10-15。Notion 当前托管 GitHub Database sync 文档列明：同步 PR，不包含 Issue、评论、指派人或审阅详情；需要 Business 计划及有仓库权限的 GitHub App 安装。旧版同步文档与截图可能不同，不假定已满足套餐或授权条件。

符合条件时：Settings → Connections → GitHub → Database sync，只选择 `jinfenghua1990/ALSVID`，选择所有历史以避免旧记录被时间窗口移除。创建后检查状态并将数据库放入 GitHub 同步页面。不同步会议正文或 Markdown 文件。

不符合条件时：保留 PR/Issue 链接；后续自定义同步可查询 GitHub API 更新单独数据库，不购买套餐或安装服务来绕过缺失配置。

来源：[Notion 官方 GitHub 文档](https://www.notion.com/help/github)。
