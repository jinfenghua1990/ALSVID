# ALSVID Data Ownership

One business fact has one authoritative owner inside ALSVID.

| Fact | Owner | Notes |
|---|---|---|
| User / Role / Permission / Session | Identity | Shared access authority for all ALSVID entrances |
| Partner identity | Partners | Customer, dealer, supplier, factory and service-provider roles attach to one identity |
| Product / SKU | Catalog | Operational product identity |
| FC/FT/CT/GT model / Variant | Product Engineering | ALSVID engineering extension of Product/SKU |
| Part / BOM / released BOM revision | Product Engineering | Released revisions are versioned engineering truth |
| Binary asset metadata | Assets | Object key, hash, mime, visibility and ownership metadata; bytes live in R2 |
| Supplier PO / receipt | Supply Chain | ALSVID procurement truth |
| Inventory movement / balance | Inventory | Append-oriented movement is authoritative; balance is derived |
| Vehicle / frame number | Vehicle | Sole physical bicycle identity |
| Vehicle birth/build snapshot | Vehicle | Immutable historical evidence captured at factory lifecycle |
| Vehicle lifecycle event | Vehicle | Append-only chronological lifecycle authority |
| Dealer authorization/profile | Dealer | Attaches to canonical Partner |
| Dealer custody / handover | Vehicle + Dealer workflow | Relationship/history on the canonical Vehicle |
| Customer ownership relationship | Vehicle + Partners | Current owner is derived/maintained from canonical lifecycle facts |
| Marketing consent evidence | Customer | Append-only consent/withdrawal evidence |
| Warranty | After-sales | Canonical warranty authority for a Vehicle |
| ServiceCase / service history | After-sales | Canonical service authority attached to Vehicle |
| Shopify external order ID | Integrations mapping | Mapping/reference only; never internal primary key |
| ALSVID invoice/payment/finance fact | Finance | Only facts owned by ALSVID business operations |

## Identity rules

A Dealer or Customer portal must not create a second dealer/customer master. Portal membership points to the same canonical Partner/Vehicle facts used by internal administration.

## Vehicle rules

A Vehicle is created from factory/production evidence and survives dealer transfer, retail sale, customer activation, service, ownership transfer and recall. None of those experiences may create another Vehicle for the same physical bicycle.

## External systems

Shopify and future logistics/payment/tax providers store their identifiers as mappings or references. They never become ALSVID primary keys.

1688 and 吉客云/JackYun are not ALSVID integrations and must not appear in runtime ownership rules.
