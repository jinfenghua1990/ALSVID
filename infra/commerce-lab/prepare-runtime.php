<?php
// Packaging bridge only; upstream business code and copyright notices stay intact.
$root = '/var/www/html';
$path = $root . '/config/database.php';
$config = file_get_contents($path);
$needle = "'dsn'             => '',";
if (substr_count($config, $needle) !== 1) {
    throw new RuntimeException('Pinned upstream DSN configuration changed; review required.');
}
file_put_contents($path, str_replace($needle, "'dsn'             => getenv('CRMEB_DB_DSN') ?: '',", $config));
rename($root . '/public/install/crmeb.sql', '/opt/alsvid/crmeb-install.sql');
// Web installation is not available; initialization is an explicit empty-DB job.
$iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root . '/public/install', FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
foreach ($iterator as $item) {
    $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
}
rmdir($root . '/public/install');
if (file_exists($root . '/.env') || file_exists($root . '/public/install.lock')) {
    throw new RuntimeException('Build context must exclude environment configuration and installation state.');
}
