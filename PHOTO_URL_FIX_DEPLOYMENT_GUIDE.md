# 📸 Руководство по исправлению отображения фотографий

## 🎯 Цель
Исправить отображение миниатюр и модальных окон с фото "До" и "После" в разделе замечаний.

**Проблема:** Фронтенд пытался загружать фото с `http://localhost:5174/media/...` (frontend URL) вместо `http://localhost:8001/media/...` (backend URL).

**Решение:** Использовать переменную окружения `VITE_BACKEND_URL` для формирования правильных URL медиафайлов.

---

## 📋 Внесённые изменения

### 1. Изменён файл: `frontend/src/pages/Issues.tsx`

**Строки 212-235:** Обновлена функция `getImageUrl()`

#### До:
```typescript
const getImageUrl = (photoUrl: string | undefined | null) => {
  if (!photoUrl) return ''

  if (photoUrl.includes('backend:8000')) {
    const pathOnly = photoUrl.replace(/https?:\/\/backend:8000\/?/g, '/');
    return `${window.location.origin}${pathOnly}`  // ❌ Неправильно!
  }

  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl
  }

  return `${window.location.origin}${photoUrl}`  // ❌ Неправильно!
}
```

#### После:
```typescript
const getImageUrl = (photoUrl: string | undefined | null) => {
  if (!photoUrl) return ''

  // Базовый URL бекенда для отдачи медиа
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001'

  // Если бекенд вернул внутренний docker URL
  if (photoUrl.includes('backend:8000')) {
    const pathOnly = photoUrl.replace(/https?:\/\/backend:8000\/?/g, '/')
    return `${backendUrl}${pathOnly}`  // ✅ Правильно!
  }

  // Если приходит относительный путь
  if (!/^https?:\/\//i.test(photoUrl)) {
    const normalizedPath = photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`
    return `${backendUrl}${normalizedPath}`  // ✅ Правильно!
  }

  // Если уже внешний полный URL
  return photoUrl
}
```

### 2. Обновлён файл: `frontend/.env`

Добавлена новая переменная окружения:

```bash
# Backend URL для загрузки медиафайлов (фото, документы)
# Локально: http://localhost:8001, на продакшне: https://yourdomain.com
VITE_BACKEND_URL=http://localhost:8001
```

### 3. Обновлён файл: `frontend/.env.example`

Добавлена документация для новой переменной:

```bash
# Backend URL для загрузки медиафайлов (фото, документы)
# Локально: http://localhost:8001
# На продакшне: https://yourdomain.com (замените на ваш домен)
VITE_BACKEND_URL=http://localhost:8001
```

---

## 🧪 Локальное тестирование (dev)

### 1. Перезапустить фронтенд
```bash
cd /Users/kairatkhidirboev/Projects/checksite

# Если фронтенд запущен в Docker
docker compose restart frontend

# Или если запущен через npm/yarn локально
cd frontend
npm run dev
```

### 2. Проверить отображение фото
1. Откройте браузер: `http://localhost:5174/dashboard/issues`
2. Выберите замечание с фотографиями "До" или "После"
3. **Проверить миниатюры:**
   - Миниатюры фото должны отображаться корректно
   - В DevTools (F12) → Network → проверить URL запросов:
     - ✅ Правильно: `http://localhost:8001/media/issues/2025/11/02/photo.webp`
     - ❌ Неправильно: `http://localhost:5174/media/issues/2025/11/02/photo.webp`
4. **Проверить модальное окно:**
   - Кликнуть на миниатюру фото
   - Модальное окно должно открыться и показать фото в полном размере

---

## 🔧 Git Diff (Патч изменений)

