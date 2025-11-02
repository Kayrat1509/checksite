# 🔍 Анализ ошибки кнопок на странице /dashboard/issues

## 📋 Описание проблемы

**Ошибка:**
```
POST http://localhost:5174/api/issues/issues/17/update_status/ 400 (Bad Request)
Failed to update status: AxiosError {message: 'Request failed with status code 400'...}
```

**Симптомы:**
- Некоторые кнопки на странице `/dashboard/issues` не работают
- Ошибка 400 (Bad Request) при попытке изменить статус замечания
- URL запроса формируется неправильно: использует `localhost:5174` (frontend) вместо прокси

---

## 🔎 Проведённый анализ

### 1. URL структура (Backend)

**Главный urls.py:**
```python
# /backend/config/urls.py:22
path('api/issues/', include('apps.issues.urls'))
```

**Issues urls.py:**
```python
# /backend/apps/issues/urls.py:6
router.register(r'issues', IssueViewSet, basename='issue')
```

**Итоговый backend URL:**
```
/api/issues/issues/17/update_status/
```

✅ **Это ПРАВИЛЬНЫЙ URL** - двойное "issues" здесь ожидается!

### 2. Frontend API (issues.ts)

**Файл:** `frontend/src/api/issues.ts:96-98`

```typescript
updateStatus: async (id: number, data: { status: string; comment?: string }) => {
  const response = await axios.post(`/issues/issues/${id}/update_status/`, data)
  return response.data
}
```

✅ **Код правильный** - использует относительный путь `/issues/issues/...`

### 3. Axios Configuration

**Файл:** `frontend/src/api/axios.ts:1-14`

```typescript
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})
```

**`.env` файл:**
```bash
VITE_API_URL=/api
```

✅ **Настройка правильная** - `baseURL = '/api'`

**Ожидаемый результат:**
```
axios.post('/issues/issues/17/update_status/')
→ baseURL='/api' + path='/issues/issues/17/update_status/'
→ /api/issues/issues/17/update_status/ ✅
```

### 4. Vite Proxy Configuration

**Файл:** `frontend/vite.config.ts:141-145`

```typescript
proxy: {
  '/api': {
    target: 'http://backend:8000',
    changeOrigin: true
  }
}
```

✅ **Proxy настроен правильно**

**Ожидаемое поведение:**
```
Browser запрос: /api/issues/issues/17/update_status/
→ Vite Proxy перенаправляет на: http://backend:8000/api/issues/issues/17/update_status/
→ Backend обрабатывает запрос ✅
```

---

## ⚠️ Обнаруженная проблема

### Проблема: Запрос идёт напрямую на localhost:5174

**Ошибка в консоли:**
```
POST http://localhost:5174/api/issues/issues/17/update_status/ 400 (Bad Request)
```

**Анализ URL:**
- ❌ Host: `localhost:5174` (frontend) - **НЕПРАВИЛЬНО**
- ✅ Path: `/api/issues/issues/17/update_status/` - правильно

**Что должно было произойти:**
1. Axios делает запрос на относительный URL: `/api/issues/issues/17/update_status/`
2. Vite dev server перехватывает запрос через proxy
3. Перенаправляет на `http://backend:8000/api/issues/issues/17/update_status/`

**Что происходит:**
1. Axios делает запрос на **абсолютный URL**: `http://localhost:5174/api/issues/issues/17/update_status/`
2. Vite proxy НЕ работает для абсолютных URL с указанным хостом
3. Запрос идёт напрямую на frontend сервер (port 5174)
4. Frontend сервер не может обработать API запрос → 400 Bad Request

---

## 🎯 Причины проблемы

### Причина 1: Service Worker перехватывает запросы ⚠️ **НАИБОЛЕЕ ВЕРОЯТНО**

**Описание:**
PWA Service Worker может кешировать запросы и перенаправлять их, игнорируя Vite proxy.

**Проверка в vite.config.ts:13-15:**
```typescript
devOptions: {
  enabled: false,  // ✅ Service Worker отключен в dev режиме
  type: 'module'
}
```

**Но:** Если Service Worker был зарегистрирован ранее (когда `enabled: true`), он может продолжать работать даже после изменения конфига.

