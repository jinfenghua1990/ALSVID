import assert from 'node:assert/strict';
import test from 'node:test';
import { ProcurementValidationError } from './index.js';

// Domain behavior that does not need persistence is intentionally small; state/immutability invariants are database integration-tested.
test('invalid construction surfaces explicit validation errors', () => {
  const error = new ProcurementValidationError('example');
  assert.equal(error.message, 'example');
  assert.equal(error instanceof Error, true);
});


test('receipt ownership and over-quantity database failures become validation errors', async () => {
  const { ProcurementService } = await import('./application/procurement-service.js');
  const { ProcurementCapability } = await import('./core/model.js');
  const cases = [
    {
      kind: 'PHYSICAL_RECEIPT' as const,
      databaseMessage: 'Receipt line must belong to the same purchase order',
      expectedMessage: 'Every receipt line must belong to the selected purchase order',
    },
    {
      kind: 'PHYSICAL_RECEIPT' as const,
      databaseMessage: 'Physical receipt quantity exceeds ordered quantity',
      expectedMessage: 'Physical receipt quantity exceeds the remaining ordered quantity for this line',
    },
    {
      kind: 'FACTORY_COMMITMENT' as const,
      databaseMessage: 'Factory commitment quantity exceeds ordered quantity',
      expectedMessage: 'Factory commitment quantity exceeds the remaining ordered quantity for this line',
    },
  ];

  for (const item of cases) {
    const repository = {
      transaction: async (work: (executor: unknown) => Promise<unknown>) => work({}),
      lockPurchaseOrder: async () => ({ id: 'po-1', status: 'CONFIRMED' }),
      createReceipt: async () => 'receipt-1',
      insertReceiptLine: async () => { throw new Error(item.databaseMessage); },
    } as unknown as import('./application/ports.js').ProcurementRepository;
    const audit = { record: async () => undefined } as unknown as import('./application/ports.js').ProcurementAuditPort;
    const service = new ProcurementService(repository, audit);

    await assert.rejects(
      service.recordReceipt(
        { userId: 'user-1', permissions: [ProcurementCapability.Receive] },
        'po-1',
        {
          kind: item.kind,
          occurredOn: '2026-10-23',
          lines: [{ purchaseOrderLineId: 'line-1', quantity: 1 }],
        },
      ),
      (error: unknown) => error instanceof ProcurementValidationError && error.message === item.expectedMessage,
    );
  }
});


test('supplier gift PO line must be zero priced, and uses the ordinary audited PO flow',async()=>{
 const {ProcurementService}=await import('./application/procurement-service.js');
 const actor={userId:'user-1',permissions:['procurement.write']};
 const captured: Array<import('./core/model.js').ProcurementLineInput>=[];
 const actions:string[]=[];
 const repository={
  transaction:async(work:(e:unknown)=>Promise<unknown>)=>work({}),
  createPurchaseOrderHeader:async()=> 'po-1',
  insertPurchaseOrderLine:async(_id:string,_no:number,line:import('./core/model.js').ProcurementLineInput)=>{captured.push(line);},
  findPurchaseOrder:async()=>({id:'po-1'}),
 } as unknown as import('./application/ports.js').ProcurementRepository;
 const service=new ProcurementService(repository,{record:async(e)=>{actions.push(e.action);}});
 const baseLine={itemType:'PART' as const,itemId:'part-1',quantity:2,unit:'EA'};
 await assert.rejects(()=>service.createPurchaseOrder(actor,{supplierPartnerId:'supplier-1',currency:'EUR',
   lines:[{...baseLine,lineKind:'GIFT',unitPrice:1}]}),/zero purchase price/);
 assert.equal(captured.length,0);
 await service.createPurchaseOrder(actor,{supplierPartnerId:'supplier-1',currency:'EUR',
   lines:[{...baseLine,lineKind:'PURCHASE',unitPrice:20},{...baseLine,lineKind:'GIFT',unitPrice:0}]});
 assert.deepEqual(captured.map(line=>[line.lineKind,line.unitPrice]),[['PURCHASE','20'],['GIFT','0']]);
 assert.deepEqual(actions,['procurement.po_created']);
});
