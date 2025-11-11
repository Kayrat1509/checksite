# 🚀 Инструкция по деплою модуля "Заявки на материалы"

## 📋 Дата деплоя: 11 ноября 2025

---

## 🎯 Что деплоится

### Backend (Django)
- ✅ Новое приложение `material_requests`
- ✅ Миграция `0001_initial.py` - создание таблиц для заявок
- ✅ API endpoints для работы с заявками
- ✅ Интеграция с системой согласования
- ✅ Админ-панель для управления заявками

### Frontend (React)
- ✅ Новый frontend на поддомене `requests.stroyka.asia`
- ✅ Страница управления заявками `/requests`
- ✅ Интеграция с ButtonAccess для контроля прав
- ✅ Форма создания заявок с динамическими полями

### Nginx
- ✅ Конфигурация для поддомена `requests.stroyka.asia`
- ✅ Конфигурация для поддомена `admin.stroyka.asia`

---

## 📂 Структура файлов для деплоя

### 1. Backend файлы
```
backend/apps/material_requests/
├── __init__.py
├── admin.py              # Админ-панель
├── apps.py               # Конфигурация приложения
├── models.py             # Модели MaterialRequest и MaterialRequestItem
├── serializers.py        # DRF сериализаторы
├── signals.py            # Сигналы (автонумерация заявок)
├── tasks.py              # Celery задачи (уведомления)
├── urls.py               # URL маршруты
├── views.py              # ViewSets для API
└── migrations/
    ├── __init__.py
    └── 0001_initial.py   # ⚠️ ВАЖНАЯ МИГРАЦИЯ
```

### 2. Frontend файлы
```
frontend-requests/
├── src/
│   ├── api/
│   │   ├── axios.ts               # Настройки API клиента
│   │   ├── materialRequests.ts    # API методы для заявок
│   │   └── buttonAccess.ts        # API для прав доступа
│   ├── pages/
│   │   └── MaterialRequests.tsx   # Главная страница заявок
│   └── App.tsx
├── .env                           # ⚠️ ОБНОВЛЕН - относительный путь API
├── vite.config.ts                 # ⚠️ ОБНОВЛЕН - порт 5175
├── package.json
└── Dockerfile
```

### 3. Nginx конфигурация
```
nginx/conf.d/default.conf          # ⚠️ ОБНОВЛЕН - добавлены server blocks
```

---

## 🔧 Шаги деплоя на production сервер

### ШАГ 1: Подключение к production серверу

```bash
# Подключитесь к серверу по SSH
ssh user@your-production-server

# Перейдите в директорию проекта
cd /path/to/checksite
```

### ШАГ 2: Загрузка обновленных файлов

Загрузите следующие файлы/папки на production сервер:

```bash
# Через rsync (рекомендуется)
rsync -avz --progress \
  backend/apps/material_requests/ \
  user@your-production-server:/path/to/checksite/backend/apps/material_requests/

rsync -avz --progress \
  frontend-requests/ \
  user@your-production-server:/path/to/checksite/frontend-requests/

rsync -avz --progress \
  nginx/conf.d/default.conf \
  user@your-production-server:/path/to/checksite/nginx/conf.d/default.conf

# Или через git pull (если используете git)
git pull origin main
```

### ШАГ 3: Обновление backend/.env

Убедитесь, что в `backend/.env` на production есть следующие строки:

```env
# ALLOWED_HOSTS (должны быть все поддомены)
ALLOWED_HOSTS=localhost,127.0.0.1,backend,checksite_backend,stroyka.asia,admin.stroyka.asia,requests.stroyka.asia

# CORS_ALLOWED_ORIGINS (должны быть HTTPS для production)
CORS_ALLOWED_ORIGINS=https://stroyka.asia,https://www.stroyka.asia,https://requests.stroyka.asia,https://admin.stroyka.asia
```

### ШАГ 4: Регистрация приложения в INSTALLED_APPS

