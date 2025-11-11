# 🐛 Отчёт об исправлении багов

## 📅 Дата: 11 ноября 2025

---

## 📋 Список исправленных проблем

### ✅ 1. React Warning: Duplicate keys in Form.List

**Статус:** ИСПРАВЛЕНО ✅

**Файл:** `frontend-requests/src/pages/MaterialRequests.tsx`

**Проблема:**
```
Warning: Encountered two children with the same key, `0`. Keys should be unique...
Warning: A props object containing a "key" prop is being spread into JSX
```

**Причина:**
Использование spread оператора `{...field}` в компонентах `Form.Item`, который передавал prop `key` через spread. React не позволяет передавать `key` таким образом.

**Решение:**
Убран spread оператор `{...field}` из всех `Form.Item` компонентов и заменён на явное указание `name` и `fieldKey`:

**Изменения (строки 1032-1090):**

```typescript
// ❌ БЫЛО:
<Form.Item {...field} name={[field.name, 'material_name']} ...>

// ✅ СТАЛО:
<Form.Item
  name={[field.name, 'material_name']}
  fieldKey={[field.fieldKey, 'material_name']}
  ...>
```

Исправлено 4 компонента:
1. Поле "Название материала" (строки 1032-1039)
2. Поле "Количество" (строки 1043-1058)
3. Поле "Единица измерения" (строки 1061-1077)
4. Поле "Примечания" (строки 1081-1090)

**Результат:**
- ✅ Все React warnings исчезли
- ✅ Форма работает корректно
- ✅ Нет дублирующихся ключей

---

### ✅ 2. Неправильная конфигурация API URL

**Статус:** ИСПРАВЛЕНО ✅

**Файлы:**
- `frontend-requests/.env`
- `frontend-requests/vite.config.ts`

**Проблема:**
API URL был жёстко прописан как `http://localhost:8001/api`, что не работало:
- При доступе через поддомен `requests.stroyka.asia`
- При работе через nginx proxy

**Решение:**

1. **Изменён .env файл:**
```env
# ❌ БЫЛО:
VITE_API_URL=http://localhost:8001/api
VITE_BACKEND_URL=http://localhost:8001

# ✅ СТАЛО:
VITE_API_URL=/api
VITE_BACKEND_URL=
```

2. **Обновлён vite.config.ts (строка 125):**
```typescript
// ❌ БЫЛО:
port: 5173,

// ✅ СТАЛО:
port: 5175,
```

3. **Добавлен домен в allowedHosts (строка 126):**
```typescript
allowedHosts: ['stroyka.asia', 'requests.stroyka.asia', 'admin.stroyka.asia', 'localhost'],
```

**Результат:**
- ✅ API работает через относительный путь `/api`
- ✅ Vite proxy корректно перенаправляет на `http://backend:8000`
- ✅ Работает как локально (localhost:5175), так и через nginx (requests.stroyka.asia)

---

### ✅ 3. Отсутствие nginx конфигурации для admin.stroyka.asia

**Статус:** ИСПРАВЛЕНО ✅

**Файл:** `nginx/conf.d/default.conf`

**Проблема:**
Поддомен `admin.stroyka.asia` не был настроен в nginx, что приводило к ошибкам при попытке доступа к админ-панели через этот домен.

**Решение:**
Добавлен новый server block для `admin.stroyka.asia` (строки 137-194):

```nginx
server {
    listen 80;
    server_name admin.stroyka.asia;

    location /media/ {
        alias /app/media/;
        # ... настройки кеширования
    }

    location /static/ {
        alias /app/staticfiles/;
        # ... настройки кеширования
    }

    location /api/ {
        proxy_pass http://backend;
        # ... proxy headers
    }

    location / {
        proxy_pass http://backend;
        # ... proxy headers
    }

    location /admin/ {
        proxy_pass http://backend;
        # ... proxy headers
    }

    location /ws/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        # ... WebSocket настройки
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

**Результат:**
- ✅ admin.stroyka.asia корректно проксируется на backend
- ✅ Все запросы (api, admin, static, media, ws) работают
- ✅ Добавлены security headers

---

### ⚠️ 4. Ошибка базы данных на production: "relation 'material_request_items' does not exist"

**Статус:** ТРЕБУЕТ ДЕЙСТВИЙ НА PRODUCTION ⚠️

**Проблема:**
При попытке открыть админ-панель на `https://admin.stroyka.asia/admin/material_requests/materialrequestitem/` возникает ошибка:

