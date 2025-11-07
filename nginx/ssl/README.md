# 📜 Инструкция по получению SSL сертификата

## Метод 1: Let's Encrypt (бесплатно, рекомендуется)

### Шаг 1: Подготовка

```bash
# Убедитесь, что домен stroyka.asia указывает на ваш сервер
# Проверить: dig stroyka.asia +short

# Запустить Nginx без SSL (только HTTP на порту 80)
cd /Users/kairatkhidirboev/Projects/checksite
docker compose up -d nginx
```

### Шаг 2: Установка certbot в контейнер

```bash
# Войти в контейнер Nginx
docker exec -it checksite_nginx sh

# Установить certbot (только certbot, без certbot-nginx для Alpine)
apk add certbot

# Генерация DH параметров (занимает 1-5 минут)
openssl dhparam -out /etc/nginx/ssl/dhparam.pem 2048
```

### Шаг 3: Получение сертификата

```bash
# Внутри контейнера nginx
certbot certonly --webroot \
  -w /var/www/certbot \
  -d stroyka.asia \
  -d www.stroyka.asia \
  --email admin@stroyka.asia \
  --agree-tos \
  --non-interactive

# Сертификаты будут сохранены в:
# /etc/letsencrypt/live/stroyka.asia/fullchain.pem
# /etc/letsencrypt/live/stroyka.asia/privkey.pem
```

### Шаг 4: Копирование сертификатов

```bash
# Внутри контейнера nginx
cp /etc/letsencrypt/live/stroyka.asia/fullchain.pem /etc/nginx/ssl/stroyka.asia.crt
cp /etc/letsencrypt/live/stroyka.asia/privkey.pem /etc/nginx/ssl/stroyka.asia.key

# Проверка прав
chmod 644 /etc/nginx/ssl/stroyka.asia.crt
chmod 600 /etc/nginx/ssl/stroyka.asia.key

# Выход из контейнера
exit
```

### Шаг 5: Включение SSL конфигурации

```bash
# Переименовать конфигурацию (или временно отключить старую)
cd /Users/kairatkhidirboev/Projects/checksite/nginx/conf.d
mv default.conf default.conf.bak

# ssl.conf уже создан, Nginx автоматически подхватит его

# Перезагрузить Nginx
docker exec checksite_nginx nginx -t  # Проверка конфигурации
docker exec checksite_nginx nginx -s reload
```

### Шаг 6: Проверка

```bash
# Проверить SSL сертификат
curl -I https://stroyka.asia

# Должно вернуть 200 OK с заголовком Strict-Transport-Security
```

---

## Метод 2: Cloudflare Origin Certificate (если используете Cloudflare)

### Шаг 1: Создание сертификата в Cloudflare

1. Войти в панель Cloudflare → SSL/TLS → Origin Server
2. Нажать "Create Certificate"
3. Выбрать:
   - Hostnames: `*.stroyka.asia, stroyka.asia`
   - Validity: 15 years
   - Key Type: RSA 2048

### Шаг 2: Сохранение сертификата

```bash
# На сервере
cd /Users/kairatkhidirboev/Projects/checksite/nginx/ssl

# Сохранить Origin Certificate
cat > stroyka.asia.crt << 'EOF'
-----BEGIN CERTIFICATE-----
[скопировать из Cloudflare]
-----END CERTIFICATE-----
EOF

# Сохранить Private Key
cat > stroyka.asia.key << 'EOF'
-----BEGIN PRIVATE KEY-----
[скопировать из Cloudflare]
-----END PRIVATE KEY-----
EOF

# Генерация DH параметров
openssl dhparam -out dhparam.pem 2048

# Установить права
chmod 644 stroyka.asia.crt
chmod 600 stroyka.asia.key
chmod 644 dhparam.pem
```

### Шаг 3: Настройка Cloudflare

1. SSL/TLS → Overview → SSL/TLS encryption mode: **Full (strict)**
2. SSL/TLS → Edge Certificates:
   - ✅ Always Use HTTPS
   - ✅ HTTP Strict Transport Security (HSTS)
   - ✅ Minimum TLS Version: 1.2

### Шаг 4: Применение конфигурации

```bash
# Переименовать старую конфигурацию
cd /Users/kairatkhidirboev/Projects/checksite/nginx/conf.d
mv default.conf default.conf.bak

# Перезагрузить Nginx
docker exec checksite_nginx nginx -t
docker exec checksite_nginx nginx -s reload
```

---

## Автоматическое обновление сертификата (для Let's Encrypt)

### Вариант A: Через cron на host

```bash
# Создать скрипт обновления
cat > /opt/checksite/renew-ssl.sh << 'EOF'
#!/bin/bash
docker exec checksite_nginx certbot renew --quiet

if [ $? -eq 0 ]; then
    docker exec checksite_nginx cp /etc/letsencrypt/live/stroyka.asia/fullchain.pem /etc/nginx/ssl/stroyka.asia.crt
    docker exec checksite_nginx cp /etc/letsencrypt/live/stroyka.asia/privkey.pem /etc/nginx/ssl/stroyka.asia.key
    docker exec checksite_nginx nginx -s reload
    echo "$(date): SSL certificate renewed" >> /var/log/ssl-renewal.log
fi
EOF

chmod +x /opt/checksite/renew-ssl.sh

# Добавить в crontab (каждый день в 3:00)
crontab -e
# Добавить строку:
0 3 * * * /opt/checksite/renew-ssl.sh
```

### Вариант B: Через Docker Compose (рекомендуется)

Обновить `docker-compose.yml` - добавить certbot контейнер (см. основной файл).

---

## Проверка безопасности

После настройки проверить SSL на:
- https://www.ssllabs.com/ssltest/analyze.html?d=stroyka.asia
- https://securityheaders.com/?q=https://stroyka.asia

Ожидаемый результат: **A+ рейтинг**

---

## Отладка

### Ошибка: "Connection refused"
```bash
# Проверить, что Nginx слушает 443 порт
docker exec checksite_nginx netstat -tulpn | grep 443
```

### Ошибка: "SSL certificate problem"
```bash
# Проверить сертификат
openssl x509 -in /Users/kairatkhidirboev/Projects/checksite/nginx/ssl/stroyka.asia.crt -text -noout

# Проверить приватный ключ
openssl rsa -in /Users/kairatkhidirboev/Projects/checksite/nginx/ssl/stroyka.asia.key -check
```

### Ошибка: "nginx: [emerg] cannot load certificate"
```bash
# Проверить права
docker exec checksite_nginx ls -la /etc/nginx/ssl/
# Должно быть: 644 для .crt, 600 для .key
```
