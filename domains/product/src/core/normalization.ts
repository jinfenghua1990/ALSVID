import { ProductValidationError } from './errors.js';

export function normalizeProductCode(value: string): string {
  const code = value.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{0,31}$/.test(code)) throw new ProductValidationError('Code must use A-Z, 0-9, _ or -');
  return code;
}

export function normalizeProductCountry(value?: string | null): string | null {
  if (!value) return null;
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) throw new ProductValidationError('marketCode must be ISO alpha-2');
  return code;
}
