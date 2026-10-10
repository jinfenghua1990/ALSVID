# Business Flows

These flows define the operating model the software must support. Screens may change; the business facts and ownership boundaries should remain stable.

## 1. Product release

Platform -> Model -> Variant -> SKU -> BOM Revision -> Build Specification -> Technical Release

A released build specification is immutable. Changes create a new revision.

## 2. Procurement to vehicle birth

Demand / replenishment plan
-> supplier quotation
-> purchase order
-> deposit / payment terms
-> supplier confirmation
-> component/material receipt or factory commitment
-> production order
-> assembly against released build specification
-> QC checks
-> frame number assignment
-> Vehicle birth
-> finished-goods receipt

Vehicle birth must capture enough evidence to reconstruct what was actually built, including build spec/BOM revision and relevant serialized components when required.

## 3. China factory -> Germany warehouse

Finished goods release
-> export shipment plan
-> booking / carrier assignment
-> export documentation
-> China customs/export milestone
-> departure
-> transit milestones
-> EU/Germany import customs
-> duty / import VAT / fee facts
-> Germany warehouse receiving
-> putaway/bin assignment
-> inventory available

The system must keep planned and actual dates distinct and preserve shipment exceptions.

## 4. China factory -> dealer direct

Dealer/commercial demand
-> allocation/reservation
-> production/finished-goods release
-> export shipment
-> customs/import handling
-> dealer delivery
-> dealer receipt
-> vehicle handover/activation

Dealer direct shipping must not require a fake Germany-warehouse receipt.

## 5. Germany warehouse -> dealer

Dealer order/allocation
-> inventory reservation
-> pick
-> pack
-> dispatch
-> delivery
-> dealer receipt
-> dealer inventory / handover availability

## 6. Commerce, Shopify, WMS and customer-visible status

Shopify remains the external commerce/order authority for storefront order operations. WMS remains the external warehouse execution authority for receiving, picking, packing, dispatch and warehouse-side fulfillment facts.

ALSVID does not copy the complete Shopify or WMS databases. It stores only the business facts needed for Vehicle 360, customer/dealer views, warranty, service, after-sales and operational reconciliation, such as external order references, customer/SKU links, purchase and delivery dates, fulfillment status, carrier/tracking references and Vehicle/VIN associations.

The default synchronization model is intentionally not real-time:

- ALSVID performs a scheduled synchronization/reconciliation at least once per day.
- Customer and staff pages normally read the latest successfully cached ALSVID facts rather than querying Shopify/WMS on every page load.
- My ALSVID / after-sales pages provide an explicit **Refresh latest status** action.
- When the user requests a refresh, ALSVID queries the relevant Shopify and/or WMS connector, refreshes only the facts needed for that view, and updates the local cache.
- The UI shows the **last successful update time** and an **estimated refresh time** so the customer understands data freshness.
- Manual refresh is rate-limited with a short cooldown to avoid repeated external requests.
- Real-time webhooks are an optional future optimization only when a real business need justifies the added complexity.

Provider IDs remain external identifiers, never internal primary keys. API ingestion and refresh operations must be idempotent.

## 7. Finance

Commercial/procurement document
-> payable/receivable obligation
-> invoice evidence
-> payment
-> allocation
-> remaining open amount
-> settlement/close

A payment can allocate to multiple obligations and an obligation can be settled by multiple payments. Prepayments and partial payments are first-class.

Landed cost can include product cost, freight, insurance, customs duty, anti-dumping/countervailing measures if applicable, import VAT treatment and operational fees. Accounting/tax representation must remain explicit rather than hidden inside one total.

## 8. Vehicle ownership and My ALSVID

Vehicle birth
-> channel/dealer allocation
-> customer handover/claim
-> ownership record
-> My ALSVID garage
-> warranty/service lifecycle

My ALSVID is the customer-facing vehicle/service surface. It may show the latest cached purchase summary, fulfillment/tracking status, warranty state, service cases, repair history and replacement-shipment information linked to the customer's Vehicle/VIN. The customer can request a status refresh from this surface when newer Shopify/WMS information is needed.

Ownership transfers append history; they do not mutate away the previous owner period.

## 9. Warranty and service

Customer/dealer reports issue
-> ServiceCase
-> eligibility/warranty evaluation
-> diagnosis
-> parts/labor decision
-> repair/replacement action
-> cost attribution
-> closure
-> vehicle service history

Customer-facing after-sales views show the current ALSVID service state and the last successful external-data update time. When a repair or replacement depends on Shopify/WMS fulfillment data, the customer can request a refresh instead of ALSVID maintaining a permanent real-time synchronization channel.

## 10. Communication and marketing

Inbound/outbound provider message
-> normalized thread/message
-> Partner/customer/dealer association
-> attachment metadata/R2 object
-> optional AI summary/draft
-> human approval for outbound action where policy requires

Marketing send additionally requires auditable consent and suppression checks before dispatch. Unsubscribe/suppression overrides segmentation.
