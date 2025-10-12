# 🚀 Быстрый запуск Check Site

## Шаг 1: Подготовка окружения

```bash
# Создайте файлы .env из примеров
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

## Шаг 2: Настройка переменных (опционально)

Отредактируйте `backend/.env` при необходимости:

```env
SECRET_KEY=your-very-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,backend

DB_NAME=checksite_db
DB_USER=checksite_user
DB_PASSWORD=checksite_password
DB_HOST=db
DB_PORT=5432

REDIS_HOST=redis
REDIS_PORT=6379

CORS_ALLOWED_ORIGINS=http://localhost:5174,http://localhost:8080
```

## Шаг 3: Запуск проекта

```bash
# Соберите и запустите все сервисы
docker-compose up --build
```

Или используйте Makefile:

```bash
make build
make up
```

## Шаг 4: Проверка статуса

Дождитесь сообщения о готовности всех сервисов (обычно 2-3 минуты при первом запуске).

Проверить статус контейнеров:

```bash
docker-compose ps
```

Все контейнеры должны быть в состоянии "Up".

## Шаг 5: Доступ к приложению

Откройте в браузере:

### Основные URL

- **Frontend (React)**: http://localhost:5174
- **Backend API**: http://localhost:8001/api/
- **Swagger Docs**: http://localhost:8001/api/docs/
- **Django Admin**: http://localhost:8001/admin/
- **Nginx Proxy**: http://localhost:8080
- **Flower (Celery)**: http://localhost:5555

### Учетные данные

**Суперпользователь** (автоматически создается):
- Email: `admin@checksite.com`
- Пароль: `admin123`

⚠️ **Важно**: Смените пароль после первого входа!

## Шаг 6: Проверка функциональности

### 1. Проверка API

```bash
# Получите токен
curl -X POST http://localhost:8001/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@checksite.com","password":"admin123"}'
```

### 2. Проверка WebSocket

Подключитесь к WebSocket через frontend или используйте тестовый клиент:
- URL: `ws://localhost:8001/ws/notifications/`

### 3. Проверка Celery

Откройте Flower: http://localhost:5555

Должны быть активны workers.

## 🛠️ Полезные команды

### Остановка

```bash
docker-compose down

# или
make down
```

### Перезапуск

```bash
docker-compose restart

# или
make restart
```

### Просмотр логов

```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f backend
docker-compose logs -f frontend

# или
make logs
```

### Запуск тестов

```bash
docker-compose exec backend pytest --cov

# или
make test
```

### Применение миграций

```bash
docker-compose exec backend python manage.py migrate

# или
make migrate
```

### Создание суперпользователя вручную

```bash
docker-compose exec backend python manage.py createsuperuser

# или
make createsuperuser
```

### Вход в контейнер

```bash
# Backend
docker-compose exec backend bash

# Frontend
docker-compose exec frontend sh

# или через Makefile
make shell-backend
make shell-frontend
```

## 📊 Проверка всех компонентов

### 1. База данных (PostgreSQL)

```bash
docker-compose exec db psql -U checksite_user -d checksite_db -c "SELECT count(*) FROM auth_user;"
```

### 2. Redis

```bash
docker-compose exec redis redis-cli ping
# Ответ: PONG
```

### 3. Backend

```bash
curl http://localhost:8001/admin/
# Должен вернуть HTML страницу
```

### 4. Frontend

```bash
curl http://localhost:5174/
# Должен вернуть HTML страницу
```

## ❗ Устранение проблем

### Порты заняты

Если порты заняты, измените их в `docker-compose.yml`:

```yaml
ports:
  - "НОВЫЙ_ПОРТ:ВНУТРЕННИЙ_ПОРТ"
```

### Ошибки при сборке

```bash
# Пересоберите без кэша
docker-compose build --no-cache

# Удалите старые образы
docker system prune -a
```

### База данных не инициализируется

```bash
# Удалите volume и пересоздайте
docker-compose down -v
docker-compose up --build
```

### Backend не запускается

```bash
# Проверьте логи
docker-compose logs backend

# Проверьте подключение к БД
docker-compose exec backend python manage.py dbshell
```

## 🎯 Следующие шаги

1. Войдите в систему: http://localhost:5174/login
2. Изучите API Docs: http://localhost:8001/api/docs/
3. Создайте первый проект через админ-панель или API
4. Настройте Telegram Bot (в `.env` добавьте `TELEGRAM_BOT_TOKEN`)
5. Настройте Email (SMTP настройки в `.env`)

## 📚 Дополнительная информация

Для подробной информации см. [README.md](README.md)

---

**Готово!** Ваш Check Site работает! 🎉
