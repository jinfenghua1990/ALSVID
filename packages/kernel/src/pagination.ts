export interface PageRequest {
  limit: number;
  cursor: string | null;
}

export interface PageResult<T> {
  items: T[];
  nextCursor: string | null;
}

export function normalizePageLimit(value: number | undefined, defaults = { initial: 50, max: 200 }): number {
  const candidate = value ?? defaults.initial;
  if (!Number.isInteger(candidate) || candidate < 1) throw new Error('Page limit must be a positive integer');
  return Math.min(candidate, defaults.max);
}
