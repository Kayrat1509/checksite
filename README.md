# Check Site - Система контроля качества строительных работ

Комплексная система для управления строительными проектами, замечаниями, проверками и отчетностью.

## 📋 Возможности

- **Управление пользователями** - Ролевая система с разными уровнями доступа
- **Проекты и участки** - Создание и управление строительными объектами
- **Замечания** - Система "До → После → Осмотр" с фотофиксацией
- **Уведомления** - WebSocket для real-time уведомлений, Telegram и Email
- **Отчеты** - Генерация PDF и Excel отчетов
- **API** - Полнофункциональный REST API с документацией Swagger
- **PWA** - Поддержка оффлайн-режима

## 🏗️ Технологический стек

### Backend
- Django 4.2 + Django REST Framework
- Channels (WebSocket)
- Celery + Redis (асинхронные задачи)
- PostgreSQL
- drf-spectacular (Swagger/OpenAPI)

### Frontend
- React 18 + TypeScript
- Vite
- Ant Design
- Zustand (state management)
- React Query (API client)
- Leaflet (maps)

### Infrastructure
- Docker + Docker Compose
- Nginx (reverse proxy)
- Flower (Celery monitoring)

## 🚀 Быстрый старт

### Предварительные требования

- Docker 20.10+
- Docker Compose 2.0+

### Установка и запуск

1. Клонируйте репозиторий (или убедитесь, что вы в папке проекта):
```bash
cd /Users/kairatkhidirboev/Projects/checksite
```

2. Создайте файлы окружения:
```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

3. Отредактируйте переменные окружения в `backend/.env`:
```env
SECRET_KEY=your-secret-key-here
DEBUG=True
DB_NAME=checksite_db
DB_USER=checksite_user
DB_PASSWORD=checksite_password
```

4. Соберите и запустите контейнеры:
```bash
docker-compose up --build
```

5. Подождите, пока все сервисы запустятся. Первый запуск может занять несколько минут.

### Доступ к сервисам

После успешного запуска:

- **Frontend**: http://localhost:5174
- **Backend API**: http://localhost:8001/api/
- **API Documentation (Swagger)**: http://localhost:8001/api/docs/
- **Django Admin**: http://localhost:8001/admin/
- **Flower (Celery)**: http://localhost:5555
- **Nginx**: http://localhost:8080

### Учетные данные по умолчанию

**Суперпользователь** (создается автоматически):
- Email: `admin@checksite.com`
- Пароль: `admin123`

⚠️ **ВАЖНО**: Смените пароль после первого входа!

## 📦 Структура проекта

```
checksite/
├── backend/                 # Django Backend
│   ├── apps/               # Django приложения
│   │   ├── users/         # Пользователи и авторизация
│   │   ├── projects/      # Проекты и участки
│   │   ├── issues/        # Замечания
│   │   ├── notifications/ # Уведомления и WebSocket
│   │   └── reports/       # Отчеты
│   ├── config/            # Настройки Django
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── api/          # API клиенты
│   │   ├── components/   # React компоненты
│   │   ├── pages/        # Страницы
│   │   ├── stores/       # Zustand хранилища
│   │   └── App.tsx
│   ├── Dockerfile
│   └── package.json
├── nginx/                  # Nginx конфигурация
├── docker-compose.yml
└── README.md
```

## 🔧 Разработка

### Backend

Запуск тестов:
```bash
docker-compose exec backend pytest
```

Создание миграций:
```bash
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
```

Создание суперпользователя:
```bash
docker-compose exec backend python manage.py createsuperuser
```

Сбор статических файлов:
```bash
docker-compose exec backend python manage.py collectstatic --noinput
```

### Frontend

Установка зависимостей (локально):
```bash
cd frontend
npm install
```

Запуск dev-сервера (локально):
```bash
npm run dev
```

Сборка для production:
```bash
npm run build
```

## 🐳 Docker команды

Остановить все контейнеры:
```bash
docker-compose down
```

Остановить и удалить volumes:
```bash
docker-compose down -v
```

Пересобрать контейнеры:
```bash
docker-compose build --no-cache
```

Просмотр логов:
```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f backend
docker-compose logs -f frontend
```

Выполнение команд внутри контейнера:
```bash
docker-compose exec backend bash
docker-compose exec frontend sh
```

## 📱 API Документация

API документация доступна через Swagger UI:
- **Swagger UI**: http://localhost:8001/api/docs/
- **ReDoc**: http://localhost:8001/api/redoc/
- **OpenAPI Schema**: http://localhost:8001/api/schema/

### Основные эндпоинты

- `POST /api/auth/token/` - Получение JWT токена
- `POST /api/auth/token/refresh/` - Обновление токена
- `GET /api/auth/users/me/` - Текущий пользователь
- `GET /api/projects/projects/` - Список проектов
- `GET /api/issues/issues/` - Список замечаний
- `GET /api/notifications/notifications/` - Уведомления

## 🔒 Безопасность

- JWT авторизация
- CORS защита
- Rate limiting
- CSRF защита
- Хеширование паролей (bcrypt)
- HTTPS ready

## 📊 Мониторинг

**Flower** - мониторинг Celery задач:
- URL: http://localhost:5555
- Отслеживание выполнения задач
- Просмотр статистики workers
- Управление задачами

## 🧪 Тестирование

Backend тесты:
```bash
docker-compose exec backend pytest --cov
```

Frontend тесты:
```bash
cd frontend
npm test
```

## 🤝 Вклад в проект

1. Создайте feature branch
2. Внесите изменения
3. Напишите тесты
4. Отправьте pull request

## 📝 Лицензия

MIT License

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи: `docker-compose logs`
2. Убедитесь, что все контейнеры запущены: `docker-compose ps`
3. Пересоберите контейнеры: `docker-compose build --no-cache`

---

**Check Site** - Прозрачный контроль качества строительства 🏗️
