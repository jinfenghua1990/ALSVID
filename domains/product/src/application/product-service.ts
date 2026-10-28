import { ForbiddenError } from '@alsvid/kernel';
import { postgresErrorCode } from '@alsvid/database';
import { ProductConflictError, ProductNotFoundError, ProductValidationError } from '../core/errors.js';
import { ProductCapability, type HomepageBinding, type HomepageBindingMode, type HomepageSlotCode, type ModelFieldDefinition, type CustomFieldType, type CustomFieldValue, type ProductCatalog, type ProductEntityKind, type ProductStatus, type ProductTypeCode } from '../core/model.js';
import { normalizeProductCode, normalizeProductCountry } from '../core/normalization.js';
import {approvedCatalogAssets,mergeCatalogAssets,assertPublicationTransition,curatedCatalogImage,toPublicCatalogItem,validatePublicationDraft,type PublicationAction,type PublicationDraft} from '../core/publication.js';
import type { ProductActor, ProductAuditPort, ProductRepository } from './ports.js';

export class ProductService {
  constructor(private readonly repository: ProductRepository, private readonly audit: ProductAuditPort) {}

  async catalog(actor: ProductActor): Promise<ProductCatalog> {
    requireCapability(actor, ProductCapability.Read);
    return this.repository.catalog();
  }

  async homepageBindings(actor: ProductActor): Promise<HomepageBinding[]> {
    requireCapability(actor, ProductCapability.Read);
    return this.repository.homepageBindings();
  }

  /** Public projection contains only the validated internal model ID and fixed code; no inventory, price or sale status. */
  async publicHomepageBindings(): Promise<Array<{slot: HomepageSlotCode; modelId: string | null; modelCode: string | null}>> {
    const bindings = await this.repository.homepageBindings();
    return bindings.map(row => ({slot:row.slot_code,modelId:row.resolved_model_id,modelCode:row.resolved_model_code}));
  }