Проверьте, что в `backend/config/settings.py` добавлено:

```python
INSTALLED_APPS = [
    # ... другие приложения ...
    'apps.material_requests',  # ⚠️ Должно быть здесь
]
```

### ШАГ 5: Обновление URL маршрутов

Проверьте, что в `backend/config/urls.py` добавлено:

```python
urlpatterns = [
    # ... другие URL ...
    path('api/material-requests/', include('apps.material_requests.urls')),  # ⚠️ Должно быть здесь
]
```

### ШАГ 6: Применение миграций (⚠️ КРИТИЧЕСКИ ВАЖНО)

```bash
# Остановите backend контейнер (чтобы избежать конфликтов)
docker compose stop backend

# Примените миграции
docker compose run --rm backend python manage.py migrate material_requests

# Проверьте, что миграция применена
docker compose run --rm backend python manage.py showmigrations material_requests

# Должно показать:
# material_requests
#  [X] 0001_initial

# Запустите backend обратно
docker compose up -d backend
```

### ШАГ 7: Сборка frontend-requests

```bash
# Пересоберите контейнер frontend-requests
docker compose build frontend-requests

# Или если нужна production сборка:
cd frontend-requests
npm run build

# Перезапустите контейнер
docker compose up -d frontend-requests
```

### ШАГ 8: Перезапуск nginx

```bash
# Проверьте конфигурацию nginx
docker compose exec nginx nginx -t

# Если конфигурация валидна, перезапустите nginx
docker compose restart nginx
```

### ШАГ 9: Перезапуск backend и celery

```bash
# Перезапустите все сервисы для применения изменений
docker compose restart backend celery celery-beat
```

---

## ✅ Проверка после деплоя

### 1. Проверка базы данных

```bash
# Подключитесь к БД и проверьте наличие таблиц
docker compose exec db psql -U checksite_user -d checksite_db

# В psql выполните:
\dt material_*

# Должны быть таблицы:
# material_requests
# material_request_items
```

### 2. Проверка API

```bash
# Проверьте, что API отвечает (замените на ваш домен)
curl https://requests.stroyka.asia/api/material-requests/requests/

# Или через браузер:
# https://admin.stroyka.asia/api/material-requests/requests/
```

### 3. Проверка админ-панели

Откройте в браузере:
```
https://admin.stroyka.asia/admin/material_requests/materialrequest/
```

Должна открыться страница со списком заявок (пустой список - это нормально).

❌ **НЕ ДОЛЖНО БЫТЬ** ошибки: `relation "material_request_items" does not exist`

### 4. Проверка frontend

Откройте в браузере:
```
https://requests.stroyka.asia/requests
```

Страница должна:
- ✅ Загрузиться без ошибок
- ✅ Показать таблицу заявок (может быть пустой)
- ✅ Кнопка "Создать заявку" (если есть права)
- ✅ Нет React warnings в консоли браузера (F12)

### 5. Проверка логов

```bash
# Проверьте логи backend на наличие ошибок
docker compose logs backend --tail=100

# Проверьте логи nginx
docker compose logs nginx --tail=50

# Проверьте логи frontend-requests
docker compose logs frontend-requests --tail=50
```

---

## 🔍 Troubleshooting (Решение проблем)

### Проблема 1: "relation 'material_request_items' does not exist"

**Причина:** Миграции не применены

**Решение:**
```bash
docker compose exec backend python manage.py migrate material_requests --fake-initial
```

### Проблема 2: CORS ошибки в браузере

**Причина:** Неправильные настройки CORS в backend/.env

**Решение:** Убедитесь, что в `backend/.env` указаны правильные домены с `https://`:
```env
CORS_ALLOWED_ORIGINS=https://stroyka.asia,https://requests.stroyka.asia,https://admin.stroyka.asia
```

Затем перезапустите backend:
```bash
docker compose restart backend
```

### Проблема 3: 404 Not Found на /api/material-requests/

**Причина:** URL не добавлен в `config/urls.py`

