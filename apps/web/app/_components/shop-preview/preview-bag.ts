export const previewBagKey = 'alsvid-independent-shop-preview-v1';
export type PreviewModel = 'fc1' | 'fc2';
export type PreviewVersion = 'standard' | 'pro' | 'pending';
export type PreviewLine = { model: PreviewModel; version: PreviewVersion; quantity: number };
export function parsePreviewBag(raw: string | null): PreviewLine[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]');
    if (!Array.isArray(value) || value.length > 3) return [];
    const lines: PreviewLine[] = [];
    for (const entry of value) {
      if (!entry || typeof entry !== 'object') return [];
      const { model, version, quantity } = entry;
      if (!(model === 'fc1' && (version === 'standard' || version === 'pro') || model === 'fc2' && version === 'pending')
        || !Number.isInteger(quantity) || quantity < 1 || quantity > 9
        || lines.some(line => line.model === model && line.version === version)) return [];
      lines.push({ model, version, quantity });
    }
    return lines;
  } catch { return []; }
}
