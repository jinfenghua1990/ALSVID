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

## 6. Commerce and Shopify

Shopify remains external OMS/channel truth for storefront order operations. ALSVID records normalized channel/order facts and maps order lines/fulfillment to ALSVID SKU, inventory, shipment, dealer/customer and finance facts.

Webhook/API ingestion must be idempotent. Provider IDs are external identifiers, never internal primary keys.

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

## 10. Communication and marketing

Inbound/outbound provider message
-> normalized thread/message
-> Partner/customer/dealer association
-> attachment metadata/R2 object
-> optional AI summary/draft
-> human approval for outbound action where policy requires

Marketing send additionally requires auditable consent and suppression checks before dispatch. Unsubscribe/suppression overrides segmentation.
