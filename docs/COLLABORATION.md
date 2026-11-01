# 统一开发与版本恢复

## 日常入口

2026-10-31 用户更新开发方式：现有本地仓库是日常代码修改和验收的主位置，本机 Web 3000 用于检查；GitHub 是辅助的版本同步、备份、协作审查和 CI/发布入口。同步前比较双方差异并保留两侧已有功能；不另建 worktree、隔离区或第二份项目副本。实际业务仍连接同一云端正式身份、数据库和 R2；不得把本地数据库或模拟数据当作业务数据。此决定取代 2026-10-21 的“只能直接在 GitHub 编辑、禁止本机开发和 localhost”规则；Codespace 仍为可选工具。

开始前检查本地分支和工作树，不覆盖其他修改。需要同步 GitHub 时，先比较本地与远端，再按任务分支/PR 集成；不得强推共享分支。不得在 Production 容器内安装浏览器工具。GitHub 绿色检查仅代表对应提交与覆盖范围，不等于生产部署成功；发布后仍核对 Release SHA 和实际页面。

### 可选 Codespace

本地仓库是日常代码工作的主副本，GitHub 保存已同步的版本并支持协作审查。家里、公司需要 Codespace 时，可用同一 GitHub 账号重开**同一个** ALSVID Codespace；开始前先同步并比较差异。首次创建选择本仓库及工作分支，使用默认 devcontainer。已有 Codespace 需 Rebuild Container 才采用新配置。Codespaces 的计算/存储可能收费，停止与保留期限由账号设置控制；未同步修改只保存在其当前工作区。

配置统一 Node 22、pnpm 10.34.6、Docker；创建后仅安装锁定依赖，不自动连接生产、迁移数据库或部署。首次安装需要网络。

在 Codespace 终端：

```bash
git status --short --branch
git fetch origin
# 干净工作树且是新任务时才创建分支；已有任务续接原分支。
git switch -c chore/my-task origin/main
pnpm infra:up
# 仅首次创建，已有 .env 不覆盖；检查全部是本地占位值。
test -e .env || cp .env.example .env
set -a; source .env; set +a
pnpm db:migrate
pnpm dev
```

Web 3000、API 4000 的转发端口保持 Private；不得放入生产密钥。现有 Docker PostgreSQL/MinIO 是隔离开发数据；MinIO bucket 如需使用按已有存储文档初始化。开发后运行相关测试，完整验收沿用 `pnpm verify` 和现有 CI 容器检查；云端依赖失败不能声称验收通过。

## AI 与交接

## 多设备与多 AI 协作规则（2026-10-18）

- 开工检查当前本地分支、相关开放 PR 和工作树状态；已有任务优先续接，禁止从过期聊天快照覆盖代码。
- 直接在现有本地仓库修改和验收，不新建 worktree/隔离区/项目副本。需要同步 GitHub 时使用任务分支和 PR；不得直接推送 main。
- 修改前确认本地分支和工作树归属；脏工作树先保留，不得 reset --hard、清理未跟踪文件或覆盖他人修改。同步前比较远端差异，不得强推共享分支。发现同文件并行工作先协调。
- 提交前检查 diff、密钥与相关验证；推送前再次检查远端分支，处理冲突并复验。禁止为了过 CI 而弱化检查。
- 交接写清仓库、分支、基准/当前 SHA、PR、已修改文件、验证结果、未提交内容和下一步。未提交修改不是 GitHub 备份。
- AGENTS.md 只约束实际读取并遵循它的工具；权限、分支保护和 CI 才能提供服务器侧约束。不得宣称所有机器人会自动读取。
- 不提交生产凭据或真实业务数据；代码回滚不等于数据库、对象存储和运行数据恢复。

AI 工具应在现有本地仓库修改；不得另建隔离 worktree 或替代项目副本。本机 3000 用于本地功能预览；代码同步到 GitHub 后，仍通过既有 CI 和发布门禁。

## 唯一发布路径

保留当前链路：工作分支 → PR → CI `verify` + `containers` → main 对应提交的 CI → `production-deploy.yml` → Cloud Run。生产镜像按 SHA 记录并解析 digest；成功部署的 Actions 日志/summary 记录 Release SHA。记录最近正常版本的 SHA、工作流 run URL、镜像 digest 和迁移版本，不把可变 latest 标签当恢复点。

