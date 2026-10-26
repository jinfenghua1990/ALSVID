# syntax=docker/dockerfile:1
# Candidate comparison runtime only. Upstream CRMEB currently requires PHP 7.4.
FROM php:7.4-apache-bullseye
RUN apt-get update \
 && apt-get install -y --no-install-recommends libcurl4-openssl-dev libonig-dev libpng-dev libjpeg62-turbo-dev libfreetype6-dev libzip-dev \
 && docker-php-ext-configure gd --with-freetype --with-jpeg \
 && docker-php-ext-install -j2 pdo_mysql mysqli pcntl bcmath mbstring curl gd zip \
 && a2enmod rewrite headers \
 && rm -rf /var/lib/apt/lists/*
COPY crmeb/ /var/www/html/
COPY LICENSE /opt/alsvid/CRMEB-LICENSE
COPY --from=deployment apache.conf /etc/apache2/sites-available/000-default.conf
COPY --from=deployment prepare-runtime.php entrypoint.php init-crmeb.php /opt/alsvid/
RUN php /opt/alsvid/prepare-runtime.php \
 && sed -i 's/Listen 80/Listen 8080/' /etc/apache2/ports.conf \
 && printf 'expose_php=Off\ndisplay_errors=Off\nlog_errors=On\nerror_log=/proc/self/fd/2\n' > /usr/local/etc/php/conf.d/alsvid.ini \
 && mkdir -p /var/www/html/runtime /var/www/html/public/uploads \
 && chown -R www-data:www-data /var/www/html/runtime /var/www/html/public/uploads
EXPOSE 8080
ENTRYPOINT ["php", "/opt/alsvid/entrypoint.php"]
