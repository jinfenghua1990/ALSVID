import {createR2ObjectStorageFromEnv} from '@alsvid/provider-adapters';
import type {ComparisonStorage} from './comparison-media.js';
export function comparisonStorageFromEnv(env:NodeJS.ProcessEnv=process.env):ComparisonStorage|null{
  const provider=env.OBJECT_STORAGE_PROVIDER?.trim().toLowerCase();
  if(provider!=='r2'&&provider!=='s3-compatible')return null;
  try{return{storage:createR2ObjectStorageFromEnv(env),provider,bucket:env.OBJECT_STORAGE_BUCKET!.trim()};}
  catch{return null;}
}