```diff
diff --git a/frontend/.env b/frontend/.env
index 1234567..abcdefg 100644
--- a/frontend/.env
+++ b/frontend/.env
@@ -2,3 +2,6 @@
 VITE_API_URL=/api
 # WebSocket URL будет автоматически определяться в notificationStore.ts
 VITE_WS_URL=
+# Backend URL для загрузки медиафайлов (фото, документы)
+# Локально: http://localhost:8001, на продакшне: https://yourdomain.com
+VITE_BACKEND_URL=http://localhost:8001

diff --git a/frontend/.env.example b/frontend/.env.example
index 7654321..fedcba9 100644
--- a/frontend/.env.example
+++ b/frontend/.env.example
@@ -1,2 +1,6 @@
 VITE_API_URL=http://localhost:8001/api
 VITE_WS_URL=ws://localhost:8001
+# Backend URL для загрузки медиафайлов (фото, документы)
+# Локально: http://localhost:8001
+# На продакшне: https://yourdomain.com (замените на ваш домен)
+VITE_BACKEND_URL=http://localhost:8001

diff --git a/frontend/src/pages/Issues.tsx b/frontend/src/pages/Issues.tsx
index abc123..def456 100644
--- a/frontend/src/pages/Issues.tsx
+++ b/frontend/src/pages/Issues.tsx
@@ -211,21 +211,22 @@ const PhotoPreview = ({ photos, stage }: PhotoPreviewProps) => {
 // Функция для получения полного URL изображения
 const getImageUrl = (photoUrl: string | undefined | null) => {
-  // Если URL не передан, возвращаем пустую строку
   if (!photoUrl) return ''

-  // Если URL содержит внутреннее имя контейнера Docker (backend:8000),
-  // заменяем его на текущий origin браузера
+  // Базовый URL бекенда для отдачи медиа (попадает из .env: VITE_BACKEND_URL)
+  // Локально: http://localhost:8001, на продакшне: https://checksite.example.com
+  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001'
+
+  // Если бекенд вернул внутренний docker URL (например backend:8000) — убрать домен и взять только путь
   if (photoUrl.includes('backend:8000')) {
-    // Убираем http://backend:8000 или https://backend:8000
     const pathOnly = photoUrl.replace(/https?:\/\/backend:8000\/?/g, '/');
-    return `${window.location.origin}${pathOnly}`
+    return `${backendUrl}${pathOnly}`
   }

-  // Если URL уже полный и корректный (начинается с http:// или https://), возвращаем как есть
-  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
-    return photoUrl
+  // Если приходит относительный путь (например "/media/issues/2025/11/02/xx.webp")
+  if (!/^https?:\/\//i.test(photoUrl)) {
+    const normalizedPath = photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`
+    return `${backendUrl}${normalizedPath}`
   }

-  // Для относительных путей используем текущий origin браузера
-  return `${window.location.origin}${photoUrl}`
+  // Если уже внешний полный URL — вернуть как есть
+  return photoUrl
 }
```

---

## 🚀 Деплой на продакшн-сервер

### Шаг 1: Резервное копирование медиафайлов

```bash
# Подключиться к продакшн-серверу по SSH
ssh user@your-production-server.com

# Перейти в директорию проекта
cd /opt/checksite  # Или ваш путь к проекту

# Проверить текущее местоположение медиафайлов
ls -lah ./media/issues/

# Создать резервную копию медиафайлов
sudo tar -czf /root/media_backup_$(date +%F_%H-%M).tar.gz ./media/
ls -lh /root/media_backup_*.tar.gz

# Проверить, используется ли Docker volume или host directory
docker volume ls | grep media
# Если volume существует:
docker volume inspect checksite_media_data
# Если используется host directory (как в нашем случае):
echo "Media directory: ./media (host directory)"
```

### Шаг 2: Проверка docker-compose.yml

```bash
# Убедиться, что volume для media настроен
grep -A5 "volumes:" docker-compose.yml | grep media

# Должно быть:
# - ./media:/app/media  (в секции backend)
# - ./media:/app/media  (в секции nginx)

# Проверить конфигурацию Nginx для /media/
cat nginx/conf.d/default.conf | grep -A3 "location /media/"

# Должно быть:
# location /media/ {
#     alias /app/media/;
#     access_log off;
#     expires 30d;
# }
```

### Шаг 3: Обновление кода из Git

```bash
# Сохранить текущие изменения (если есть)
git stash

# Обновить код из репозитория
git pull origin main  # Или ваша основная ветка

