# 🔗 Руководство по интеграции Frontend-Requests с Backend

## ✅ Что уже сделано

### Backend (✅ Полностью готов)

1. ✅ Django app `material_requests` создан и настроен
2. ✅ Модели `MaterialRequest` и `MaterialRequestItem` реализованы
3. ✅ API эндпоинты работают: `/api/material-requests/requests/`
4. ✅ Сериализаторы с валидацией
5. ✅ ViewSets с 6 custom actions
6. ✅ Миграции применены
7. ✅ Админка настроена
8. ✅ Celery tasks для уведомлений
9. ✅ Права доступа через ButtonAccess

### Frontend (⚠️ Требует обновления)

1. ✅ API client обновлён ([frontend-requests/src/api/materialRequests.ts](frontend-requests/src/api/materialRequests.ts))
2. ⚠️ Компонент MaterialRequests.tsx требует минимальных изменений
3. ⚠️ Типы данных обновлены

---

## 📋 Что нужно сделать для завершения интеграции

### Шаг 1: Обновить MaterialRequests.tsx

**Файл:** `frontend-requests/src/pages/MaterialRequests.tsx`

**Проблема:** Компонент использует устаревшие поля из типов (например, `request.author.full_name` вместо `request.created_by`)

**Решение:** Исправить маппинг полей на строках 95-100:

**Было:**
```typescript
projectName: request.project.name,
authorName: request.author.full_name,
authorRole: request.author.role,
```

**Должно быть:**
```typescript
projectName: request.project?.name || 'Без проекта',
authorName: request.created_by ? `${request.created_by.first_name} ${request.created_by.last_name}` : 'Неизвестно',
authorRole: request.created_by?.role || '',
```

---

### Шаг 2: Исправить фильтрацию статусов

**Файл:** `frontend-requests/src/pages/MaterialRequests.tsx`

**Проблема:** Фильтрация использует неправильные значения статусов

**Строки 112-127:**

**Было:**
```typescript
case 'approval':
  return allItems.filter((item) =>
    item.status.includes('approval') || item.status === 'draft'
  )
case 'approved':
  return allItems.filter((item) => item.status === 'approved')
case 'payment':
  return allItems.filter((item) => item.status === 'payment')
case 'delivery':
  return allItems.filter((item) => item.status === 'delivery')
case 'completed':
  return allItems.filter((item) => item.status === 'completed')
```

**Должно быть:**
```typescript
case 'approval':
  return allItems.filter((item) =>
    item.status.includes('APPROVAL') || item.status === 'DRAFT'
  )
case 'approved':
  return allItems.filter((item) => item.status === 'APPROVED')
case 'payment':
  return allItems.filter((item) =>
    item.status === 'PAYMENT' || item.status === 'PROCUREMENT'
  )
case 'delivery':
  return allItems.filter((item) => item.status === 'DELIVERY')
case 'completed':
  return allItems.filter((item) => item.status === 'COMPLETED')
```

---

### Шаг 3: Обновить цвета статусов

**Файл:** `frontend-requests/src/pages/MaterialRequests.tsx`

**Строки 131-146:**

**Было:**
```typescript
const colors: Record<string, string> = {
  draft: 'default',
  pto_approval: 'processing',
  site_manager_approval: 'processing',
  pm_approval: 'processing',
  chief_engineer_approval: 'processing',
  director_approval: 'processing',
  approved: 'success',
  payment: 'warning',
  delivery: 'cyan',
  completed: 'success',
  rejected: 'error',
}
```

**Должно быть:**
```typescript
const colors: Record<string, string> = {
  DRAFT: 'default',
  SITE_MANAGER_APPROVAL: 'processing',
  ENGINEER_APPROVAL: 'processing',
  PM_APPROVAL: 'processing',
  CHIEF_POWER_APPROVAL: 'processing',
  CHIEF_ENGINEER_APPROVAL: 'processing',
  DIRECTOR_APPROVAL: 'processing',
  APPROVED: 'success',
  WAREHOUSE_REVIEW: 'blue',
  PROCUREMENT: 'orange',
  PAYMENT: 'warning',
  DELIVERY: 'cyan',
  COMPLETED: 'success',
  REJECTED: 'error',
}
```

---