现有 PR Auto Merge 会对同仓库、可信作者、非 Draft 且 CI 成功的 PR 启用合并；合并后会继续 main CI 和生产发布。**Ready for review 在这里可能导致上线**，未完成验证/未获发布授权时保持 Draft。不要另加手动本机发布或另一条发布流水线。

## main 的服务器侧保护

本次检查：ALSVID 的 main 已受保护，必需 GitHub Actions 检查为 `verify`、`containers`；rulesets 列表为空。连接读取完整 branch protection 返回 403（Resource not accessible by integration），并无管理设置写入工具。账号元数据 admin=true 不等于当前连接具有 Administration 权限。因此不能确认 PR 强制要求、过期审批处理、管理员绕过、force push/delete 的完整状态，也没有宣称改过这些设置。

管理员进入 Settings → Branches，编辑现有 main 保护（不要替换或移除已有规则）：要求 PR；要求上述两项检查并要求分支更新；禁止 force push 和删除；适用时启用禁止绕过。单人维护时不要机械要求其他人一次审批而锁死自己；如有独立审核者再要求审批。保存后用具备 Administration read 权限的连接重新读取验证。不要把本次 Draft PR 直接标为 Ready，除非已接受自动合并/发布行为。

## 出错怎么恢复

- 提交历史保存每次已提交的代码快照；在文件 History 或仓库 Commits 查看、比较 SHA。没有 commit/push 的编辑不在 GitHub 历史中，禁止通过重写 main 历史来“恢复”。
- 错误普通提交：从最新 main 建恢复分支，`git revert <bad-sha>`，解决冲突、验证后提 PR。revert 新增反向提交，保留审计记录。
- 错误合并：在已合并 PR 使用 Revert 创建恢复 PR；若无按钮或有冲突，按实际合并类型处理。squash 合并 revert squash SHA；真正的 merge commit 需确认主线后用 `git revert -m 1 <merge-sha>`，不能盲用。
- 文件误删：在恢复分支执行 `git restore --source=<good-sha> -- path/to/file`，审查差异、提交并提 PR，避免恢复整棵旧代码覆盖后续工作。
- 线上故障急退：打开 Actions → ALSVID Production Deploy → Run workflow，工作流分支选择 main；release_sha 填**曾成功生产发布且仍在 main 历史中的完整 SHA**，confirm 填 deploy，rollback 选 true。当前发布门禁要求历史成功证据和三份原有发布镜像，缺失即拒绝回滚，不重建旧版。先核对数据库兼容性；工作流仍会执行迁移任务，并非数据库降级器。检查 API/Web/Worker、日志和 release SHA，随后补 revert/修复 PR，防止下次 main 发布重新引入错误。权限、镜像保留或 schema 不兼容时停止并按生产运行手册处理。
- 数据误删：GitHub **不自动备份 Neon 数据、R2 图片/附件、Cloud Run 运行数据、Secret Manager 或外部 Shopify/WMS 数据**。需要独立备份、保留策略和隔离恢复演练。先恢复到隔离目标核验，再审议切换；本次未执行任何生产数据恢复，也未确认现有备份可用。

## 其他仓库边界与本次审查

2026-10-18：ALSVID 开放 PR #203（Draft）和 #205（页面发布工作），本任务不改它们。WWW 是首屏动画参考档案，不能建立第二套正式官网发布；正式官网在 ALSVID/apps/web。CoffeeBear 是国内业务仓库，沿用其 docs/RELEASE_STANDARD.md 的候选制品与晋升路径，不复制 ALSVID 的 Node 单体环境或 Cloud Run 发布配置。两仓库 main 当前显示未保护，rulesets 为空；完整保护读取同样 403。共同的分支/PR/交接原则以各仓库的补充 PR 固化，业务代码与部署仍各自独立。

本次配置只代表可审查方案；Codespaces 实例创建/重建和实际容器运行必须另有真实证据。参考：[重开 Codespace](https://docs.github.com/en/codespaces/developing-in-a-codespace/opening-an-existing-codespace)、[Revert PR](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/reverting-a-pull-request)。