# Проверить статус
git status
```

### Шаг 4: Настройка переменных окружения для продакшна

#### Вариант A: Через файл .env (рекомендуется)

```bash
# Перейти в директорию фронтенда
cd /opt/checksite/frontend

# Создать/обновить .env файл
nano .env

# Добавить/изменить строку:
VITE_BACKEND_URL=https://stroyka.asia

# Сохранить: Ctrl+O, Enter, Ctrl+X

# Проверить содержимое
cat .env | grep VITE_BACKEND_URL
```

#### Вариант B: Через docker-compose.yml (альтернатива)

```bash
# Редактировать docker-compose.yml
nano docker-compose.yml

# Найти секцию frontend и добавить environment:
# frontend:
#   ...
#   environment:
#     - VITE_BACKEND_URL=https://stroyka.asia
#   ...

# Сохранить изменения
```

### Шаг 5: Пересборка фронтенда

```bash
# Вернуться в корень проекта
cd /opt/checksite

# Остановить текущие контейнеры
docker compose down

# Пересобрать образ фронтенда с новыми переменными окружения
docker compose build --no-cache frontend

# Или пересобрать все сервисы
docker compose build --no-cache

# Запустить контейнеры
docker compose up -d

# Проверить статус контейнеров
docker compose ps

# Проверить логи фронтенда
docker compose logs -f frontend --tail=50
```

### Шаг 6: Проверка прав доступа к медиафайлам

```bash
# Проверить владельца и права папки media
ls -la ./media/

# Установить правильные права (если нужно)
sudo chown -R www-data:www-data ./media/
sudo chmod -R 755 ./media/

# Для SELinux (если используется, например на CentOS/RHEL)
sudo chcon -R -t httpd_sys_rw_content_t ./media/ 2>/dev/null || echo "SELinux not in use"

# Проверить, что Nginx может читать файлы
docker compose exec nginx ls -la /app/media/issues/
```

### Шаг 7: Проверка работы после деплоя

#### 7.1. Проверка доступности медиафайлов через HTTP

```bash
# Получить список существующих фото
ls -1 ./media/issues/2025/11/02/ | head -1

# Проверить доступность файла через curl (замените на реальный файл)
curl -I https://stroyka.asia/media/issues/2025/11/02/example_photo.webp

# Ожидаемый ответ:
# HTTP/2 200
# content-type: image/webp
# cache-control: public
# expires: ...

# Если получили 404:
# - Проверить, что файл существует: ls -la ./media/issues/2025/11/02/
# - Проверить конфигурацию nginx: docker compose exec nginx cat /etc/nginx/conf.d/default.conf
# - Проверить логи nginx: docker compose logs nginx --tail=100
```

#### 7.2. Проверка в браузере

```bash
# Открыть в браузере:
# https://stroyka.asia/dashboard/issues

# В DevTools (F12) → Console:
# 1. Не должно быть ошибок загрузки изображений
# 2. Network → фильтр "media" → все запросы должны быть 200 OK

# Команда для получения URL переменной окружения (для проверки)
docker compose exec frontend sh -c 'echo $VITE_BACKEND_URL'
```

#### 7.3. Тест функциональности

**Шаги для проверки:**

1. **Откройте страницу замечаний:** `https://stroyka.asia/dashboard/issues`
2. **Выберите замечание с фотографиями:**
   - Найдите замечание, у которого есть фото "До" или "После"
3. **Проверьте миниатюры:**
   - Миниатюры должны отображаться корректно (не битые)
   - Откройте DevTools (F12) → Network
   - Найдите запросы к `/media/issues/...`
   - URL должен быть: `https://stroyka.asia/media/issues/YYYY/MM/DD/photo.webp`
   - Статус: `200 OK`
4. **Проверьте модальное окно:**
   - Кликните на миниатюру фото
   - Модальное окно должно открыться
   - Фото должно отображаться в полном размере
   - Проверьте URL в DevTools — должен быть тот же `https://stroyka.asia/media/...`

### Шаг 8: Мониторинг и логи

