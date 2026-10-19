# ADR 0005 — ALSVID 自建消费者结账与第三方支付

- 状态：已接受的架构方向；实施与上线尚未完成。
- 日期：2026-10-19。
- 决策人：ALSVID 负责人。
- 取代：ADR 0004 及旧文档中“Shopify 负责首期 B2C 订单与支付”的部分决定；ADR 0004 的设计归属、供应商采购与门户权限规则继续有效。

## 背景

ALSVID 首期面向德国与奥地利销售自行车。负责人决定不以购买 Shopify 为前提，采用 ALSVID 自建官网交易体验，并接入符合商户资质要求的第三方支付机构。自建结账不意味着 ALSVID 自己成为支付机构，也不意味着可以绕过支付服务商、强客户认证、消费者保护或数据保护义务。

## 决策

1. ALSVID owns its own storefront flow. ALSVID Commerce owns product/variant selection, cart, checkout orchestration, ALSVID storefront order creation, and customer-visible order status for orders created on the WWW storefront. This is a narrow first-party B2C commerce boundary, not a general-purpose OMS or marketplace aggregator.
2. A PSP executes payment. The payment service provider is responsible for the contracted payment processing, card-data collection, authentication and funds movement. Use hosted checkout or provider-hosted secure components when possible. ALSVID must never store card PAN or CVV and must not treat a browser redirect/client-side success state as proof of payment.
3. Separate business state owners:
   - Commerce: ALSVID storefront order and order lifecycle.
   - Finance: payment attempts, verified payment state, refunds, allocations and settlement facts.
   - Integrations: provider connection, signed event/webhook validation, replay protection, idempotency and reconciliation support.
   - Inventory: reservation/movement ledger and quantity truth.
   - WMS: warehouse receipt, picking, packing, dispatch and warehouse-side fulfillment execution.
4. No dual-write. The PSP is the external authority for its transaction events; after server-side signature and transaction binding are verified, ALSVID records the normalized payment facts. ALSVID order state and PSP payment state remain separate and linked by immutable internal order ID and provider transaction ID.
5. Shopify is not a first-release dependency. Any later Shopify or other sales-channel integration requires a new owner decision and explicit mapping/authority rules. It must not silently take over ALSVID storefront order truth.
6. No live payment until approved. Current FC1 is a preview. It must not create a paid order, collect card data, claim payment success, reserve real stock or display a final order confirmation until the provider and required workflows have passed the launch gate.

## Mandatory risk controls before live checkout

- Server-side order total calculation from trusted price/variant/tax/shipping data; never trust a client-supplied total.
- Bind every payment attempt to one internal order, exact amount and currency; use provider idempotency keys and internal uniqueness constraints.
- Verify webhook signatures, timestamps/replay protection, provider transaction ID, order ID, amount, currency and final provider status before applying state transitions.
- Treat pending/unknown/timeout as unresolved, not failed or paid. Check the existing provider transaction before retrying or switching providers to prevent duplicate charges.
- Apply risk-based fraud checks, rate limits and provider-supported 3-D Secure/strong customer authentication when required. Never promise that a risk check guarantees fraud prevention.
- Model order state separately from payment state. Keep immutable event/audit history; use an outbox/reconciliation job for delayed, duplicated or out-of-order provider events.
- Make refund initiation and refund completion separate states. Verify refund results through provider events/API and reconcile gross amount, fees, refunds and settlement.
- Preserve evidence for disputes/chargebacks, including order terms shown, consent/confirmation, provider references, delivery/tracking and customer communications. Restrict access and retention.
- Store no PAN/CVV. Redact provider secrets and sensitive payment data from logs; use least-privilege credentials, secret storage, rate limits, alerts and tested incident handling.
- Use separate test-mode credentials/resources; never test with Production customer or payment secrets.

## Mandatory customer-facing clarity

Before the customer commits to a paid order, the checkout must clearly show, in the selected language:

- Legal seller identity and contact/support information.
- Exact model, variant, colour and quantity being ordered.
- Final payable total and currency, with applicable VAT/tax, shipping and any unavoidable import/delivery charges clearly included or calculated transparently before commitment.
- Delivery destination, the current estimated delivery window, and the fact that an estimate is not a guaranteed date unless contractually promised.
- Payment method/provider, when payment is taken, what happens if the result is pending, and how to avoid a duplicate payment.
- Cancellation/withdrawal rights, returns/refunds process, warranty and applicable terms.
- Privacy notice and the purpose/legal basis for necessary processing; separate optional marketing consent from purchase consent.
- A final order button whose wording unambiguously indicates a payment obligation where legally required (including the German consumer checkout rule).

Do not use a disclaimer to waive mandatory statutory consumer rights. German/Austrian consumer counsel must review the final DE/EN terms, withdrawal/returns policy, pricing/tax/import treatment and button labels before launch.

## ALSVID FC1 current public preview

- The previously discussed 4–6 week China-to-Germany delivery window is an estimate pending logistics confirmation; show it as an estimate and repeat the final terms before checkout.
- Current model/colour and reference technical values must remain labelled as preview/reference until retail configuration, price, tax, stock, compliance and logistics are confirmed.
- Current UI must state that it is preview only, does not accept payment and does not create a purchase order. Email interest/notification flows, if later added, must be clearly distinguished from paid pre-orders and must not imply a purchase contract.

## Launch acceptance gate

Live checkout is blocked until all are true:

1. A PSP has confirmed in writing that the exact ALSVID Mainland China legal entity, bicycle business, Germany/Austria target, EUR settlement and refund/chargeback model are eligible.
2. Fees, settlement currency/account, payout timing, reserves, chargeback handling, refund fees and backup-provider limitations are documented.
3. Merchant legal identity, final price/VAT/import responsibility, shipping promise, stock authority, withdrawal/returns/warranty/privacy/terms and German/English copy are approved.
4. Test-mode checkout covers success, decline, pending, timeout, cancellation, repeated clicks, duplicate/out-of-order webhooks, signature failure, amount/currency mismatch, partial/full refund and reconciliation.
5. 3-D Secure/SCA and provider risk controls are exercised where applicable; no card data or secrets appear in ALSVID logs/database.
6. Order/payment state transitions, idempotency, audit history, stock reservation timing and release-on-failure rules have automated tests.
7. Operations has alerting, support procedures, daily reconciliation, dispute evidence retention and a tested rollback/incident plan.
8. A separate explicit owner approval is recorded before enabling Production payment.

## Consequences

- No Shopify subscription or checkout dependency is required for the initial storefront.
- ALSVID must implement and maintain its own secure cart/order/checkout and customer support lifecycle, increasing responsibility compared with a hosted commerce platform.
- PSP selection is still open. Do not hard-code a vendor or imply Mainland China merchant eligibility before written confirmation.
- This ADR specifies the target and acceptance criteria only. It does not claim that checkout, payment integration, legal compliance or production acceptance is complete.
