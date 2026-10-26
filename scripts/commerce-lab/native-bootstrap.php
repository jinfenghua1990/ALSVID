<?php
// This bootstrap must never accept a target DSN or operate on a persistent database.
if (getenv('GITHUB_ACTIONS') !== 'true' || getenv('CRMEB_NATIVE_CI') !== 'disposable') {
    throw new RuntimeException('Native bootstrap is restricted to disposable GitHub Actions.');
}
$root = realpath(__DIR__ . '/../../.tmp/crmeb-upstream/crmeb');
if (!$root || !is_file($root . '/public/install/crmeb.sql') || !is_file($root . '/vendor/autoload.php')) {
    throw new RuntimeException('Pinned native CRMEB checkout is missing.');
}
$pdo = new PDO('mysql:host=127.0.0.1;port=3307;dbname=crmeb_native_ci;charset=utf8mb4',
    'crmeb_ci', 'ci-only-disposable', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
if (($argv[1] ?? '') === 'rename') {
    $statement = $pdo->prepare('UPDATE eb_store_product SET store_name = ? WHERE id = 910001');
    $statement->execute(['ALSVID FC1 native CI renamed']);
    echo "Renamed the isolated CI fixture.\n";
    exit;
}
if ($pdo->query('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()')->fetchColumn() != 0) {
    throw new RuntimeException('Refusing to import into a nonempty database.');
}
$pdo->exec("SET SESSION sql_mode = ''");
$pdo->exec(file_get_contents($root . '/public/install/crmeb.sql'));
$pdo->exec('UPDATE eb_store_product SET is_show = 0');
$statement = $pdo->prepare('INSERT INTO eb_store_product
    (id, store_name, image, slider_image, price, stock, is_show, is_del, spec_type, custom_form)
    VALUES (?, ?, ?, ?, 0, 5, 1, 0, 0, ?)');
foreach ([[910001, 'ALSVID FC1 native CI'], [910002, 'ALSVID FC2 native CI']] as $item) {
    $statement->execute([$item[0], $item[1], '', '[]', '[]']);
}
// Disable known imported default Admin credentials in this non-public CI instance.
$statement = $pdo->prepare('UPDATE eb_system_admin SET pwd = ?');
$statement->execute([password_hash(bin2hex(random_bytes(32)), PASSWORD_BCRYPT)]);
$config = "APP_DEBUG = false\n[APP]\nDEFAULT_TIMEZONE = UTC\nAPP_KEY = " . bin2hex(random_bytes(24)) .
    "\n[DATABASE]\nTYPE = mysql\nHOSTNAME = 127.0.0.1\nHOSTPORT = 3307\nUSERNAME = crmeb_ci\nPASSWORD = ci-only-disposable\nDATABASE = crmeb_native_ci\nPREFIX = eb_\nCHARSET = utf8mb4\nDEBUG = false" .
    "\n[CACHE]\nDRIVER = file\nCACHE_PREFIX = native_ci_\nCACHE_TAG_PREFIX = native_ci_tag_" .
    "\n[REDIS]\nREDIS_HOSTNAME = 127.0.0.1\nPORT = 6380\nREDIS_PASSWORD = \nSELECT = 0\n[QUEUE]\nQUEUE_NAME = native_ci\n";
file_put_contents($root . '/.env', $config);
file_put_contents($root . '/.constant', "<?php\ndefine('INSTALL_DATE'," . time() . ");\ndefine('SERIALNUMBER','ALSVID_NATIVE_CI');\n");
if (!is_dir($root . '/runtime')) mkdir($root . '/runtime', 0700, true);
touch($root . '/public/install.lock');
echo "Initialized disposable native CRMEB database and two ALSVID fixtures.\n";
