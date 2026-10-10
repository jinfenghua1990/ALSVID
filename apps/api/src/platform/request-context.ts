import { AsyncLocalStorage } from 'node:async_hooks';

export interface ApiRequestContext {
  requestId: string;
  correlationId: string;
  method: string;
  url: string;
}

export const apiRequestContextStore = new AsyncLocalStorage<ApiRequestContext>();

export function currentApiRequestContext(): ApiRequestContext | undefined {
  return apiRequestContextStore.getStore();
}