  async setHomepageBinding(actor: ProductActor, input: {slot: HomepageSlotCode; mode: HomepageBindingMode; modelId?: string | null; expectedVersion: number}): Promise<HomepageBinding> {
    requireCapability(actor, ProductCapability.Write);
    if (!['FC1_HERO','FC1_FEATURED','FC2_LAUNCH'].includes(input.slot)) throw new ProductValidationError('Unknown homepage slot');
    if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) throw new ProductValidationError('Expected binding version');
    if (input.mode !== 'AUTO' && input.mode !== 'MANUAL') throw new ProductValidationError('Unknown binding mode');
    const modelId = input.mode === 'MANUAL' ? input.modelId : null;
    if (input.mode === 'MANUAL') {
      if (!modelId || !await this.repository.modelForHomepageSlot(input.slot, modelId)) {
        throw new ProductValidationError('Selected model does not match this homepage slot or is not ACTIVE');
      }
    } else if (input.modelId) {
      throw new ProductValidationError('AUTO mode cannot specify a manual model');
    }
    const updated = await this.repository.updateHomepageBinding({slot:input.slot,mode:input.mode,modelId:modelId ?? null,
      expectedVersion:input.expectedVersion,actorUserId:actor.userId});
    if (!updated) {
      if (!await this.repository.homepageBindingExists(input.slot)) throw new ProductNotFoundError('Homepage slot not found');
      throw new ProductConflictError('Homepage binding changed; reload before saving');
    }
    await this.audit.record({actorUserId:actor.userId,action:'product.homepage_binding_updated',targetType:'product.homepage_slot',
      targetId:input.slot,metadata:{mode:input.mode,modelId:modelId ?? null}});
    return updated;
  }

  async publications(actor:ProductActor) {
    requireCapability(actor,ProductCapability.Read);
    return this.repository.publications();
  }

  /** Read-only view of the effective catalogue artwork allowlist (floor merged with overrides). */
  async catalogPublishAssets(actor:ProductActor) {
    requireCapability(actor,ProductCapability.Read);
    const assets=await this.effectiveCatalogAssets();
    return Object.entries(assets)
      .map(([modelCode,imagePath])=>({modelCode,imagePath}))
      .sort((left,right)=>left.modelCode.localeCompare(right.modelCode));
  }

  /** No authentication is necessary: repository and projection expose ONLY approved public fields. */
  async publishedCatalog() {
    const [rows,suppressedCodes,assets]=await Promise.all([
      this.repository.publishedPublications(),this.repository.suppressedPublishedCodes(),
      this.effectiveCatalogAssets(),
    ]);
    return {items:rows.map(row=>toPublicCatalogItem(row,assets)).filter((item):item is NonNullable<typeof item>=>item!==null),
      suppressedCodes};
  }

  /**
   * Reviewed artwork overrides merged over the built-in floor. A failure to read the
   * override table must never empty the public catalogue, so the built-in floor wins.
   */
  private async effectiveCatalogAssets():Promise<Readonly<Record<string,string>>> {
    try{return mergeCatalogAssets(await this.repository.catalogPublishAssets());}
    catch{return approvedCatalogAssets;}
  }

  async startPublication(actor:ProductActor,modelId:string) {
    requireCapability(actor,ProductCapability.Write);
    const created=await this.repository.createPublication(modelId,actor.userId);
    if(!created){
      if(await this.repository.publication(modelId))throw new ProductConflictError('Publication already exists; reload');
      throw new ProductValidationError('Only ACTIVE bike models with reviewed catalogue artwork can be prepared for publication');
    }
    await this.audit.record({actorUserId:actor.userId,action:'product.catalog_draft_created',
      targetType:'product.model',targetId:modelId});
    return created;
  }

  async savePublicationDraft(actor:ProductActor,modelId:string,input:PublicationDraft & {expectedVersion:number}) {
    requireCapability(actor,ProductCapability.Write);
    if(!Number.isInteger(input.expectedVersion)||input.expectedVersion<1)
      throw new ProductValidationError('expectedVersion is required');
    const existing=await this.repository.publication(modelId);
    if(!existing)throw new ProductNotFoundError('Publication draft does not exist');
    if(!['DRAFT','WITHDRAWN'].includes(existing.status))
      throw new ProductValidationError('Published or under-review content must first be withdrawn/rejected');
    const body=validatePublicationDraft(input);
    const assets=await this.effectiveCatalogAssets();
    const imagePath=curatedCatalogImage(existing.model_code,existing.model_status,existing.product_type_code,assets);
    const saved=await this.repository.savePublication(modelId,input.expectedVersion,body,imagePath,actor.userId);
    if(!saved)throw new ProductConflictError('Publication draft was updated; reload before saving');
    await this.audit.record({actorUserId:actor.userId,action:'product.catalog_draft_updated',
      targetType:'product.model',targetId:modelId});
    return saved;
  }

  async transitionPublication(actor:ProductActor,modelId:string,
    input:{action:PublicationAction;expectedVersion:number}) {
    if(!input||!['SUBMIT','PUBLISH','WITHDRAW'].includes(input.action))
      throw new ProductValidationError('Unknown publication action');
    requireCapability(actor,input.action==='SUBMIT'?ProductCapability.Write:ProductCapability.Publish);
    if(!Number.isInteger(input.expectedVersion)||input.expectedVersion<1)
      throw new ProductValidationError('expectedVersion is required');
    const existing=await this.repository.publication(modelId);
    if(!existing)throw new ProductNotFoundError('Publication draft not found');
    const next=assertPublicationTransition(existing.status,input.action);
    if(input.action!=='WITHDRAW') {
      const assets=await this.effectiveCatalogAssets();
      const expectedImage=curatedCatalogImage(existing.model_code,existing.model_status,existing.product_type_code,assets);
      validatePublicationDraft({
        titleZh:existing.title_zh,titleDe:existing.title_de,
        titleEn:existing.title_en,evidenceNote:existing.evidence_note,
      });
      if(existing.image_path!==expectedImage)
        throw new ProductValidationError('Catalogue image does not match reviewed model artwork');
    }
    const updated=await this.repository.transitionPublication(modelId,input.expectedVersion,existing.status,next,actor.userId);
    if(!updated)throw new ProductConflictError('Publication changed or model was disabled; reload');
    await this.audit.record({actorUserId:actor.userId,
      action:'product.catalog_'+input.action.toLowerCase(),targetType:'product.model',
      targetId:modelId,metadata:{from:existing.status,to:next}});
    return updated;
  }

  /** Technical platform identity is user-owned. Codes never change after creation. */
  async createPlatform(actor: ProductActor, input: { code: string; name: string; description?: string }) {
    requireCapability(actor, ProductCapability.Write);
    if (!input || typeof input.code !== 'string') throw new ProductValidationError('Platform code is required');
    const code = normalizeProductCode(input.code);
    const name = requirePlatformName(input.name);
    const description = normalizePlatformDescription(input.description);
    try {
      const row = await this.repository.createPlatform({ code, name, description, actorUserId: actor.userId });
      await this.audit.record({ actorUserId: actor.userId, action: 'product.platform_created',
        targetType: 'product.platform', targetId: row.id, metadata: { code } });
      return row;
    } catch (error) {
      mapCreateError(error, 'Platform code already exists', 'Platform creator not found');
    }
  }

  async updatePlatform(actor: ProductActor, id: string, input: {
    expectedVersion: number; name?: string; description?: string; status?: ProductStatus;
  }) {
    requireCapability(actor, ProductCapability.Write);
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id)) throw new ProductValidationError('Invalid platform ID');
    if (!input || !Number.isInteger(input.expectedVersion) || input.expectedVersion < 1)
      throw new ProductValidationError('expectedVersion is required');
    if (input.status !== undefined && !['DRAFT', 'ACTIVE', 'RETIRED'].includes(input.status))
      throw new ProductValidationError('Unsupported platform status');
    if (input.name === undefined && input.description === undefined && input.status === undefined)
      throw new ProductValidationError('No platform changes supplied');
    const row = await this.repository.updatePlatform({
      id, expectedVersion: input.expectedVersion,
      name: input.name === undefined ? null : requirePlatformName(input.name),
      status: input.status ?? null,
      descriptionProvided: input.description !== undefined,
      description: normalizePlatformDescription(input.description),
      actorUserId: actor.userId,
    });
    if (!row) {
      if (!await this.repository.platformExists(id)) throw new ProductNotFoundError('Platform not found');
      if (input.status === 'RETIRED' && await this.repository.platformHasUnretiredModels(id))
        throw new ProductValidationError('Retire or reassign linked bike models before archiving this platform');
      throw new ProductConflictError('Platform changed since it was loaded; reload before saving');
    }
    await this.audit.record({ actorUserId: actor.userId, action: 'product.platform_updated',
      targetType: 'product.platform', targetId: row.id,
      metadata: { status: row.status, version: row.version } });
    return row;
  }

  async createModelField(actor: ProductActor, input: {
    productTypeCode: ProductTypeCode; code: string; label: string;
    fieldType: CustomFieldType; options?: string[]; required?: boolean;
  }): Promise<ModelFieldDefinition> {
    requireCapability(actor, ProductCapability.Write);
    if (!input || !['BIKE','ACCESSORY','SERVICE_PART'].includes(input.productTypeCode))
      throw new ProductValidationError('Invalid product type for custom field');
    if (typeof input.code !== 'string') throw new ProductValidationError('Field code is required');
    const code = normalizeProductCode(input.code);
    const label = normalizeFieldLabel(input.label);
    if (!['TEXT','NUMBER','BOOLEAN','SELECT'].includes(input.fieldType))
      throw new ProductValidationError('Unsupported custom field type');
    const options = normalizeFieldOptions(input.fieldType,input.options);
    if (input.required !== undefined && typeof input.required !== 'boolean')
      throw new ProductValidationError('Field required flag must be boolean');
    try {
      const row = await this.repository.createModelField({
        productTypeCode: input.productTypeCode,code,label,fieldType:input.fieldType,
        options,required:input.required??false,actorUserId:actor.userId,
      });
      await this.audit.record({actorUserId:actor.userId,action:'product.model_field_created',
        targetType:'product.model_field',targetId:row.id,metadata:{code,productTypeCode:input.productTypeCode}});
      return row;
    } catch(error) {
      mapCreateError(error, 'Custom field code already exists for this product type', 'Product type not found');
    }
  }

  async updateModelField(actor: ProductActor,id:string,input:{
    expectedVersion:number;label?:string;status?:'ACTIVE'|'RETIRED';required?:boolean;
  }):Promise<ModelFieldDefinition> {
    requireCapability(actor, ProductCapability.Write);
    if (!input || !Number.isInteger(input.expectedVersion) || input.expectedVersion<1)
      throw new ProductValidationError('expectedVersion is required');
    if (input.status!==undefined && !['ACTIVE','RETIRED'].includes(input.status))
      throw new ProductValidationError('Invalid custom field status');
    if (input.required!==undefined && typeof input.required!=='boolean')
      throw new ProductValidationError('Required must be boolean');
    if (input.label===undefined && input.status===undefined && input.required===undefined)
      throw new ProductValidationError('No custom field changes supplied');
    const row=await this.repository.updateModelField({
      id,expectedVersion:input.expectedVersion,label:input.label===undefined?null:normalizeFieldLabel(input.label),
      status:input.status??null,required:input.required??null,actorUserId:actor.userId,
    });
    if (!row) {
      if (!await this.repository.modelFieldExists(id)) throw new ProductNotFoundError('Custom field not found');
      throw new ProductConflictError('Custom field changed; reload before saving');
    }
    await this.audit.record({actorUserId:actor.userId,action:'product.model_field_updated',
      targetType:'product.model_field',targetId:row.id,metadata:{version:row.version,status:row.status}});
    return row;
  }

  async createModel(actor: ProductActor, input: { platformId?: string | null; productTypeCode?: ProductTypeCode; code: string; name: string; description?: string; customFields?: Record<string,unknown> }): Promise<any> {
    requireCapability(actor, ProductCapability.Write);
    const code = normalizeProductCode(input.code);
    const productTypeCode = input.productTypeCode ?? 'BIKE';
    if (!['BIKE','ACCESSORY','SERVICE_PART'].includes(productTypeCode)) throw new ProductValidationError('Unsupported product type');
    if (productTypeCode === 'BIKE' && !input.platformId) throw new ProductValidationError('Bicycle requires technical platform');
    if (productTypeCode !== 'BIKE' && input.platformId) throw new ProductValidationError('Accessory/service part cannot use a bicycle platform');
    if (!input.name?.trim()) throw new ProductValidationError('Model name is required');
    const customFields = validateModelFields(await this.repository.modelFieldDefinitions(),
      productTypeCode,input.customFields ?? {},{});
    try {
      const row = await this.repository.createModel({ platformId: productTypeCode === 'BIKE' ? input.platformId! : null, productTypeCode, code, name: input.name.trim(), description: input.description?.trim() ?? '', customFields, actorUserId: actor.userId });
      if (!row) throw new ProductValidationError('Selected technical platform is missing or not active');
      await this.audit.record({ actorUserId: actor.userId, action: 'product.model_created', targetType: 'product.model', targetId: row.id, metadata: { code } });
      return row;
    } catch (error) {
      mapCreateError(error, 'Model code already exists', 'Platform not found');
    }
  }

  async createVariant(actor: ProductActor, input: { modelId: string; code: string; name: string; description?: string; attributes?: Record<string, unknown> }): Promise<any> {
    requireCapability(actor, ProductCapability.Write);
    const code = normalizeProductCode(input.code);
    if (!input.name?.trim()) throw new ProductValidationError('Variant name is required');
    validateProductAttributes(input.attributes);
    try {
      const row = await this.repository.createVariant({ modelId: input.modelId, code, name: input.name.trim(), description: input.description?.trim() ?? '', attributes: input.attributes ?? {}, actorUserId: actor.userId });
      await this.audit.record({ actorUserId: actor.userId, action: 'product.variant_created', targetType: 'product.variant', targetId: row.id, metadata: { code } });
      return row;
    } catch (error) {
      mapCreateError(error, 'Variant code already exists for this model', 'Model not found');
    }
  }

  async createSku(actor: ProductActor, input: { variantId: string; sku: string; name: string; marketCode?: string; colorCode?: string; sizeCode?: string; attributes?: Record<string, unknown> }): Promise<any> {
    requireCapability(actor, ProductCapability.Write);
    const sku = normalizeProductCode(input.sku);
    if (!input.name?.trim()) throw new ProductValidationError('SKU name is required');
    validateProductAttributes(input.attributes);
    try {
      const row = await this.repository.createSku({
        variantId: input.variantId,
        sku,
        name: input.name.trim(),
        marketCode: normalizeProductCountry(input.marketCode),
        colorCode: input.colorCode?.trim() || null,
        sizeCode: input.sizeCode?.trim() || null,
        attributes: input.attributes ?? {},
        actorUserId: actor.userId,
      });
      await this.audit.record({ actorUserId: actor.userId, action: 'product.sku_created', targetType: 'product.sku', targetId: row.id, metadata: { sku } });
      return row;
    } catch (error) {
      mapCreateError(error, 'SKU already exists', 'Variant not found');
    }
  }

  async updateEntity(actor: ProductActor, entity: ProductEntityKind, id: string, input: { expectedVersion: number; name?: string; description?: string; status?: ProductStatus; marketCode?: string | null; colorCode?: string | null; sizeCode?: string | null; customFields?: Record<string,unknown> }): Promise<any> {
    requireCapability(actor, ProductCapability.Write);
    let customFields:Record<string,CustomFieldValue>={};
    if (input.customFields!==undefined) {
      if (entity!=='model')throw new ProductValidationError('Custom model fields belong only to model records');
      const target=await this.repository.modelFieldTarget(id);
      if (!target)throw new ProductNotFoundError('Model not found');
      customFields=validateModelFields(await this.repository.modelFieldDefinitions(),
        target.product_type_code,input.customFields,target.custom_fields);
    }
    if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) throw new ProductValidationError('expectedVersion is required');
    const row = await this.repository.update({
      entity,
      id,
      expectedVersion: input.expectedVersion,
      name: input.name?.trim() || null,
      status: input.status ?? null,
      descriptionProvided: input.description !== undefined,
      description: input.description?.trim() ?? '',
      marketCodeProvided: input.marketCode !== undefined,
      marketCode: normalizeProductCountry(input.marketCode),
      colorCodeProvided: input.colorCode !== undefined,
      colorCode: input.colorCode?.trim() || null,
      sizeCodeProvided: input.sizeCode !== undefined,
      sizeCode: input.sizeCode?.trim() || null,
      customFieldsProvided: input.customFields!==undefined,
      customFields,
      actorUserId: actor.userId,
    });
    if (!row) {
      if (!await this.repository.exists(entity, id)) throw new ProductNotFoundError(`${entity} not found`);
      throw new ProductConflictError(`${entity} changed since it was loaded`);
    }
    await this.audit.record({ actorUserId: actor.userId, action: `product.${entity}_updated`, targetType: `product.${entity}`, targetId: id });
    return row;
  }
}

