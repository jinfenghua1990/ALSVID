# 门户登录与会话规则

## 目标

ALSVID 使用一个身份中心和一个后端数据中心，但按访问对象拆分门户入口。登录页面属于门户，不属于某个具体的业务页面。

## 门户规则

| 门户 | 临时地址 | 是否公开 | 登录对象 | 登录方式 |
| --- | --- | --- | --- | --- |
| WWW 官网 | `https://www.chaibenn.com` | 是 | 公众访客 | 不提供通用登录动作 |
| My ALSVID | `https://my.chaibenn.com` | 否 | 客户 / 车主 | Shopify 客户账户验证；ALSVID 只建立最小映射 |
| Dealer Portal | `https://dealer.chaibenn.com` | 否 | 经销商成员 | 经销商工作邮箱；必须有邀请或 Dealer 角色 |
| Admin Portal | `https://admin.chaibenn.com` | 否 | ALSVID 内部员工 | 内部域名邮箱 + 内部邀请/验证；管理员还需要 `system_admin` |
| Supplier Portal（预留） | `https://supplier.chaibenn.com` | 否 | 供应商成员 | 供应商企业邮箱 + 内部邀请 + Supplier 组织成员关系 |

开发环境对应使用 `www.dev.chaibenn.com`、`my.dev.chaibenn.com`、`dealer.dev.chaibenn.com`、`admin.dev.chaibenn.com`。正式和开发共用代码与身份协议，但不共用数据库、会话或业务数据。

## 行为

1. WWW 只展示公开内容，不显示通用登录按钮，也不会因为未登录跳转到 Admin。
2. My、Dealer、Admin 的受保护页面在服务端检测会话；未登录时跳转到本门户登录页，并携带 `returnTo`，成功后回到原页面。
3. 同一环境的内部业务门户（Admin、Dealer、Supplier）共享 `.chaibenn.com` / `.dev.chaibenn.com` 会话 Cookie；My ALSVID 使用独立 Host-only Cookie，不共享内部会话。切换内部门户仍须经过后端角色检查。
4. 共享会话不等于共享权限：客户不能进入 Admin，经销商不能读取其他经销商数据，内部权限也不能自动获得客户车辆所有权。
5. WWW 上如需提供入口，只能是“进入我的车库”或“经销商入口”等上下文入口，不能放一个含糊的“登录”按钮。

## 当前实现边界

身份来源已经拆开：Admin 使用 ALSVID 内部身份中心和内部域名邮箱；Dealer / Supplier 使用企业邮箱、邀请和组织成员关系；My ALSVID 使用 Shopify 客户账户作为客户身份来源，不能通过 ALSVID 个人邮箱直接注册。真实车辆所有权、经销商/供应商成员关系和数据范围仍必须由业务关系表控制，不能靠登录成功本身推断。


## 供应商与内部账号的边界

供应商不是内部员工，不使用 ALSVID 内部域名邮箱，也不能因为登录成功进入 Admin。供应商账户必须绑定 Supplier 组织成员关系，并只读取该供应商被授权的采购、交付或文件范围。内部员工账号则必须满足内部域名邮箱规则，并由 ALSVID 内部角色和权限控制。

## Shopify 客户身份边界

My ALSVID 不自行创建客户账号，不把“知道一个邮箱”当成客户身份。客户先在 Shopify 完成客户账户验证；ALSVID 通过受控回调/令牌交换确认 Shopify customer 标识，再创建或更新本地最小身份映射。客户车辆、所有权和售后范围仍由 ALSVID 的业务关系表决定。
