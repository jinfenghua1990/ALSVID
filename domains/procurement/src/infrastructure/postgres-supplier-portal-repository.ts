import type { DatabasePort, QueryExecutor } from '@alsvid/database';
import type { SupplierPortalOrder, SupplierPortalRepository, SupplierAcknowledgement } from '../application/supplier-portal-service.js';

type Header={id:string;po_number:string;status:string;version:number;currency:string;issued_at:Date|null;supplier_name:string};
type Line={id:string;line_no:number;line_kind:'PURCHASE'|'GIFT';description:string;ordered_quantity:string;unit:string;requested_date:string|null};
const scopedWhere=`po.supplier_partner_id IN (
 SELECT m.partner_id FROM identity.supplier_memberships m
 JOIN identity.users u ON u.id=m.user_id AND u.status='ACTIVE'
 JOIN partners.partners p ON p.id=m.partner_id AND p.status='ACTIVE'
 JOIN partners.roles r ON r.partner_id=p.id AND r.enabled AND r.role IN ('SUPPLIER','FACTORY')
 WHERE m.user_id=$1 AND m.status='ACTIVE'
)`;
const headerSelect=`SELECT po.id,po.po_number,po.status,po.version,po.currency,po.issued_at,p.display_name AS supplier_name
 FROM procurement.purchase_orders po JOIN partners.partners p ON p.id=po.supplier_partner_id
 WHERE ${scopedWhere} AND po.status <> 'DRAFT'`;
const lineSelect=`SELECT id,line_no,line_kind,description,ordered_quantity::text,unit,requested_date::text AS requested_date
 FROM procurement.purchase_order_lines WHERE purchase_order_id=$1 ORDER BY line_no`;
function iso(value:Date|null){return value?value.toISOString():null}
function mapOrder(h:Header,lines:Line[]):SupplierPortalOrder{
 return {id:h.id,poNumber:h.po_number,status:h.status,version:h.version,currency:h.currency,
  issuedAt:iso(h.issued_at),supplierName:h.supplier_name,
  lines:lines.map(x=>({id:x.id,lineNo:x.line_no,lineKind:x.line_kind,description:x.description,
   orderedQuantity:x.ordered_quantity,unit:x.unit,requestedDate:x.requested_date}))};
}
export class PostgresSupplierPortalRepository implements SupplierPortalRepository {
 constructor(private readonly db:DatabasePort){}
 transaction<T>(run:(e:QueryExecutor)=>Promise<T>):Promise<T>{return this.db.transaction(run);}
 async list(userId:string):Promise<SupplierPortalOrder[]>{
  const r=await this.db.query<Header>(headerSelect+' ORDER BY po.created_at DESC,po.id DESC LIMIT 100',[userId]);
  // Scoped query returns at most 100 POs; line detail is also scoped to these IDs.
  if(!r.rows.length)return [];
  const ids=r.rows.map(x=>x.id);
  const l=await this.db.query<Line & {purchase_order_id:string}>(`SELECT purchase_order_id,id,line_no,line_kind,description,ordered_quantity::text,unit,requested_date::text AS requested_date
   FROM procurement.purchase_order_lines WHERE purchase_order_id=ANY($1::uuid[]) ORDER BY purchase_order_id,line_no`,[ids]);
  return r.rows.map(h=>mapOrder(h,l.rows.filter(x=>x.purchase_order_id===h.id)));
 }
 async order(userId:string,id:string,e:QueryExecutor=this.db,lock=false):Promise<SupplierPortalOrder|null>{
  const r=await e.query<Header>(headerSelect+' AND po.id=$2'+(lock?' FOR UPDATE OF po':'') ,[userId,id]);
  if(!r.rows[0])return null;
  const l=await e.query<Line>(lineSelect,[id]);
  return mapOrder(r.rows[0],l.rows);
 }
 async acknowledgement(poId:string,requestId:string,e:QueryExecutor){
  const r=await e.query<{payload:unknown;confirmation_id:string}>(
    'SELECT payload,confirmation_id FROM procurement.supplier_po_acknowledgements WHERE po_id=$1 AND client_request_id=$2',
    [poId,requestId]);
  return r.rows[0]?{payload:r.rows[0].payload,recordId:r.rows[0].confirmation_id}:null;
 }
 async confirm(po:SupplierPortalOrder,userId:string,_input:SupplierAcknowledgement,
  payload:Record<string,unknown>,e:QueryExecutor){
  const l=payload.lines as Array<{purchaseOrderLineId:string;confirmedQuantity:string;confirmedDate:string|null}>;
  const a=await e.query<{id:string}>(
    'INSERT INTO procurement.supplier_confirmations(purchase_order_id,note,recorded_by) VALUES($1,$2,$3) RETURNING id',
    [po.id,payload.note,userId]);
  const confirmationId=a.rows[0]?.id;
  if(!confirmationId)throw new Error('Supplier confirmation insertion failed');
  for(const line of l){
   await e.query(
    'INSERT INTO procurement.supplier_confirmation_lines(confirmation_id,purchase_order_line_id,confirmed_quantity,confirmed_date,note) VALUES($1,$2,$3,$4,$5)',
    [confirmationId,line.purchaseOrderLineId,line.confirmedQuantity,line.confirmedDate,'']);
  }
  const update=await e.query(
   `UPDATE procurement.purchase_orders SET status='CONFIRMED',confirmed_at=now(),version=version+1,updated_by=$2,updated_at=now()
    WHERE id=$1 AND status='ISSUED' AND version=$3 RETURNING id`,[po.id,userId,po.version]);
  if(update.rowCount!==1)throw new Error('Purchase order changed during confirmation');
  await e.query(`INSERT INTO procurement.supplier_po_acknowledgements
   (po_id,client_request_id,supplier_partner_id,submitted_by,po_version,note,payload,confirmation_id)
   SELECT id,$2,supplier_partner_id,$3,$4,$5,$6::jsonb,$7 FROM procurement.purchase_orders WHERE id=$1`,
   [po.id,payload.clientRequestId,userId,po.version,payload.note,JSON.stringify(payload),confirmationId]);
  return {id:confirmationId,poId:po.id,status:'CONFIRMED'};
 }
}
