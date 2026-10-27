import { ProductValidationError } from './errors.js';

export type PublicationStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'WITHDRAWN';
export type PublicationAction = 'SUBMIT' | 'PUBLISH' | 'WITHDRAW';
export type PublicationDraft = {
  titleZh: string; titleDe: string; titleEn: string; evidenceNote: string;
};
export type PublicationRow = {
  model_id: string; model_code: string; product_type_code: string; model_status: string;
  status: PublicationStatus; title_zh: string; title_de: string; title_en: string;
  image_path: string; evidence_note: string; version: number;
  submitted_at: string | null; published_at: string | null; withdrawn_at: string | null;
};
export type PublicCatalogItem = {
  modelId: string; code: string; type: 'BIKE'; image: string;
  title: {zh: string; de: string; en: string};
};

/** Only these two approved website detail routes have an existing bike image contract.
 * Curated artwork remains subject to an explicit media provenance review before publish.
 *
 * This constant is now a FALLBACK FLOOR, not the runtime authority: rows in
 * product.catalog_publish_assets override it (enabled=false removes a model). Keeping
 * the floor means a deployment that lands before its migration still publishes exactly
 * the previously approved artwork instead of silently emptying the public catalogue.
 */
export const approvedCatalogAssets: Readonly<Record<string,string>> = {
  FC1: '/home/original/fc1-product.webp',
  FC2: '/products/fc2/side-studio-1536.webp',
};

export type CatalogPublishAssetRow = { model_code:string; image_path:string; enabled:boolean };

/** Reviewable overrides merged on top of the built-in floor. Pure; never mutates inputs. */
export function mergeCatalogAssets(
  rows: readonly CatalogPublishAssetRow[],
  defaults: Readonly<Record<string,string>> = approvedCatalogAssets,
): Readonly<Record<string,string>> {
  const merged:Record<string,string>={...defaults};
  for(const row of rows){
    if(!row||typeof row.model_code!=='string')continue;
    if(row.enabled)merged[row.model_code]=row.image_path;
    else delete merged[row.model_code];
  }
  return merged;
}

export function curatedCatalogImage(
  modelCode: string,
  modelStatus: string,
  type: string,
  assets: Readonly<Record<string,string>> = approvedCatalogAssets,
): string {
  const image = assets[modelCode];
  if (modelStatus !== 'ACTIVE' || type !== 'BIKE' || !image) {
    throw new ProductValidationError('Only ACTIVE bike models with confirmed detail routes are eligible');
  }
  return image;
}

export function validatePublicationDraft(input: PublicationDraft): PublicationDraft {
  if (!input || typeof input !== 'object') throw new ProductValidationError('Publication draft is required');
  const normalize = (s: unknown, max: number, name: string) => {
    if (typeof s !== 'string' || s.trim().length < 2 || s.trim().length > max) {
      throw new ProductValidationError(name + ' is required and must fit the configured length');
    }
    return s.trim();
  };
  return {
    titleZh:normalize(input.titleZh,120,'Chinese title'),
    titleDe:normalize(input.titleDe,120,'German title'),
    titleEn:normalize(input.titleEn,120,'English title'),
    evidenceNote:normalize(input.evidenceNote,500,'Media and product verification evidence'),
  };
}

export function assertPublicationTransition(current: PublicationStatus, action: PublicationAction): PublicationStatus {
  const next:Record<PublicationAction,Partial<Record<PublicationStatus,PublicationStatus>>> = {
    SUBMIT:{DRAFT:'IN_REVIEW',WITHDRAWN:'IN_REVIEW'},
    PUBLISH:{IN_REVIEW:'PUBLISHED'},
    WITHDRAW:{PUBLISHED:'WITHDRAWN'},
  };
  const result=next[action][current];
  if (!result) throw new ProductValidationError('Invalid publication state transition: '+current+' → '+action);
  return result;
}

export function toPublicCatalogItem(
  row: PublicationRow,
  assets: Readonly<Record<string,string>> = approvedCatalogAssets,
): PublicCatalogItem | null {
  if(row.status!=='PUBLISHED'||row.model_status!=='ACTIVE'||row.product_type_code!=='BIKE'||!assets[row.model_code])return null;
  const image=curatedCatalogImage(row.model_code,row.model_status,row.product_type_code,assets);
  if(row.image_path!==image || !row.title_zh || !row.title_de || !row.title_en)return null;
  return {modelId:row.model_id,code:row.model_code,type:'BIKE',image,
    title:{zh:row.title_zh,de:row.title_de,en:row.title_en}};
}
