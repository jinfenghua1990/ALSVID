# 门户登录与会话规则

## 目标

ALSVID 使用一个身份中心和一个后端数据中心，但按访问对象拆分门户入口。登录页面属于门户，不属于某个具体的业务页面。

## 门户规则

| 门户 | 临时地址 | 是否公开 | 登录对象 | 登录方式 |
| --- | --- | --- | --- | --- |
| WWW 官网 | `https://www.chaibenn.com` | 是 | 公众访客 | 不提供通用登录动作 |
| My ALSVID | `https://my.chaibenn.com` | 否 | 客户 / 车主 | 个人邮箱验证码；后续可使用个人密码 |
| Dealer Portal | `https://dealer.chaibenn.com` | 否 | 经销商成员 | 经销商工作邮箱；必须有邀请或 Dealer 角色 |
| Admin Portal | `https://admin.chaibenn.com` | 否 | ALSVID 内部员工 | 公司邮箱；需要内部角色，管理员还需要 `system_admin` |

开发环境对应使用 `www.dev.chaibenn.com`、`my.dev.chaibenn.com`、`dealer.dev.chaibenn.com`、`admin.dev.chaibenn.com`。正式和开发共用代码与身份协议，但不共用数据库、会话或业务数据。

## 行为

1. WWW 只展示公开内容，不显示通用登录按钮，也不会因为未登录跳转到 Admin。
2. My、Dealer、Admin 的受保护页面在服务端检测会话；未登录时跳转到本门户登录页，并携带 `returnTo`，成功后回到原页面。
3. 同一环境的四个子域共享会话 Cookie，所以同一个人在同一环境完成一次登录后切换门户不会重复输入凭据；切换门户仍然要经过后端角色检查。
4. 共享会话不等于共享权限：客户不能进入 Admin，经销商不能读取其他经销商数据，内部权限也不能自动获得客户车辆所有权。
5. WWW 上如需提供入口，只能是“进入我的车库”或“经销商入口”等上下文入口，不能放一个含糊的“登录”按钮。

## 当前实现边界

身份服务已按 `admin`、`dealer`、`my` 传递登录对象：My 新账号分配 `customer_user`，Dealer 新账号分配 `dealer_user`，Admin 继续使用内部邮箱和内部角色。真实车辆所有权、经销商公司成员关系和数据范围仍必须由业务关系表控制，不能靠登录成功本身推断。
