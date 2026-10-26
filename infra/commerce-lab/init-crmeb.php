<?php
// Explicit one-shot initializer. Never invoked by the web entrypoint.
if (getenv('CRMEB_INIT_CONFIRM') !== 'initialize-new-crmeb-comparison') {
    throw new RuntimeException('Explicit initialization confirmation is required.');
}
$dsn = getenv('CRMEB_DB_DSN');
if (!$dsn || substr($dsn, 0, 6) !== 'mysql:' || preg_match('/[\r\n]/', $dsn)) {
    throw new RuntimeException('A MySQL DSN is required.');
}
$parts = [];
foreach (explode(';', substr($dsn, 6)) as $part) {
    $pair = explode('=', $part, 2);
    if (count($pair) !== 2 || array_key_exists($pair[0], $parts) ||
        !in_array($pair[0], ['host','port','unix_socket','dbname','charset'], true)) {
        throw new RuntimeException('Invalid or repeated MySQL DSN field.');
    }
    $parts[$pair[0]] = $pair[1];
}
if (($parts['dbname'] ?? '') !== 'crmeb_comparison') {
    throw new RuntimeException('Initializer only accepts the new crmeb_comparison database.');
}
$password = getenv('CRMEB_INITIAL_ADMIN_PASSWORD');
if (!$password || !preg_match('/^[a-zA-Z0-9_-]{24,128}$/D', $password)) {
    throw new RuntimeException('A new high-entropy initial Admin password is required.');
}
$pdo = new PDO($dsn, getenv('CRMEB_DB_USER'), getenv('CRMEB_DB_PASSWORD'), [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
if ($pdo->query('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()')->fetchColumn() != 0) {
    throw new RuntimeException('Refusing to initialize a nonempty database. No reset is supported.');
}
$pdo->exec("SET SESSION sql_mode = ''");
$pdo->exec(file_get_contents('/var/alsvid-runtime/crmeb-install.sql'));
// Same configuration allowlist as the pinned upstream empty installation path.
$keep = ['agent_level','agreement','cache','diy','express','lang_code','lang_country','lang_type',
'member_right','member_ship','out_interface','page_categroy','page_link','shipping_templates',
'shipping_templates_region','system_admin','system_city','system_config','system_config_tab',
'system_event_data','system_file_info','system_group','system_group_data','system_menus',
'system_notification','system_route','system_route_cate','system_timer','system_user_level'];
foreach ($pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $table) {
    if (!preg_match('/^eb_[a-z0-9_]+$/D', $table)) throw new RuntimeException('Unexpected upstream table name.');
    if (!in_array(substr($table, 3), $keep, true)) $pdo->exec('TRUNCATE TABLE `' . $table . '`');
}
$pdo->exec('TRUNCATE TABLE eb_system_admin');
$statement = $pdo->prepare("INSERT INTO eb_system_admin (id,account,head_pic,pwd,real_name,roles,last_ip,last_time,add_time,login_count,level,status,is_del)
 VALUES (1,'alsvid_lab_owner','',?,'ALSVID comparison owner','1','0.0.0.0',0,?,0,0,1,0)");
$statement->execute([password_hash($password, PASSWORD_BCRYPT), time()]);
echo "Initialized a new empty CRMEB comparison database with one owner account.\n";
