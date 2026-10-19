# Data Ownership

Every business fact has exactly one write authority.

| Fact | Owning domain | Notes |
|---|---|---|
| User, role, permission, session | Identity | authentication/authorization truth |
| External identity binding / organization membership | Identity with Partners/Dealer/Customer contracts | verified provider subject and ALSVID business scope; matching email alone grants no membership |
| Legal/person/business identity | Partners | shared master; roles reference Partner |
| Supplier/factory role | Partners | capability/profile, not duplicate master |
| Dealer role | Dealer + Partners | Partner owns identity; Dealer owns dealer-specific policy/state |
| Customer role/profile | Customer + Partners | Partner owns identity; Customer owns customer-specific state |
| Platform/model/variant/SKU | Product | commercial product identity |
| Part/BOM/build specification | Engineering | released technical truth |
| Supplier quote/PO/receipt commitment | Procurement | ALSVID procurement truth |
| Supplier proposal / PO acknowledgment / delivery-date change | Procurement | supplier submits within its membership scope; ALSVID authorizes PO issue and material commercial changes |
| Production order/assembly/QC | Production | factory execution truth |
| Vehicle birth/frame number/lifecycle | Vehicle | one physical bicycle = one Vehicle |
| Inventory movement/reservation | Inventory | append-only movement ledger is quantity truth |
| Bin/putaway/stocktake/pick-pack | Warehouse | physical warehouse execution |
| Export shipment/customs/milestone | Logistics | transport/import/export execution truth |
| Storefront product selection/cart/checkout/order | Commerce | ALSVID first-party B2C storefront authority; not a general-purpose OMS |
| Optional external channel/order mapping | Commerce + Integrations | external references and reconciliation only; never dual-write ALSVID storefront orders |
| Invoice/payable/receivable | Finance | financial document/obligation truth |
| Payment attempt/verified status/refund/allocation/settlement | Finance | PSP executes external payment; payment, order and settlement states remain separate facts |
| Vehicle ownership | Vehicle | immutable ownership history; Customer consumes view |
| Warranty/service case/repair | Service | after-sales execution truth |
| Communication thread/message metadata | Communication | provider-neutral normalized truth |
| Marketing consent/suppression | Marketing | auditable legal/operational consent truth |
| Binary object metadata | Assets | R2/S3 object metadata and relationships |
| Provider sync cursor/webhook receipt | Integrations | synchronization control plane |
| Security/business audit event | Audit | append-only evidence |

## External systems

- Payment service provider (PSP): external payment authentication/processing, transaction identifiers and provider-generated payment events. ALSVID verifies signatures and transaction binding before recording state; card PAN/CVV are never stored by ALSVID.
- Optional future sales channels (including Shopify): external systems only when explicitly approved; ALSVID records required mappings and reconciles without dual-write authority for ALSVID-owned storefront orders.
- Email provider: transport mailbox/service. ALSVID stores normalized communication state and marketing evidence.
- R2/S3: binary object store only; not business metadata authority.
- Carriers/customs/payment providers: external execution sources normalized through Integrations.
- 1688 and JackYun/吉客云: intentionally outside ALSVID; they belong to the separate domestic CoffeeBear boundary.

Supplier shipment/progress reports and invoice uploads are submitted evidence, not warehouse receipt, QC acceptance, payable approval or payment execution. Those changes enter the owning domain's authorized workflow; external WMS execution is reconciled as external facts rather than re-executed independently. See [portal action matrix](PORTAL_DELIVERY_PLAN_2026-10-16.md#4-supplier-自助的明确含义).
