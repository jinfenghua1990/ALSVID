# ALSVID 官网商城架构规划

> 状态：**已确认 / Frozen**
>
> 本文定义 ALSVID WWW 的长期官网与商城边界。系统正式命名以 [`SYSTEM_NAMING.md`](SYSTEM_NAMING.md) 为权威来源。

## 一、正式名称与定位

官网系统正式名称固定为：

```text
ALSVID WWW
```

中文定义：**ALSVID 官方网站 / 官网商城**。

`ALSVID WWW` 是架构、代码、文档和部署使用的系统名称；消费者访问网站时，品牌展示仍然只显示 `ALSVID`，不会在前台 Logo 或导航中展示 `WWW`。

ALSVID WWW 不是单纯企业展示网站，而是品牌官网 + Shopify 商城融合体系。

目标：

- 展示品牌价值
- 展示产品体系
- 支持消费者购买
- 建立车主会员体系
- 连接 ALSVID Admin
- 为 ALSVID Dealer Portal 与 My ALSVID 提供明确入口

## 二、ALSVID 产品 Surface 总体结构

```text
ALSVID
│
├── ALSVID WWW
│   ├── 品牌官网
│   ├── 产品与配件
│   ├── 服务入口
│   └── Shopify 商城
│
├── ALSVID Admin
│   └── 内部运营后台
│
├── ALSVID Dealer Portal
│   └── 经销商门户
│
└── My ALSVID
    └── 车主 / 会员中心
```

四个 surface 可以共享 ALSVID 的 API、Identity、Domain 与基础设施，但页面、权限和使用对象必须保持清晰边界。

## 三、官网整体结构

```text
ALSVID WWW
        |
        |-- 消费者浏览与购买
        |
        |-- My ALSVID 入口
        |
        |-- ALSVID Dealer Portal 入口
        |
        |-- ALSVID Admin 数据连接
```

## 四、顶部导航（最终版本）

消费者前台显示：

```text
ALSVID

自行车
配件
服务
关于我们
经销商合作

购买
登录
搜索
```

不在消费者前台显示 `ALSVID WWW` 字样。

## 五、菜单说明

### 1. 自行车

产品核心入口：

- FC 系列：碳纤维折叠
- CT 系列：城市通勤
- FT 系列：胖胎越野
- GT 系列：长途旅行

包含：

- 产品介绍
- 技术参数
- 图片视频
- 在线购买

### 2. 配件

独立产品生态：

- 车身配件
- 骑行装备
- 升级套件
- 维修零件

### 3. 服务

车主服务入口：

- 车辆注册
- My ALSVID
- 保修服务
- 维修支持
- 用户手册
- 服务网点
- 联系我们

说明：

车主会员体系属于公开用户系统，但核心车辆、客户、保修、服务等业务事实连接 ALSVID Admin / ALSVID Domain。

### 4. 关于我们

整合品牌内容：

- 品牌故事
- 设计理念
- 工程技术
- 制造工艺
- 新闻动态

不单独设置“技术”和“探索”一级菜单，避免导航过多。

### 5. 经销商合作

商业合作入口：

- 成为经销商
- 经销商申请
- ALSVID Dealer Portal 登录

经销商属于商业客户体系，不属于普通消费者会员。

## 六、Shopify 关系

ALSVID WWW 采用 Shopify 作为消费者交易基础。

流程：

```text
用户
 ↓
ALSVID WWW
 ↓
产品页面
 ↓
购买
 ↓
Shopify 订单 / 支付 / 平台交易能力
```

ALSVID 不重复实现 Shopify 自己负责的 checkout、支付捕获和平台履约编排。

未来即使 ALSVID WWW 的视觉与内容先在本仓库中完成，也必须保持可迁移到 Shopify Theme / Storefront 结构的页面与数据边界，避免后续重新设计整站。

## 七、会员体系

My ALSVID 面向购买用户 / 车主开放。

用户可以查看：

- 我的车辆
- 车辆注册
- 保修状态
- 维修记录
- 服务历史
- 配件推荐

后台业务关系：

```text
My ALSVID
 ↓
ALSVID API / Domain
 ↓
ALSVID Admin
 ↓
Customer / Vehicle / Warranty / Service
```

My ALSVID 是公开车主入口，不等同于 ALSVID Admin。

## 八、系统边界

消费者：

```text
ALSVID WWW + Shopify
```

经销商：

```text
ALSVID Dealer Portal
```

车主 / 会员：

```text
My ALSVID
```

内部员工：

```text
ALSVID Admin
```

四者独立，通过统一 API / Domain / Integration 连接。

## 九、环境命名

环境正式名称固定为：

```text
ALSVID Development
ALSVID Production
```

`Development` 同时承担当前开发 / 测试 / 发布前验收职责；不再使用 `Staging` 作为当前固定环境名称。

未来资源名可采用：

```text
alsvid-www-dev
alsvid-www-prod
alsvid-admin-dev
alsvid-admin-prod
```

资源命名只是约定；只有真实云资源创建并完成验证后，才可以声称已部署。

## 十、设计原则

- 官网保持国际品牌简洁风格
- 消费者页面只展示 `ALSVID` 品牌，不展示内部系统命名
- 不展示 ERP、生产、库存等内部信息
- 产品体验优先
- 购买路径清晰
- 服务体系长期沉淀用户资产
- ALSVID WWW 与 ALSVID Admin 视觉、权限和信息架构独立
- 页面结构优先考虑未来 Shopify 迁移能力
- 没有真实数据或未完成能力时明确显示状态，不伪造功能已经上线

## 十一、命名冻结规则

从 Issue #116 起，以下名称作为正式名称固定使用：

```text
ALSVID WWW
ALSVID Admin
ALSVID Dealer Portal
My ALSVID
ALSVID Development
ALSVID Production
```

`ALSVID Official`、`Internal Admin` 不再作为正式系统名称。

除非后续出现明确的新架构决策，否则官网、后台、部署、README、Issue、PR 与后续 AI/Codex 工作均沿用本规则，不因聊天窗口或开发阶段变化重新命名。