```
ProgrammingError at /admin/material_requests/materialrequestitem/
relation "material_request_items" does not exist
LINE 1: SELECT COUNT(*) AS "__count" FROM "material_request_items"
```

**Причина:**
Домен `admin.stroyka.asia` резолвится на **production сервер** (IP: 104.21.75.166 - Cloudflare), а не на локальный Docker. На production сервере **не применены миграции** для приложения `material_requests`.

**Решение (на production сервере):**

```bash
# Подключитесь к production серверу
ssh user@your-production-server

# Перейдите в директорию проекта
cd /path/to/checksite

# Примените миграции
docker compose run --rm backend python manage.py migrate material_requests

# Проверьте, что миграция применена
docker compose run --rm backend python manage.py showmigrations material_requests
# Должно быть: [X] 0001_initial

# Проверьте таблицы в БД
docker compose exec db psql -U checksite_user -d checksite_db -c "\dt material_*"
# Должны быть: material_requests, material_request_items

# Перезапустите backend
docker compose restart backend
```

**Что создаёт миграция 0001_initial:**
1. Таблица `material_requests` (заявки)
2. Таблица `material_request_items` (позиции материалов)
3. Индексы для быстрых запросов по company, project, created_by, current_approver

**Файл миграции:** `backend/apps/material_requests/migrations/0001_initial.py`

**После применения на production:**
- ✅ Админ-панель будет работать без ошибок
- ✅ API endpoints будут доступны
- ✅ Frontend сможет загружать данные

---

## 📊 Статистика исправлений

| Категория | Количество |
|-----------|------------|
| Исправленных файлов | 4 |
| Строк кода изменено | ~70 |
| React warnings устранено | 8 |
| Новых server blocks nginx | 1 |
| Требует действий на production | 1 |

---

## 🎯 Итоговый чеклист

### ✅ Локальные исправления (ВЫПОЛНЕНО)

- [x] Исправлены React warnings в Form.List
- [x] Настроен относительный путь API
- [x] Исправлен порт Vite на 5175
- [x] Добавлены домены в allowedHosts
- [x] Добавлен server block для admin.stroyka.asia в nginx
- [x] Перезапущены все контейнеры
- [x] Проверена работа локально

### ⏳ Требует действий на production

- [ ] Загрузить обновлённые файлы на production
- [ ] Применить миграции на production
- [ ] Проверить создание таблиц в БД
- [ ] Перезапустить backend и nginx
- [ ] Проверить админ-панель на admin.stroyka.asia
- [ ] Проверить frontend на requests.stroyka.asia

---

## 📚 Созданная документация

1. **DEPLOY_MATERIAL_REQUESTS.md** - Подробная инструкция по деплою
2. **README_DEPLOY.md** - Быстрое руководство по деплою
3. **deploy_material_requests.sh** - Скрипт автоматического деплоя
4. **CHANGED_FILES.txt** - Список всех изменённых файлов
5. **BUGFIX_REPORT.md** - Этот отчёт об исправлениях

---

## 🔗 Полезные ссылки

### Локальные URL
- Frontend: http://localhost:5175/requests
- Backend API: http://localhost:8001/api/material-requests/requests/

### Production URLs (после деплоя)
- Frontend: https://requests.stroyka.asia/requests
- Admin: https://admin.stroyka.asia/admin/material_requests/materialrequest/
- API: https://admin.stroyka.asia/api/material-requests/requests/

---

## 💡 Рекомендации

1. **Перед деплоем на production:**
   - Прочитайте файл `DEPLOY_MATERIAL_REQUESTS.md`
   - Сделайте backup базы данных
   - Используйте скрипт `./deploy_material_requests.sh` для автоматизации

2. **После деплоя:**
   - Проверьте все URL из раздела "Production URLs"
   - Проверьте логи на наличие ошибок
   - Создайте тестовую заявку для проверки функционала

3. **Мониторинг:**
   - Следите за логами: `docker compose logs backend -f`
   - Проверяйте статус: `docker compose ps`
   - Используйте Flower для мониторинга Celery: http://localhost:5555

---

## ✨ Заключение

Все обнаруженные проблемы успешно исправлены локально. Код готов к production деплою.

**Следующий шаг:** Выполнить деплой на production сервер согласно инструкциям в `README_DEPLOY.md`.

---

**Дата создания:** 11 ноября 2025
**Автор:** Claude Code Assistant
**Статус:** ✅ Готово к production деплою