**Проверка в браузере:**
1. Открыть DevTools (F12)
2. Application → Service Workers
3. Если есть активный Service Worker → это проблема

**Решение:**
```javascript
// В DevTools → Application → Service Workers
1. Нажать "Unregister" для всех Service Workers
2. Очистить кэш: Application → Storage → Clear site data
3. Обновить страницу: Ctrl+Shift+R
```

**Или программно:**
```javascript
// В консоли браузера
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister())
  console.log('All service workers unregistered')
  location.reload()
})
```

### Причина 2: Кэш браузера возвращает старые URL

**Описание:**
Браузер кэширует API ответы и использует старые URL с `localhost:5174`.

**Решение:**
1. Очистить кэш браузера: `Ctrl+Shift+R` (Windows/Linux) или `Cmd+Shift+R` (Mac)
2. Или: Settings → Privacy → Clear browsing data → Cached images and files

### Причина 3: Axios baseURL переопределяется где-то в коде

**Описание:**
Где-то в коде может быть переопределение `axios.defaults.baseURL` на абсолютный URL.

**Проверка:**
```bash
# Поиск всех мест, где используется baseURL
grep -rn "baseURL" frontend/src --include="*.ts" --include="*.tsx"
```

**Решение:**
Удалить или исправить переопределения baseURL.

### Причина 4: Старая версия node_modules

**Описание:**
Устаревшие зависимости могут вызывать проблемы с Vite proxy.

**Решение:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Причина 5: Vite dev server не перезапущен после изменения .env

**Описание:**
Изменения в `.env` файле не применяются автоматически - нужен рестарт dev сервера.

**Решение:**
```bash
# Перезапустить фронтенд контейнер
docker compose restart frontend

# Или если запущен локально
npm run dev
```

---

## ✅ Пошаговое решение

### Шаг 1: Удалить Service Worker

#### Вариант A: Через DevTools (рекомендуется)

1. Открыть `http://localhost:5174/dashboard/issues`
2. F12 → Application → Service Workers
3. Если есть активные Service Workers:
   - Нажать "Unregister" для каждого
   - Application → Storage → "Clear site data"
4. Закрыть и снова открыть вкладку

#### Вариант B: Через консоль браузера

```javascript
// В консоли (F12 → Console)
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log(`Found ${registrations.length} service workers`)
  registrations.forEach((reg, index) => {
    console.log(`Unregistering service worker ${index + 1}...`)
    reg.unregister()
  })
  console.log('✅ All service workers unregistered')
  console.log('Reloading page...')
  setTimeout(() => location.reload(), 1000)
})
```

### Шаг 2: Очистить кэш браузера

```
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

Или:
```
Settings → Privacy and Security → Clear browsing data
→ Выбрать: Cached images and files
→ Clear data
```

### Шаг 3: Перезапустить frontend контейнер

```bash
cd /Users/kairatkhidirboev/Projects/checksite

# Перезапустить только frontend
docker compose restart frontend

# Проверить логи
docker compose logs frontend --tail=50
```

### Шаг 4: Проверить работу кнопки

1. Открыть `http://localhost:5174/dashboard/issues`
2. F12 → Network → Clear (очистить историю)
3. Попробовать нажать кнопку "На проверку" или "Принять"
4. **Проверить URL в Network:**
   - ✅ Правильно: `http://backend:8000/api/issues/issues/17/update_status/`
   - ✅ Или: `/api/issues/issues/17/update_status/` (относительный)
   - ❌ Неправильно: `http://localhost:5174/api/issues/issues/17/update_status/`

### Шаг 5: Если не помогло - полная очистка

```bash
# 1. Остановить контейнеры
docker compose down

# 2. Очистить node_modules и переустановить зависимости
cd frontend
rm -rf node_modules package-lock.json .vite
npm install

# 3. Вернуться в корень и запустить
cd ..
docker compose up -d --build frontend

# 4. Проверить логи
docker compose logs -f frontend
```

---

## 🧪 Тестирование

### Тест 1: Проверка Service Worker

```javascript
// В консоли браузера (F12 → Console)
navigator.serviceWorker.getRegistrations().then(registrations => {
  if (registrations.length === 0) {
    console.log('✅ Service Workers: НЕТ (правильно для dev режима)')
  } else {
    console.log('❌ Service Workers: НАЙДЕНО', registrations.length)
    console.log('Нужно удалить!')
  }
})
```

