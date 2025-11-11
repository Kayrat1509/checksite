# 🚀 Быстрый деплой модуля "Заявки на материалы"

## ⚡ Автоматический деплой (рекомендуется)

Запустите скрипт автоматического деплоя:

```bash
./deploy_material_requests.sh
```

Скрипт автоматически:
- ✅ Проверит окружение и файлы
- ✅ Остановит backend
- ✅ Применит миграции
- ✅ Проверит создание таблиц в БД
- ✅ Пересоберёт frontend-requests
- ✅ Перезапустит все сервисы
- ✅ Проверит статус контейнеров
- ✅ Проверит API endpoint
- ✅ Проверит логи на ошибки

---

## 📋 Ручной деплой

Если нужно выполнить деплой вручную:

### 1. Остановите backend
```bash
docker compose stop backend
```

### 2. Примените миграции
```bash
docker compose run --rm backend python manage.py migrate material_requests
```

### 3. Проверьте миграции
```bash
docker compose run --rm backend python manage.py showmigrations material_requests
```

Должно быть:
```
material_requests
 [X] 0001_initial
```

### 4. Проверьте таблицы в БД
```bash
docker compose exec db psql -U checksite_user -d checksite_db -c "\dt material_*"
```

Должны быть:
- `material_requests`
- `material_request_items`

### 5. Пересоберите frontend-requests
```bash
docker compose build frontend-requests
```

### 6. Перезапустите все сервисы
```bash
docker compose up -d backend nginx celery celery-beat frontend-requests
```

### 7. Проверьте статус
```bash
docker compose ps
```

Все контейнеры должны быть `Up`.

---

## ✅ Проверка после деплоя

### 1. Админ-панель
Откройте: `https://admin.stroyka.asia/admin/material_requests/materialrequest/`

❌ **НЕ ДОЛЖНО БЫТЬ:** `relation "material_request_items" does not exist`

### 2. Frontend
Откройте: `https://requests.stroyka.asia/requests`

Должна загрузиться страница с таблицей заявок (может быть пустой).

### 3. API
```bash
curl https://admin.stroyka.asia/api/material-requests/requests/
```

Должен вернуть JSON с данными (или пустой список).

### 4. Логи
```bash
# Проверьте логи backend
docker compose logs backend --tail=50

# Проверьте логи nginx
docker compose logs nginx --tail=50

# Проверьте логи frontend-requests
docker compose logs frontend-requests --tail=20
```

Не должно быть ошибок типа:
- `relation "material_request_items" does not exist`
- `CORS error`
- `404 Not Found` на `/api/material-requests/`

---

## 🔧 Решение проблем

### Проблема: "relation 'material_request_items' does not exist"

**Решение:**
```bash
docker compose exec backend python manage.py migrate material_requests --fake-initial
docker compose restart backend
```

### Проблема: CORS ошибки

**Решение:** Проверьте `backend/.env`:
```env
CORS_ALLOWED_ORIGINS=https://stroyka.asia,https://requests.stroyka.asia,https://admin.stroyka.asia
```

Затем:
```bash
docker compose restart backend
```

### Проблема: 404 на /api/material-requests/

**Решение:** Проверьте `backend/config/urls.py`:
```python
urlpatterns = [
    # ...
    path('api/material-requests/', include('apps.material_requests.urls')),
]
```

### Проблема: Frontend не загружается

**Решение:** Проверьте nginx конфигурацию:
```bash
docker compose exec nginx nginx -t
docker compose restart nginx
```

---

## 📚 Полная документация

Смотрите файл [DEPLOY_MATERIAL_REQUESTS.md](DEPLOY_MATERIAL_REQUESTS.md) для подробной документации.

---

## 🆘 Откат изменений

Если что-то пошло не так:

```bash
# Откатите миграции
docker compose exec backend python manage.py migrate material_requests zero

# Удалите таблицы вручную
docker compose exec db psql -U checksite_user -d checksite_db -c "DROP TABLE IF EXISTS material_request_items CASCADE;"
docker compose exec db psql -U checksite_user -d checksite_db -c "DROP TABLE IF EXISTS material_requests CASCADE;"

# Перезапустите сервисы
docker compose restart backend
```

---

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте логи: `docker compose logs <service> --tail=100`
2. Проверьте статус: `docker compose ps`
3. Смотрите раздел "Troubleshooting" в [DEPLOY_MATERIAL_REQUESTS.md](DEPLOY_MATERIAL_REQUESTS.md)

---

**Дата:** 11 ноября 2025
**Версия:** 1.0
**Статус:** Готово к production деплою ✅
