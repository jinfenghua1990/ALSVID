import type { DatabasePort, QueryExecutor } from '@alsvid/database';
import { ComparisonCatalogService, type ComparisonCatalogRepository } from '../application/comparison-catalog.js';
import type { CommerceAuditPort } from '../application/ports.js';
import type { ComparisonCatalogProduct,ComparisonCreateInput,ComparisonUpdateInput,ComparisonListQuery,ComparisonProductPage } from '../core/comparison-catalog.js';
interface Row {
  [key:string]:unknown;
  id:string;code:string;title:ComparisonCatalogProduct['title'];description:ComparisonCatalogProduct['description'];
  reference_image:ComparisonCatalogProduct['referenceImage'];proposed_price_minor:number|null;
  cover_asset_id:string|null;currency:'EUR';status:ComparisonCatalogProduct['status'];version:number;created_at:Date;updated_at:Date;
}
function product(row:Row):ComparisonCatalogProduct {
  return {id:row.id,code:row.code,title:row.title,description:row.description,referenceImage:row.reference_image,
    proposedPriceMinor:row.proposed_price_minor,currency:row.currency,status:row.status,version:row.version,
    createdAt:row.created_at.toISOString(),updatedAt:row.updated_at.toISOString(),hasCustomImage:Boolean(row.cover_asset_id)};
}
class PostgresComparisonCatalogRepository implements ComparisonCatalogRepository {
  constructor(private readonly database:DatabasePort) {}
  transaction<T>(work:(e:QueryExecutor)=>Promise<T>):Promise<T>{return this.database.transaction(work);}
  async list(query:ComparisonListQuery,publishedOnly:boolean):Promise<ComparisonProductPage> {
    const where=publishedOnly ? "status='PUBLISHED' AND " : '';
    const search='%'+query.query+'%';
    const filter=where+"(code ILIKE $1 OR title->>'zh' ILIKE $1 OR title->>'de' ILIKE $1 OR title->>'en' ILIKE $1)";
    const rows=await this.database.query<Row>('SELECT * FROM commerce_lab.catalog_products WHERE '+filter+
      ' ORDER BY created_at DESC,id LIMIT $2 OFFSET $3',[search,query.limit,(query.page-1)*query.limit]);
    const count=await this.database.query<{count:string}>('SELECT count(*)::text AS count FROM commerce_lab.catalog_products WHERE '+filter,[search]);
    return {items:rows.rows.map(product),total:Number(count.rows[0]!.count),page:query.page,limit:query.limit};
  }
  async get(id:string,publishedOnly:boolean):Promise<ComparisonCatalogProduct|null> {
    const result=await this.database.query<Row>('SELECT * FROM commerce_lab.catalog_products WHERE id=$1'+
      (publishedOnly?" AND status='PUBLISHED'":''),[id]);
    return result.rows[0]?product(result.rows[0]):null;
  }
  async imageReference(id:string,publishedOnly:boolean):Promise<{assetId:string;version:number}|null>{
    const result=await this.database.query<{cover_asset_id:string;version:number}>(
      "SELECT cover_asset_id,version FROM commerce_lab.catalog_products WHERE id=$1 AND cover_asset_id IS NOT NULL"+
      (publishedOnly?" AND status='PUBLISHED'":""),[id]);
    return result.rows[0]?{assetId:result.rows[0].cover_asset_id,version:result.rows[0].version}:null;
  }
  async updateImage(id:string,expectedVersion:number,assetId:string|null,actor:string,e:QueryExecutor):Promise<ComparisonCatalogProduct|null>{
    const result=await e.query<Row>("UPDATE commerce_lab.catalog_products SET cover_asset_id=$3,version=version+1,updated_by=$4,updated_at=now() WHERE id=$1 AND version=$2 RETURNING *",
      [id,expectedVersion,assetId,actor]);
    return result.rows[0]?product(result.rows[0]):null;
  }
  async create(input:ComparisonCreateInput,actor:string,e:QueryExecutor):Promise<ComparisonCatalogProduct> {
    const result=await e.query<Row>(`INSERT INTO commerce_lab.catalog_products
      (code,title,description,reference_image,proposed_price_minor,created_by,updated_by)
      VALUES($1,$2::jsonb,$3::jsonb,$4,$5,$6,$6) RETURNING *`,
      [input.code,JSON.stringify(input.title),JSON.stringify(input.description),input.referenceImage,input.proposedPriceMinor,actor]);
    return product(result.rows[0]!);
  }
  async update(id:string,input:ComparisonUpdateInput,actor:string,e:QueryExecutor):Promise<ComparisonCatalogProduct|null> {
    const result=await e.query<Row>(`UPDATE commerce_lab.catalog_products SET title=$3::jsonb,description=$4::jsonb,
      reference_image=$5,proposed_price_minor=$6,status=$7,version=version+1,updated_by=$8,updated_at=now()
      WHERE id=$1 AND version=$2 RETURNING *`,
      [id,input.expectedVersion,JSON.stringify(input.title),JSON.stringify(input.description),input.referenceImage,input.proposedPriceMinor,input.status,actor]);
    return result.rows[0]?product(result.rows[0]):null;
  }
}
export function createComparisonCatalogService(database:DatabasePort,audit:CommerceAuditPort):ComparisonCatalogService {
  return new ComparisonCatalogService(new PostgresComparisonCatalogRepository(database),audit);
}