### Тест 2: Проверка axios baseURL

```javascript
// В консоли браузера
import('./src/api/axios').then(module => {
  console.log('axios baseURL:', module.default.defaults.baseURL)
  // Ожидается: '/api'
})
```

### Тест 3: Проверка переменных окружения

```javascript
// В консоли браузера
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL)
// Ожидается: '/api' или undefined (тогда fallback '/api')

console.log('VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL)
// Ожидается: 'http://localhost:8001'
```

### Тест 4: Ручной API запрос

```javascript
// В консоли браузера
fetch('/api/issues/issues/', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
})
.then(r => r.json())
.then(data => console.log('✅ API работает:', data))
.catch(err => console.error('❌ API ошибка:', err))
```

---

## 📊 Сравнительная таблица: Правильный vs Неправильный URL

| Параметр | Правильно ✅ | Неправильно ❌ | Причина |
|----------|-------------|----------------|---------|
| **Host** | `backend:8000` или отсутствует (относительный) | `localhost:5174` | Vite proxy работает только с относительными URL |
| **Path** | `/api/issues/issues/17/update_status/` | `/api/issues/issues/17/update_status/` | Path правильный в обоих случаях |
| **Полный URL (правильно)** | `http://backend:8000/api/issues/issues/17/update_status/` | - | Backend обрабатывает запрос |
| **Полный URL (ошибка)** | - | `http://localhost:5174/api/issues/issues/17/update_status/` | Frontend не может обработать API запрос |

---

## 🎯 Итоговая диагностика

### Наиболее вероятная причина

> ⚠️ **Service Worker от PWA продолжает работать и перехватывает API запросы, добавляя абсолютный URL с `localhost:5174`**

**Почему это происходит:**
1. Service Worker был зарегистрирован когда `devOptions.enabled: true`
2. Даже после изменения конфига на `false`, Service Worker остаётся активным
3. Service Worker перехватывает fetch запросы и подставляет `window.location.origin` (localhost:5174)
4. Vite proxy не может обработать запросы с явным указанием хоста

**Быстрое решение (30 секунд):**
```javascript
// В консоли браузера (F12 → Console)
navigator.serviceWorker.getRegistrations().then(r =>
  r.forEach(sw => sw.unregister()) && location.reload()
)
```

---

## 📝 Контрольный чек-лист

- [ ] **1. Проверить Service Workers в DevTools**
  - F12 → Application → Service Workers
  - Если есть активные → Unregister all

- [ ] **2. Очистить Storage**
  - Application → Storage → Clear site data

- [ ] **3. Очистить кэш браузера**
  - Ctrl+Shift+R

- [ ] **4. Перезапустить frontend**
  - `docker compose restart frontend`

- [ ] **5. Проверить URL в Network**
  - F12 → Network → попробовать кнопку
  - URL должен быть относительным или на backend:8000

- [ ] **6. Проверить работу кнопок**
  - "На проверку" → должно изменить статус
  - "Принять" → должно завершить замечание

- [ ] **7. Если не помогло → полная переустановка**
  - `rm -rf frontend/node_modules frontend/.vite`
  - `cd frontend && npm install`
  - `docker compose up -d --build frontend`

---

## 📞 Дополнительная диагностика

### Если проблема осталась после всех шагов

1. **Проверить network запросы подробно:**
   ```
   F12 → Network → Name → Правый клик → Copy → Copy as cURL
   Отправить команду для анализа
   ```

2. **Проверить axios interceptors:**
   ```javascript
   // Возможно, есть interceptor, который модифицирует URL
   // Проверить в файлах:
   // - frontend/src/api/axios.ts
   // - frontend/src/hooks/*.ts
   ```

3. **Проверить логи backend:**
   ```bash
   docker compose logs backend --tail=100 | grep "update_status"
   ```

4. **Попробовать curl напрямую:**
   ```bash
   docker compose exec backend curl -X POST \
     http://backend:8000/api/issues/issues/17/update_status/ \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"status": "PENDING_REVIEW"}'
   ```

---

**Дата создания:** 2025-11-02
**Автор:** Claude Code
**Версия:** 1.0
