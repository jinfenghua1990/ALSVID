export type EntityId = string;

export interface ApiEnvelope<T> {
  data: T;
  requestId?: string;
}

export interface PageInfo {
  cursor?: string;
  hasNextPage: boolean;
}
