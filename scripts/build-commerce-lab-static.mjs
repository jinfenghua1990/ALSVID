import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const upstream=join(root,'external/crmeb/crmeb/public');
const out=join(root,'apps/web/public/commerce-lab-native');
await mkdir(join(out,'runtime/fonts'),{recursive:true});
for(const [source,target] of [
 ['install/js/vue2.6.11.js','runtime/vue.js'],
 ['install/js/element-ui.js','runtime/element-ui.js'],
 ['install/css/theme-chalk.css','runtime/element-ui.css'],
])await copyFile(join(upstream,source),join(out,target));
const fonts=await readdir(join(upstream,'admin/system_static/fonts'));
for(const ext of ['woff','ttf']){
  const name=fonts.find(name=>name.startsWith('element-icons.')&&name.endsWith('.'+ext));
  if(!name)throw new Error('Native Element UI icon font is missing');
  await copyFile(join(upstream,'admin/system_static/fonts',name),join(out,'runtime/fonts/element-icons.'+ext));
}
for(const name of ['index.html','catalog.js','catalog.css'])
  await copyFile(join(root,'external/crmeb/template/admin/src/alsvid',name),join(out,name));
await copyFile(join(root,'external/crmeb/LICENSE'),join(out,'CRMEB-LICENSE.txt'));
console.log('Built CRMEB-derived comparison UI using the imported native Vue/Element UI runtime.');