### Шаг 4: Добавить переменную окружения

**Файл:** `frontend-requests/.env` или `frontend-requests/.env.local`

**Добавить:**
```bash
# API URL для backend
VITE_API_URL=http://localhost:8001/api
```

**Для production (requests.stroyka.asia):**
```bash
VITE_API_URL=https://api.stroyka.asia/api
```

---

### Шаг 5: Настроить CORS на backend (если ещё не настроено)

**Файл:** `backend/config/settings.py`

**Убедитесь, что добавлен домен requests.stroyka.asia:**

```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5174',  # Главный frontend
    'http://localhost:5175',  # Frontend-requests (локально)
    'https://requests.stroyka.asia',  # Frontend-requests (production)
    'https://stroyka.asia',
    'https://api.stroyka.asia',
]

CORS_ALLOW_CREDENTIALS = True
```

---

### Шаг 6: Настроить Nginx для requests.stroyka.asia

**Файл:** `nginx/nginx.conf` (если используется Nginx)

**Добавить блок для requests.stroyka.asia:**

```nginx
# Frontend-Requests
server {
    listen 80;
    server_name requests.stroyka.asia;

    location / {
        proxy_pass http://checksite_frontend-requests:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

### Шаг 7: Добавить доступ к странице в ButtonAccess

**Через админку:** `/admin/core/buttonaccess/`

**Создать запись:**
- **access_type:** `page`
- **page:** `material-requests`
- **button_key:** `view`
- **button_name:** `Заявки на материалы`
- **default_access:** ❌ False
- **company:** `NULL` (глобальная настройка)

**Роли с доступом (отметить галочками):**
- ✅ SUPERADMIN
- ✅ DIRECTOR
- ✅ CHIEF_ENGINEER
- ✅ PROJECT_MANAGER
- ✅ CHIEF_POWER_ENGINEER
- ✅ ENGINEER
- ✅ SITE_MANAGER
- ✅ FOREMAN
- ✅ POWER_ENGINEER
- ✅ MASTER
- ✅ SUPPLY_MANAGER
- ✅ WAREHOUSE_HEAD
- ✅ SITE_WAREHOUSE_MANAGER

---

### Шаг 8: Добавить кнопки (actions) в ButtonAccess

**Через админку:** `/admin/core/buttonaccess/`

Создать следующие записи:

#### 1. Создание заявки
- **access_type:** `button`
- **page:** `material-requests`
- **button_key:** `create`
- **button_name:** `Создать заявку`
- **Роли:** MASTER, FOREMAN, SITE_MANAGER (те, кто создаёт заявки)

#### 2. Согласование
- **access_type:** `button`
- **page:** `material-requests`
- **button_key:** `approve`
- **button_name:** `Согласовать`
- **Роли:** Все роли согласования (SITE_MANAGER, ENGINEER, PROJECT_MANAGER, CHIEF_POWER_ENGINEER, CHIEF_ENGINEER, DIRECTOR)

#### 3. Возврат на доработку
- **access_type:** `button`
- **page:** `material-requests`
- **button_key:** `reject`
- **button_name:** `Вернуть на доработку`
- **Роли:** Все роли согласования

#### 4. Отметка оплаты
- **access_type:** `button`
- **page:** `material-requests`
- **button_key:** `mark_paid`
- **button_name:** `Отметить оплату`
- **Роли:** SUPPLY_MANAGER

#### 5. Приёмка материалов
- **access_type:** `button`
- **page:** `material-requests`
- **button_key:** `mark_delivered`
- **button_name:** `Принять материал`
- **Роли:** MASTER, FOREMAN, SITE_MANAGER, SITE_WAREHOUSE_MANAGER

---

## 🧪 Тестирование

### 1. Проверка API через curl

```bash
# Получить токен (замените на реальные данные)
curl -X POST http://localhost:8001/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Получить список заявок
curl http://localhost:8001/api/material-requests/requests/ \
  -H "Cookie: access_token=YOUR_TOKEN_HERE"
```

### 2. Проверка через браузер

1. Откройте http://localhost:5175 или https://requests.stroyka.asia
2. Войдите в систему
3. Проверьте, что загружаются заявки

### 3. Проверка создания заявки

```javascript
// В консоли браузера
const testRequest = {
  project_id: 1,
  items_data: [
    {
      material_name: "Цемент М500",
      unit: "т",
      quantity_requested: 5,
      notes: "Тестовая заявка"
    }
  ]
}

