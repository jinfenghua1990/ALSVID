# ALSVID WWW / 自建商城

status: active
owner: ALSVID
last_reviewed: 2026-10-22

ALSVID Official（`www.alsvidbike.com`）是品牌官网与自建消费者商城的统一前台，覆盖整车、配件、商品详情与本地非约束性购物袋预览。消费者订单由 ALSVID Commerce 管理；支付操作由通过资质审核的第三方支付机构处理。**首期不采用 Shopify**，不要求部署独立公开 Shop 产品或额外 Shopify 商店。以 [ADR 0005](../../docs/adr/0005-alsvid-owned-storefront-and-third-party-payments.md) 为最新交易规则。

首页「产品」进入 `/{locale}/bikes`；整车与配件在同一产品中心呈现，首页配件入口定位到 `/{locale}/bikes#accessories`。旧 `/{locale}/accessories` 作为兼容路由回到统一产品中心；保留 `/{locale}/explore/fc1` / `fc2` 现有详情页。产品、价格、配件兼容、供货、车辆状态等对外事实应来自 `knowledge/02-Products/` 的已确认事实和 ALSVID 产品领域，不能由页面硬编码成真实可售商品。

当前阶段：目录页展示经审核发布的整车目录与尚待审核的车型/配件预览；浏览器本地购物袋可暂存非约束性选择并显示数量，但不创建真实 Commerce 订单、不预留库存、不处理支付。未核实价格、库存、适配与交付前，不开放真实立即购买。接入前须通过 ADR 0005 的 PSP 商户资格、价格/税费/物流、德国消费者条款、Webhook/幂等/支付对账与发布验收。

对外页面设计保持现有 ALSVID 视觉语言；未来的页面应沿用三语词库、响应式布局和域名 `alsvidbike.com`。本文件记录业务与页面边界，不声明分支改动已经发布。