```bash
# Проверить логи всех сервисов
docker compose logs -f --tail=100

# Только логи Nginx (ошибки при раздаче медиа)
docker compose logs nginx --tail=100 | grep media

# Только логи фронтенда
docker compose logs frontend --tail=50

# Только логи бекенда (если есть ошибки при загрузке фото)
docker compose logs backend --tail=100 | grep -i "media\|photo\|issue"

# Проверить использование диска (чтобы media не переполнила диск)
df -h | grep -E "Size|/dev/"
du -sh ./media/
```

---

## ✅ Чек-лист деплоя на продакшн

### Обязательные действия (в порядке выполнения)

- [ ] **1. Резервное копирование медиафайлов**
  ```bash
  sudo tar -czf /root/media_backup_$(date +%F).tar.gz ./media/
  ```

- [ ] **2. Обновить код из Git**
  ```bash
  git pull origin main
  ```

- [ ] **3. Настроить переменную окружения VITE_BACKEND_URL**
  ```bash
  echo "VITE_BACKEND_URL=https://stroyka.asia" >> frontend/.env
  ```

- [ ] **4. Пересобрать и перезапустить контейнеры**
  ```bash
  docker compose down
  docker compose build --no-cache frontend
  docker compose up -d
  ```

- [ ] **5. Проверить доступность медиафайлов**
  ```bash
  curl -I https://stroyka.asia/media/issues/2025/11/02/test.webp
  ```

- [ ] **6. Проверить в браузере**
  - Открыть: `https://stroyka.asia/dashboard/issues`
  - Проверить миниатюры фото
  - Проверить модальное окно
  - Проверить DevTools → Network (все запросы 200 OK)

### Дополнительные действия (по необходимости)

- [ ] **7. Настроить права на media директорию**
  ```bash
  sudo chown -R www-data:www-data ./media/
  sudo chmod -R 755 ./media/
  ```

- [ ] **8. Проверить конфигурацию Nginx**
  ```bash
  docker compose exec nginx nginx -t
  cat nginx/conf.d/default.conf | grep -A5 "location /media/"
  ```

- [ ] **9. Мониторинг логов**
  ```bash
  docker compose logs -f --tail=100
  ```

---

## 🐛 Troubleshooting (Устранение проблем)

### Проблема 1: Фото не загружаются (404 Not Found)

**Симптомы:**
```bash
GET https://stroyka.asia/media/issues/2025/11/02/photo.webp
Status: 404 Not Found
```

**Решение:**

1. Проверить, что файл существует на сервере:
   ```bash
   ls -la ./media/issues/2025/11/02/
   ```

2. Проверить конфигурацию Nginx:
   ```bash
   docker compose exec nginx cat /etc/nginx/conf.d/default.conf | grep -A5 "location /media/"
   ```

3. Проверить volume mount:
   ```bash
   docker compose exec nginx ls -la /app/media/issues/
   ```

4. Перезапустить Nginx:
   ```bash
   docker compose restart nginx
   ```

### Проблема 2: Фото загружаются с неправильного URL

**Симптомы:**
```
DevTools → Network:
GET http://localhost:5174/media/issues/...
или
GET https://stroyka.asia:5174/media/issues/...
```

**Решение:**

1. Проверить переменную окружения:
   ```bash
   docker compose exec frontend sh -c 'echo $VITE_BACKEND_URL'
   ```

2. Если переменная не установлена, добавить в `frontend/.env`:
   ```bash
   echo "VITE_BACKEND_URL=https://stroyka.asia" >> frontend/.env
   ```

3. Пересобрать фронтенд:
   ```bash
   docker compose down
   docker compose build --no-cache frontend
   docker compose up -d
   ```

### Проблема 3: Права доступа (403 Forbidden)

**Симптомы:**
```bash
GET https://stroyka.asia/media/issues/2025/11/02/photo.webp
Status: 403 Forbidden
```

**Решение:**

```bash
# Установить правильные права
sudo chown -R www-data:www-data ./media/
sudo chmod -R 755 ./media/

# Для SELinux (если используется)
sudo chcon -R -t httpd_sys_rw_content_t ./media/

# Перезапустить Nginx
docker compose restart nginx
```

