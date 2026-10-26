<?php
function requiredValue($name, $pattern) {
    $value = getenv($name);
    if (!$value || !preg_match($pattern, $value)) {
        throw new RuntimeException('Missing or invalid runtime configuration: ' . $name);
    }
    return $value;
}
$dsn = requiredValue('CRMEB_DB_DSN', '/^mysql:[^\r\n]+$/D');
$user = requiredValue('CRMEB_DB_USER', '/^[a-zA-Z0-9_]{1,32}$/D');
$pass = requiredValue('CRMEB_DB_PASSWORD', '/^[a-zA-Z0-9_-]{24,128}$/D');
$key = requiredValue('CRMEB_APP_KEY', '/^[a-zA-Z0-9_-]{24,128}$/D');
$env = "APP_DEBUG = false\n[APP]\nDEFAULT_TIMEZONE = UTC\nAPP_KEY = " . $key .
    "\n[DATABASE]\nTYPE = mysql\nUSERNAME = " . $user . "\nPASSWORD = " . $pass .
    "\nPREFIX = eb_\nCHARSET = utf8mb4\nDEBUG = false\n[CACHE]\nDRIVER = file\n";
file_put_contents('/var/www/html/.env', $env);
chmod('/var/www/html/.env', 0640);
chown('/var/www/html/.env', 'www-data');
file_put_contents('/var/www/html/.constant', "<?php\ndefine('INSTALL_DATE', 1792969200);\ndefine('SERIALNUMBER','" . substr(hash('sha256', $key), 0, 12) . "');\n");
touch('/var/www/html/public/install.lock');
chdir('/var/www/html');
pcntl_exec('/usr/local/bin/apache2-foreground');
throw new RuntimeException('Unable to start Apache.');
