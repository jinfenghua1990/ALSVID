/** Read-only search within authorized Product and first-party Commerce snapshots. */
export type AdminSearchCatalog = {
  models: readonly {id: string; code: string; name: string}[];
  skus: readonly {id: string; sku: string; name: string}[];
};
export type AdminSearchOrder = {
  orderNumber: string;
  customerEmail: string;
  lines: readonly {skuCode: string; skuName: string}[];
};
export type AdminBusinessSearchResult = {
  type: 'model' | 'sku' | 'order';
  key: string;
  title: string;
  subtitle: string;
  href: string;
};
const contains = (query: string, ...fields: readonly string[]) =>
  fields.some(field => field.toLocaleLowerCase().includes(query));

export function searchAuthorizedBusinessRecords(
  catalog: AdminSearchCatalog | null,
  orders: readonly AdminSearchOrder[] | null,
  query: string,
): AdminBusinessSearchResult[] {
  const term = query.trim().toLocaleLowerCase().slice(0,100);
  if (term.length < 2) return [];
  const results: AdminBusinessSearchResult[] = [];
  if (catalog) {
    for (const model of catalog.models.filter(item => contains(term,item.code,item.name)).slice(0,8)) {
      results.push({type:'model',key:'model:'+model.id,title:model.code,subtitle:model.name,
        href:'/admin/product?search='+encodeURIComponent(model.code)+'#model-register'});
    }
    for (const sku of catalog.skus.filter(item => contains(term,item.sku,item.name)).slice(0,8)) {
      results.push({type:'sku',key:'sku:'+sku.id,title:sku.sku,subtitle:sku.name,
        href:'/admin/product?search='+encodeURIComponent(sku.sku)+'#model-register'});
    }
  }
  if (orders) {
    for (const order of orders.filter(item => contains(term,item.orderNumber,item.customerEmail,
      ...item.lines.flatMap(line => [line.skuCode,line.skuName]))).slice(0,8)) {
      results.push({type:'order',key:'order:'+order.orderNumber,title:order.orderNumber,
        subtitle:'ALSVID 自建商城订单',
        href:'/admin/orders?orderSearch='+encodeURIComponent(order.orderNumber)+'#b2c'});
    }
  }
  return results;
}