### Проблема 4: Старые фото в Docker volume

**Симптомы:** Новые фото загружаются, но старые не отображаются.

**Решение:**

```bash
# Проверить, используется ли Docker volume
docker volume ls | grep media

# Если volume существует, скопировать файлы на host
docker volume inspect checksite_media_data
# Узнать путь mountpoint, например: /var/lib/docker/volumes/checksite_media_data/_data

# Скопировать на host
sudo cp -a /var/lib/docker/volumes/checksite_media_data/_data/* ./media/

# Обновить docker-compose.yml, чтобы использовать host directory
# Уже настроено: - ./media:/app/media
```

---

## 📊 Проверка конфигурации

### Текущая конфигурация проекта

#### ✅ Docker Compose Volume (уже настроено)

```yaml
# docker-compose.yml
services:
  backend:
    volumes:
      - ./media:/app/media  # ✅ Медиа на host

  nginx:
    volumes:
      - ./media:/app/media  # ✅ Nginx раздаёт с host
```

#### ✅ Nginx конфигурация (уже настроено)

```nginx
# nginx/conf.d/default.conf
location /media/ {
    alias /app/media/;      # ✅ Правильный alias
    access_log off;
    expires 30d;
    add_header Cache-Control "public";
}
```

#### ✅ Django модель (уже настроено)

```python
# backend/apps/issues/models.py
photo = models.ImageField(
    upload_to='issues/%Y/%m/%d/'  # ✅ Путь: media/issues/YYYY/MM/DD/
)
```

---

## 🎉 Итоговое тестирование

### Ручная проверка (5 минут)

1. **Локально (dev):**
   ```bash
   # Перезапустить фронтенд
   docker compose restart frontend

   # Открыть: http://localhost:5174/dashboard/issues
   # Проверить DevTools → Network:
   # URL должен быть: http://localhost:8001/media/issues/...
   ```

2. **На продакшне:**
   ```bash
   # Проверить через curl
   curl -I https://stroyka.asia/media/issues/2025/11/02/test.webp

   # Открыть: https://stroyka.asia/dashboard/issues
   # Проверить DevTools → Network:
   # URL должен быть: https://stroyka.asia/media/issues/...
   ```

3. **Проверка функциональности:**
   - ✅ Миниатюры отображаются
   - ✅ Клик по миниатюре открывает модальное окно
   - ✅ В модальном окне фото отображается в полном размере
   - ✅ Нет ошибок в Console (DevTools)
   - ✅ Все запросы к `/media/` возвращают 200 OK

---

## 📚 Полезные команды

```bash
# === Резервное копирование ===
sudo tar -czf /root/media_backup_$(date +%F).tar.gz ./media/

# === Git операции ===
git status
git pull origin main

# === Docker операции ===
docker compose ps
docker compose logs -f --tail=100
docker compose restart frontend
docker compose down && docker compose up -d --build

# === Проверка переменных окружения ===
docker compose exec frontend sh -c 'printenv | grep VITE'

# === Проверка медиафайлов ===
ls -lah ./media/issues/
du -sh ./media/
curl -I https://stroyka.asia/media/issues/2025/11/02/test.webp

# === Проверка Nginx ===
docker compose exec nginx nginx -t
docker compose exec nginx ls -la /app/media/
docker compose logs nginx --tail=100

# === Права доступа ===
sudo chown -R www-data:www-data ./media/
sudo chmod -R 755 ./media/
```

---

## 📝 Заметки

1. **Фото УЖЕ сохраняются на сервере** благодаря volume mount `./media:/app/media`
2. **Nginx УЖЕ настроен** на раздачу медиафайлов
3. **Единственное изменение:** Фронтенд теперь использует правильный backend URL для загрузки фото
4. **Обратная совместимость:** Изменения не ломают существующую функциональность
5. **Безопасность:** Переменная `VITE_BACKEND_URL` встраивается в frontend bundle при сборке (не секретная информация)

---

**Автор:** Claude Code
**Дата:** 2025-11-02
**Версия:** 1.0
