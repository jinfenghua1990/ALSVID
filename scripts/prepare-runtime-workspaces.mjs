import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const roots = ['packages', 'domains'];

function runtimeExport(value) {
  if (typeof value === 'string') {
    if (value.startsWith('./src/') && value.endsWith('.ts')) {
      return value.replace('./src/', './dist/').replace(/\.ts$/, '.js');
    }
    return value;
  }

  if (Array.isArray(value)) return value.map(runtimeExport);

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, runtimeExport(nested)]));
  }

  return value;
}

for (const root of roots) {
  for (const entry of await readdir(root)) {
    const directory = path.join(root, entry);
    if (!(await stat(directory)).isDirectory()) continue;

    const manifestPath = path.join(directory, 'package.json');
    let manifest;
    try {
      manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    } catch (error) {
      if (error?.code === 'ENOENT') continue;
      throw error;
    }

    if (!manifest.exports) continue;
    const rewritten = runtimeExport(manifest.exports);
    if (JSON.stringify(rewritten) === JSON.stringify(manifest.exports)) continue;

    manifest.exports = rewritten;
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Prepared runtime exports: ${manifest.name ?? manifestPath}`);
  }
}
