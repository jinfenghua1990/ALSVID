# syntax=docker/dockerfile:1
# Use the native PHP runtime published by CRMEB, retaining its runtime contract.
FROM ccr.ccs.tencentyun.com/crmebky_php/php:v7.4
COPY crmeb/ /var/www/html/
COPY LICENSE /opt/alsvid/CRMEB-LICENSE
COPY --from=deployment prepare-runtime.php entrypoint.php init-crmeb.php php-fpm.conf /opt/alsvid/
RUN php -r 'foreach(["pdo_mysql","bcmath","mbstring","curl","gd","zip","pcntl"] as $extension){if(!extension_loaded($extension)){fwrite(STDERR,"Missing native runtime extension: ".$extension.PHP_EOL);exit(1);}}' \
 && php /opt/alsvid/prepare-runtime.php \
 && mkdir -p /var/www/html/runtime /var/www/html/public/uploads \
 && chown -R www-data:www-data /var/www/html/runtime /var/www/html/public/uploads
EXPOSE 9000
ENTRYPOINT ["php", "/opt/alsvid/entrypoint.php"]