**Решение:** Добавьте в `backend/config/urls.py`:
```python
path('api/material-requests/', include('apps.material_requests.urls')),
```

Перезапустите backend:
```bash
docker compose restart backend
```

### Проблема 4: Frontend не загружается на requests.stroyka.asia

**Причина:** Nginx не перенаправляет на frontend-requests контейнер

**Решение:** Проверьте nginx конфигурацию:
```bash
docker compose exec nginx cat /etc/nginx/conf.d/default.conf | grep -A 10 "requests.stroyka.asia"
```

Должен быть server block с:
```nginx
server {
    listen 80;
    server_name requests.stroyka.asia;

    location / {
        proxy_pass http://frontend_requests;
        ...
    }
}
```

Если нет, скопируйте обновленный `nginx/conf.d/default.conf` на сервер и перезапустите nginx.

### Проблема 5: Импорт не работает в Python

**Причина:** Приложение не добавлено в INSTALLED_APPS

**Решение:** Добавьте в `backend/config/settings.py`:
```python
INSTALLED_APPS = [
    # ...
    'apps.material_requests',
]
```

---

## 📊 Мониторинг после деплоя

### 1. Проверьте логи Celery

```bash
docker compose logs celery --tail=100 -f
```

Должны быть сообщения о регистрации задач:
```
[tasks]
  . apps.material_requests.tasks.send_approval_notification
  . apps.material_requests.tasks.send_rejection_notification
```

### 2. Проверьте статус контейнеров

```bash
docker compose ps
```

Все контейнеры должны быть в статусе `Up`:
- ✅ checksite_backend
- ✅ checksite_frontend_requests
- ✅ checksite_nginx
- ✅ checksite_celery
- ✅ checksite_db
- ✅ checksite_redis

### 3. Мониторинг запросов

```bash
# Следите за логами nginx в реальном времени
docker compose logs nginx -f
```

Запросы к `/api/material-requests/` должны возвращать 200 OK.

---

## 🎉 Успешный деплой

Если все проверки пройдены:
- ✅ Миграции применены
- ✅ API отвечает без ошибок
- ✅ Админ-панель открывается
- ✅ Frontend загружается на requests.stroyka.asia
- ✅ Нет ошибок в логах

**Поздравляем! Модуль "Заявки на материалы" успешно задеплоен на production! 🚀**

---

## 📝 Дополнительные заметки

### Создание тестовых данных (опционально)

Если нужно создать тестовые данные для проверки:

```bash
docker compose exec backend python manage.py shell

# В shell:
from apps.material_requests.models import MaterialRequest, MaterialRequestItem
from apps.users.models import User, Company
from apps.projects.models import Project

# Получите компанию и проект
company = Company.objects.first()
project = Project.objects.first()
user = User.objects.filter(company=company).first()

# Создайте заявку
request = MaterialRequest.objects.create(
    company=company,
    project=project,
    created_by=user,
    status='DRAFT'
)

# Создайте позиции
MaterialRequestItem.objects.create(
    request=request,
    material_name='Цемент М500',
    unit='т',
    quantity_requested=10.5,
    order=0
)

print(f"Создана заявка: {request.number}")
exit()
```

### Настройка ButtonAccess (если нужно)

Если кнопка "Создать заявку" не отображается:

1. Зайдите в админку: `https://admin.stroyka.asia/admin/core/buttonaccess/`
2. Найдите запись с `page='material-requests'` и `button_key='create'`
3. Добавьте нужные роли в поле `accessible_roles`

---

## 📞 Контакты и поддержка

Если возникли проблемы при деплое, проверьте:
1. Логи всех контейнеров
2. Права доступа к файлам
3. Переменные окружения в .env файлах
4. DNS настройки для поддоменов
5. SSL сертификаты (если используете HTTPS)

---

**Дата создания:** 11 ноября 2025
**Версия:** 1.0
**Автор:** Claude Code Assistant
