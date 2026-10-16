# ALSVID Knowledge Base

这是 ALSVID 主仓库中的共享业务知识层。网页、系统、架构、Shopify、AI 和运营工作都应从这里读取业务背景和长期规则。

## 使用顺序

1. 先读根目录 `AGENTS.md`，遵循工程边界。
2. 再读 `knowledge/00-Company/Architecture.md`。
3. 根据任务读取相关目录。
4. 只把 `status: active` 的内容当作已确认事实；`draft` 和“待确认”内容不得直接用于对外承诺。

## 目录

```text
00-Company/       公司规则、架构边界、决策记录
01-Brand/         品牌故事、设计理念、语气
02-Products/      FC、CT、FT、GT 平台及车型
03-Systems/       Official/Shop、Admin、Dealer、My、Supplier 后续目标
04-SOP/           产品、制造、质量、销售、售后流程
05-AI-Knowledge/  客服、导购、经销商和售后答案
06-Shopify/       商品、内容、客服和自动化规则
99-Templates/     新建知识文件模板
```

## 基本规则

- 一条业务事实只维护一个主文件。
- 长期决策写入 `00-Company/Decision-Log.md`。
- 产品、价格、库存、交付、保修和安全信息必须有来源和更新时间。
- 不提交密码、API Key、客户隐私、订单数据或未脱敏文件。
- 代码实现和运行数据不复制进知识库；知识库只保存可复用的业务规则与事实。

