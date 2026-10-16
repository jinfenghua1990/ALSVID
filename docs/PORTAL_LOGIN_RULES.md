# 门户登录与会话规则

## 目标

ALSVID 复用统一 API 与自身身份/授权中心，Shopify Customer 是客户交易身份来源；按访问对象拆分门户入口。以下为目标规则，当前实现缺口以[门户实施台账](PORTAL_DELIVERY_PLAN_2026-10-16.md)为准。登录页面属于门户，不属于具体业务页面。

## 门户规则

| 门户 | 临时地址 | 是否公开 | 登录对象 | 登录方式 |
| --- | --- | --- | --- | --- |
| WWW 官网 | `https://www.chaibenn.com` | 是 | 公众访客 | 不提供通用登录动作 |
| My ALSVID | `https://my.chaibenn.com` | 否 | 客户 / 车主 | Shopify 客户账户验证；ALSVID 只建立最小映射 |
| Dealer Portal | `https://dealer.chaibenn.com` | 否 | 经销商成员 | 经销商工作邮箱；必须有邀请或 Dealer 角色 |
| Admin Portal | `https://admin.chaibenn.com` | 否 | ALSVID 内部员工 | 内部域名邮箱 + 内部邀请/验证；管理员还需要 `system_admin` |
| Supplier Portal（分阶段目标，#185） | `https://supplier.chaibenn.com` | 否 | 外部供应商成员 | 供应商企业邮箱 + 授权邀请 + Supplier 组织成员关系 |

开发在本地、CI 使用临时资源；旧 `*.dev.chaibenn.com` 云环境已退役，不按历史域名创建资源。测试身份/数据/凭据与生产隔离。

## 行为

1. WWW 只展示公开内容，不显示通用登录按钮，也不会因为未登录跳转到 Admin。
2. My、Dealer、Admin 的受保护页面在服务端检测会话；未登录时跳转到本门户登录页，并携带 `returnTo`，成功后回到原页面。
3. Dealer/Supplier 是外部企业用户。当前代码支持父域业务 Cookie 与独立 My Cookie 名称，但父域 Cookie 仍会发往 My 子域，不能据此宣称隔离完成。联登与 Cookie 迁移按 [SSO 规范](SSO_AND_PORTAL_ARCHITECTURE.md)评审，进入任何门户仍须检查业务资源范围。
4. 共享会话不等于共享权限：客户不能进入 Admin，经销商不能读取其他经销商数据，内部权限也不能自动获得客户车辆所有权。
5. WWW 上如需提供入口，只能是“进入我的车库”或“经销商入口”等上下文入口，不能放一个含糊的“登录”按钮。

## 当前实现边界

已有内部认证、角色种子、门户入口和 My Shopify 登录链接配置。Dealer/Supplier 企业成员范围、My 的完整 Shopify 身份回调与真实车辆归属尚需交付和验收；不能把本表目标写成已实现。真实车辆所有权、经销商/供应商成员关系必须由服务端业务关系控制，不能靠角色、相同邮箱或登录成功推断。Dealer 的 Shopify B2B 交易身份另行验证并绑定，保留现有业务登录直至有明确迁移任务。


## 供应商与内部账号的边界

供应商不是内部员工，不使用 ALSVID 内部域名邮箱，也不能因为登录成功进入 Admin。供应商账户必须绑定 Supplier 组织成员关系，并只读取该供应商被授权的采购、交付或文件范围。内部员工账号则必须满足内部域名邮箱规则，并由 ALSVID 内部角色和权限控制。

## Shopify 客户身份边界

My ALSVID 不自行创建客户账号，不把“知道一个邮箱”当成客户身份。客户先在 Shopify 完成客户账户验证；ALSVID 通过受控回调/令牌交换确认 Shopify customer 标识，再创建或更新本地最小身份映射。客户车辆、所有权和售后范围仍由 ALSVID 的业务关系表决定。