function normalizeFieldLabel(label:unknown):string {
  if(typeof label!=='string'||!label.trim()||label.trim().length>120)
    throw new ProductValidationError('Field label must be 1-120 characters');
  return label.trim();
}
function normalizeFieldOptions(type:CustomFieldType,value:unknown):string[] {
  if(type!=='SELECT'){
    if(value!==undefined && (!Array.isArray(value)||value.length>0))
      throw new ProductValidationError('Only SELECT fields may provide choices');
    return [];
  }
  if(!Array.isArray(value)||value.length<1||value.length>30||
    value.some(x=>typeof x!=='string'||!x.trim()||x.trim().length>80))
    throw new ProductValidationError('SELECT requires 1-30 short options');
  const normalized=value.map(x=>(x as string).trim());
  if(new Set(normalized).size!==normalized.length)
    throw new ProductValidationError('SELECT choices must be unique');
  return normalized;
}
/** Full active-key replacement; do not lose retired field values used by historic records. */
function validateModelFields(definitions:ModelFieldDefinition[],productTypeCode:ProductTypeCode,
  incoming:unknown,existing:Record<string,CustomFieldValue>):Record<string,CustomFieldValue> {
  if(!incoming||typeof incoming!=='object'||Array.isArray(incoming))
    throw new ProductValidationError('Custom fields must be an object');
  const active=definitions.filter(def=>def.product_type_code===productTypeCode&&def.status==='ACTIVE');
  const allowed=new Map(active.map(def=>[def.code,def]));
  const result={...existing};
  for(const def of active)delete result[def.code];
  for(const [code,value] of Object.entries(incoming)) {
    const def=allowed.get(code);
    if(!def)throw new ProductValidationError('Unknown or inactive custom field: '+code);
    if(value===null||value===''||value===undefined)continue;
    if(def.field_type==='TEXT') {
      if(typeof value!=='string'||value.trim().length>500)
        throw new ProductValidationError(def.label+' requires text of at most 500 characters');
      result[code]=value.trim();
    }else if(def.field_type==='NUMBER') {
      if(typeof value!=='number'||!Number.isFinite(value))
        throw new ProductValidationError(def.label+' must be a finite number');
      result[code]=value;
    }else if(def.field_type==='BOOLEAN') {
      if(typeof value!=='boolean')throw new ProductValidationError(def.label+' must be yes or no');
      result[code]=value;
    }else if(def.field_type==='SELECT') {
      if(typeof value!=='string'||!def.options.includes(value))
        throw new ProductValidationError(def.label+' must match a configured option');
      result[code]=value;
    }
  }
  for(const def of active) if(def.required && result[def.code]===undefined)
    throw new ProductValidationError('Required custom field is missing: '+def.label);
  return result;
}

function requirePlatformName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 160)
    throw new ProductValidationError('Platform name must be 1–160 characters');
  return value.trim();
}

function normalizePlatformDescription(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' || value.trim().length > 2000)
    throw new ProductValidationError('Platform description must be at most 2000 characters');
  return value.trim();
}

function requireCapability(actor: ProductActor, capability: string): void {
  if (!actor.permissions.includes(capability)) throw new ForbiddenError('PRODUCT_FORBIDDEN', `Missing permission: ${capability}`);
}

function mapCreateError(error: unknown, duplicateMessage: string, parentMessage: string): never {
  const code = postgresErrorCode(error);
  if (code === '23505') throw new ProductConflictError(duplicateMessage);
  if (code === '23503') throw new ProductNotFoundError(parentMessage);
  throw error;
}

/** Reject malformed client JSON before it reaches the repository JSONB adapter. */
function validateProductAttributes(value: unknown): void {
  if (value === undefined) return;
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ProductValidationError('Product attributes must be a JSON object');
  }
}
