import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { readCrmebCatalog } from '../../apps/web/app/_experiments/commerce-lab/crmeb-catalog.ts';
assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.CRMEB_NATIVE_CI, 'disposable');
const image = 'alsvid-crmeb-runtime-ci';
const container = 'alsvid-crmeb-runtime-ci';
const php = code => execFileSync('docker', ['exec', container, 'php', '-r', code], { stdio: 'pipe' });
const db = "$pdo=new PDO(getenv('CRMEB_DB_DSN'),getenv('CRMEB_DB_USER'),getenv('CRMEB_DB_PASSWORD'),[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);";
const read = () => readCrmebCatalog({ CRMEB_LAB_ORIGIN: 'https://crmeb-container-ci.alsvidbike.com' }, (url, options) => {
  assert.equal(url.origin, 'https://crmeb-container-ci.alsvidbike.com');
  return fetch('http://127.0.0.1:8080' + url.pathname + url.search, options);
});
const empty = await read();
assert.equal(empty.state, 'connected'); assert.deepEqual(empty.products, []);
php(db + "foreach(['eb_user','eb_store_order','eb_store_product'] as $t){if($pdo->query('SELECT COUNT(*) FROM '.$t)->fetchColumn()!=0)exit(1);} if($pdo->query('SELECT COUNT(*) FROM eb_system_admin')->fetchColumn()!=1)exit(2);");
php(db + "$pdo->exec(\"INSERT INTO eb_store_product(id,store_name,image,slider_image,price,stock,is_show,is_del,spec_type,custom_form) VALUES(910001,'ALSVID FC1 container CI','','[]',0,5,1,0,0,'[]')\");");
const before = await read();
assert.equal(before.state, 'connected');
assert.deepEqual(before.products, [{ id: 'crmeb-910001', title: 'ALSVID FC1 container CI' }]);
php(db + "$pdo->exec(\"UPDATE eb_store_product SET store_name='ALSVID FC1 container CI renamed' WHERE id=910001\");");
const after = await read();
assert.equal(after.state, 'connected');
assert.deepEqual(after.products, [{ id: 'crmeb-910001', title: 'ALSVID FC1 container CI renamed' }]);
for (const path of ['/api/crontab/run', '/api/pay/notify/test', '/install/index.php']) {
  assert.equal((await fetch('http://127.0.0.1:8080' + path)).status, 403, path);
}
assert.equal((await fetch('http://127.0.0.1:8080/api/cart/add', { method: 'POST' })).status, 403);
const admin = await fetch('http://127.0.0.1:8080/admin/index.html');
assert.equal(admin.status, 200);
assert.match(await admin.text(), /<html|<!doctype/i);
php("if(file_exists('/var/www/html/public/install/index.php'))exit(1);if(!is_file('/opt/alsvid/CRMEB-LICENSE'))exit(2);");
const retry = spawnSync('docker', ['exec',
  '-e', 'CRMEB_INIT_CONFIRM=initialize-new-crmeb-comparison',
  '-e', 'CRMEB_INITIAL_ADMIN_PASSWORD=ci-only-initial-admin-password-123456',
  container, 'php', '/opt/alsvid/init-crmeb.php'], { encoding: 'utf8' });
assert.notEqual(retry.status, 0); assert.match(retry.stderr + retry.stdout, /nonempty database/);
await mkdir('.tmp/crmeb-native-evidence', { recursive: true });
await writeFile('.tmp/crmeb-native-evidence/container-report.json', JSON.stringify({
  appCommit: process.env.APP_COMMIT, upstreamCommit: 'da8d3b93400f3c660aa54d38b54ada387c963cd9',
  empty, before, after, nativeFpmNginxContainers: true, adminHtml: true,
  emptyInitialization: true, defaultDemoCustomersOrdersProductsRemoved: true, reinitializationRejected: true,
  blocked: ['web installer', 'public consumer POST', 'public scheduled tasks', 'payment callbacks'],
  liveDeployment: false,
}, null, 2));
console.log('Packaged native container: clean initialization, catalog rename, reset refusal and closed mutations verified.');
