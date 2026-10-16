# Supplier Portal

status: active
owner: ALSVID
last_reviewed: 2026-10-16

状态说明：供应商自助的目标边界已确认，门户尚未交付。

Supplier 默认指向 ALSVID 供货的上游企业。外部成员可以自助提交报价/供货或订单提案、确认本组织 PO 与交期、报告进度、发货并提交文件/发票。正式采购批准、收货/QC、财务入账及付款继续遵循 ALSVID/外部执行系统的授权流程；自助提交不等于自动获批。

最终 UI 归 Figma；内部供应商管理/审批归 Ardot Admin。主体复用 Partners，单据复用 Procurement 等领域，通过组织成员范围访问，不直接开放内部全局采购 API。

同一企业也向 ALSVID 买货时，另有 Dealer/Shopify B2B Buyer 关系，业务方向与权限分开。未知 MOQ、价格、账期及审批细则保持待确认，不作对外承诺。

执行与验收：[门户实施台账](../../docs/PORTAL_DELIVERY_PLAN_2026-10-16.md)、[Issue #185](https://github.com/jinfenghua1990/ALSVID/issues/185)。
