# Data Ownership

Every business fact has exactly one write authority.

| Fact | Owning domain | Notes |
|---|---|---|
| User, role, permission, session | Identity | authentication/authorization truth |
| Legal/person/business identity | Partners | shared master; roles reference Partner |
| Supplier/factory role | Partners | capability/profile, not duplicate master |
| Dealer role | Dealer + Partners | Partner owns identity; Dealer owns dealer-specific policy/state |
| Customer role/profile | Customer + Partners | Partner owns identity; Customer owns customer-specific state |
| Platform/model/variant/SKU | Product | commercial product identity |
| Part/BOM/build specification | Engineering | released technical truth |
| Supplier quote/PO/receipt commitment | Procurement | ALSVID procurement truth |
| Production order/assembly/QC | Production | factory execution truth |
| Vehicle birth/frame number/lifecycle | Vehicle | one physical bicycle = one Vehicle |
| Inventory movement/reservation | Inventory | append-only movement ledger is quantity truth |
| Bin/putaway/stocktake/pick-pack | Warehouse | physical warehouse execution |
| Export shipment/customs/milestone | Logistics | transport/import/export execution truth |
| External channel/order mapping | Commerce | Shopify/external fact mapping, not generic OMS replacement |
| Invoice/payable/receivable | Finance | financial document/obligation truth |
| Payment/allocation/settlement | Finance | payment and allocation are separate facts |
| Vehicle ownership | Vehicle | immutable ownership history; Customer consumes view |
| Warranty/service case/repair | Service | after-sales execution truth |
| Communication thread/message metadata | Communication | provider-neutral normalized truth |
| Marketing consent/suppression | Marketing | auditable legal/operational consent truth |
| Binary object metadata | Assets | R2/S3 object metadata and relationships |
| Provider sync cursor/webhook receipt | Integrations | synchronization control plane |
| Security/business audit event | Audit | append-only evidence |

## External systems

- Shopify: external commerce/OMS. ALSVID stores normalized mappings/facts and reconciliation state.
- Email provider: transport mailbox/service. ALSVID stores normalized communication state and marketing evidence.
- R2/S3: binary object store only; not business metadata authority.
- Carriers/customs/payment providers: external execution sources normalized through Integrations.
- 1688 and JackYun/吉客云: intentionally outside ALSVID; they belong to the separate domestic CoffeeBear boundary.
