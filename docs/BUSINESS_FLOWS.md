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

## 6. ALSVID storefront, payment provider, WMS and customer-visible status

ALSVID Commerce owns the order lifecycle for purchases created on the ALSVID consumer storefront. The customer-facing flow is product/variant selection → cart → checkout review → payment attempt → verified payment result → order confirmation/status. No real checkout or payment is enabled in the current preview phase.

A contracted PSP performs payment authentication and processing. Finance keeps payment attempts, refunds, allocations and settlement facts separate from the Commerce order state. A browser redirect or client-side success message is never sufficient proof of payment. Provider events must have a verified signature, valid order/amount/currency binding, event idempotency and replay protection before they change payment/order state. Duplicate submissions or uncertain provider results must not create a second charge; check the original transaction before offering another attempt.

WMS remains authoritative for physical stock and warehouse execution (receiving, picking, packing, dispatch and warehouse-side fulfillment). ALSVID storefront order records do not replace WMS inventory/fulfillment execution or create a general-purpose OMS.

Customer-facing purchase terms must clearly state the legal seller, selected model/variant, final total and applicable taxes/shipping, delivery estimate and uncertainty, payment obligation, cancellation/withdrawal rights, refund process, privacy information and support contact before the customer commits. German/Austrian legal copy and the checkout button must be reviewed before launch; disclaimers cannot remove mandatory consumer rights.

Current phase: preview only. No PSP is selected or connected, no live card collection exists, and the site must not claim that an order has been placed or payment received. Live checkout remains blocked until the acceptance checklist in [ADR 0005](adr/0005-alsvid-owned-storefront-and-third-party-payments.md) is passed.

Optional external-channel integrations may be reconciled only after an explicit owner decision. Provider IDs remain external identifiers, never internal primary keys. All provider event ingestion must be idempotent.

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