await materialRequestsAPI.create(testRequest)
```

---

## 🐛 Возможные проблемы и решения

### Проблема 1: CORS ошибки

**Симптом:** `Access to fetch at 'http://localhost:8001/api/...' has been blocked by CORS policy`

**Решение:**
1. Проверьте `CORS_ALLOWED_ORIGINS` в `backend/config/settings.py`
2. Убедитесь, что `CORS_ALLOW_CREDENTIALS = True`
3. Перезапустите backend: `docker compose restart backend`

---

### Проблема 2: 401 Unauthorized

**Симптом:** API возвращает `{"detail":"Учетные данные не были предоставлены."}`

**Решение:**
1. Проверьте, что cookies передаются (`withCredentials: true` в axios)
2. Проверьте токен в DevTools → Application → Cookies
3. Попробуйте перелогиниться

---

### Проблема 3: Пустой список заявок

**Симптом:** API возвращает `[]` или `{"count": 0, "results": []}`

**Решение:**
1. Создайте тестовую заявку через админку: `/admin/material_requests/materialrequest/add/`
2. Проверьте, что пользователь имеет доступ к проектам
3. Проверьте фильтрацию по компании в ViewSet

---

### Проблема 4: Статусы не отображаются правильно

**Симптом:** Все статусы серые или неправильные цвета

**Решение:**
1. Проверьте, что обновили маппинг статусов (Шаг 3)
2. Backend возвращает статусы в uppercase (DRAFT, APPROVED и т.д.)
3. Проверьте в DevTools → Network → response

---

### Проблема 5: Не работают действия (approve, reject)

**Симптом:** Кнопки не активны или возвращают 403 Forbidden

**Решение:**
1. Проверьте права доступа в ButtonAccess (Шаг 7-8)
2. Убедитесь, что пользователь имеет нужную роль
3. Проверьте `current_approver_role` в ответе API - только пользователь с этой ролью может согласовать

---

## 📝 Checklist для запуска

- [ ] Backend запущен: `docker compose up backend -d`
- [ ] Frontend-requests запущен: `cd frontend-requests && npm run dev`
- [ ] CORS настроен правильно
- [ ] Переменные окружения установлены (.env)
- [ ] ButtonAccess записи созданы в админке
- [ ] Тестовая заявка создана
- [ ] API эндпоинты отвечают (проверить через curl)
- [ ] Логин работает
- [ ] Список заявок загружается
- [ ] Действия работают (approve, reject и т.д.)

---

## 🚀 Быстрый старт (для разработки)

```bash
# 1. Запустить backend
cd /Users/kairatkhidirboev/Projects/checksite
docker compose up backend -d

# 2. Проверить что API работает
curl http://localhost:8001/api/material-requests/requests/

# 3. Запустить frontend-requests
cd frontend-requests
npm install
npm run dev

# 4. Открыть в браузере
# http://localhost:5175
```

---

## 📚 Дополнительные ресурсы

- **Backend API Документация:** [backend/apps/material_requests/README.md](backend/apps/material_requests/README.md)
- **Swagger UI:** http://localhost:8001/api/docs/
- **Admin Panel:** http://localhost:8001/admin/material_requests/
- **Модели:** [backend/apps/material_requests/models.py](backend/apps/material_requests/models.py)
- **Сериализаторы:** [backend/apps/material_requests/serializers.py](backend/apps/material_requests/serializers.py)
- **ViewSets:** [backend/apps/material_requests/views.py](backend/apps/material_requests/views.py)

---

## 💡 Советы

1. **Используйте React DevTools** для отладки состояния компонентов
2. **Используйте Redux DevTools** (если используется) для отслеживания store
3. **Проверяйте Network tab** в DevTools для отладки API запросов
4. **Логи backend:** `docker compose logs backend -f`
5. **Перезапуск при изменениях:** Backend перезапускается автоматически благодаря volume

---

## ✅ Готово!

После выполнения всех шагов система заявок на материалы будет полностью интегрирована и готова к использованию!
