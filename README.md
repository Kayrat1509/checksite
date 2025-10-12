# 🏗️ Check Site - Система контроля качества строительных работ

> Комплексная система для управления строительными проектами, замечаниями, проверками и отчетностью.

![Version](https://img.shields.io/badge/version-2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Django](https://img.shields.io/badge/Django-4.2-green)
![React](https://img.shields.io/badge/React-18.2-blue)
![Docker](https://img.shields.io/badge/Docker-ready-blue)

---

## 📋 Основные возможности

- ✅ **Управление пользователями** - Ролевая система с 11 уровнями доступа
- ✅ **Проекты и участки** - Создание и управление строительными объектами
- ✅ **Замечания** - Система фиксации дефектов с фото "До/После" и статусами
- ✅ **Загрузка фото** - Добавление фото к замечаниям с проверкой прав по ролям
- ✅ **Уведомления** - WebSocket для real-time уведомлений, Email и Telegram
- ✅ **Отчеты** - Генерация PDF и Excel отчетов по проектам
- ✅ **API** - Полнофункциональный REST API с документацией Swagger/ReDoc
- ✅ **PWA** - Progressive Web App с поддержкой оффлайн-режима
- ✅ **Геолокация** - Привязка замечаний к карте (Leaflet)
- ✅ **Статистика** - Дашборд с графиками и аналитикой

---

## 🏗️ Технологический стек

### Backend
| Технология | Версия | Назначение |
|------------|--------|------------|
| **Python** | 3.11 | Язык программирования |
| **Django** | 4.2 | Web framework |
| **Django REST Framework** | 3.14 | REST API |
| **Django Channels** | 4.0 | WebSocket поддержка |
| **Celery** | 5.3 | Асинхронные задачи и фоновые процессы |
| **PostgreSQL** | 15 | Реляционная база данных |
| **Redis** | 7 | Кэш, брокер сообщений, Channels layer |
| **JWT (Simple JWT)** | 5.3 | Авторизация |
| **drf-spectacular** | 0.27 | OpenAPI/Swagger документация |
| **Pillow** | 10.0 | Обработка изображений |
| **WeasyPrint** | 60.0 | Генерация PDF отчетов |
| **pytest** | 7.4 | Тестирование |

### Frontend
| Технология | Версия | Назначение |
|------------|--------|------------|
| **React** | 18.2 | UI библиотека |
| **TypeScript** | 5.2 | Типизация |
| **Vite** | 5.0 | Сборщик и dev сервер |
| **Ant Design** | 5.12 | UI компоненты |
| **Zustand** | 4.4 | State management |
| **React Query** | 5.0 | API клиент и кэширование |
| **React Router** | 6.20 | Маршрутизация |
| **Axios** | 1.6 | HTTP клиент |
| **Leaflet** | 1.9 | Интерактивные карты |
| **Day.js** | 1.11 | Работа с датами |

### Infrastructure
- **Docker** + **Docker Compose** - Контейнеризация и оркестрация
- **Nginx** - Reverse proxy и статические файлы
- **Flower** - Мониторинг Celery задач
- **Gunicorn** - WSGI сервер
- **Daphne** - ASGI сервер для WebSocket

---

## 🚀 Быстрый старт

### Предварительные требования

- **Docker** 20.10+ ([Установить](https://docs.docker.com/get-docker/))
- **Docker Compose** 2.0+ ([Установить](https://docs.docker.com/compose/install/))
- **Git** (для клонирования репозитория)

### Установка и запуск

#### 1. Клонирование репозитория

```bash
git clone https://github.com/yourusername/checksite.git
cd checksite
```

Или, если вы уже в папке проекта:
```bash
cd /Users/kairatkhidirboev/Projects/checksite
```

#### 2. Создание файлов окружения

```bash
# Backend (опционально, есть значения по умолчанию)
cp backend/.env.example backend/.env

# Frontend (опционально)
cp frontend/.env.example frontend/.env
```

#### 3. Редактирование переменных окружения (опционально)

**backend/.env:**
```env
# Django
SECRET_KEY=your-very-secret-key-here-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DB_NAME=checksite_db
DB_USER=checksite_user
DB_PASSWORD=checksite_password
DB_HOST=db
DB_PORT=5432

# Redis
REDIS_URL=redis://redis:6379/0

# Celery
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# Email (опционально)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-password

# Telegram Bot (опционально)
TELEGRAM_BOT_TOKEN=your-bot-token
```

#### 4. Запуск контейнеров

```bash
# Запуск всех сервисов
docker-compose up -d --build

# Или без фоновой работы (для просмотра логов)
docker-compose up --build
```

#### 5. Ожидание готовности сервисов

Первый запуск может занять 3-5 минут. Вы можете следить за прогрессом:

```bash
docker-compose logs -f
```

Дождитесь сообщений:
- ✅ `backend` - "Django ready"
- ✅ `frontend` - "VITE ready"
- ✅ `db` - "database system is ready"

#### 6. Создание суперпользователя (опционально)

```bash
docker-compose exec backend python manage.py createsuperuser
```

Следуйте инструкциям на экране.

---

## 🌐 Доступ к сервисам

После успешного запуска все сервисы доступны по следующим адресам:

| Сервис | URL | Описание |
|--------|-----|----------|
| **Frontend** | http://localhost:5174 | React приложение |
| **Backend API** | http://localhost:8001/api/ | REST API endpoints |
| **Swagger UI** | http://localhost:8001/api/schema/swagger-ui/ | Интерактивная API документация |
| **ReDoc** | http://localhost:8001/api/schema/redoc/ | Альтернативная API документация |
| **Django Admin** | http://localhost:8001/admin/ | Админ-панель Django |
| **Flower** | http://localhost:5555 | Мониторинг Celery задач |
| **Nginx** | http://localhost:8080 | Reverse proxy (опционально) |

---

## 👥 Роли пользователей

Система поддерживает **11 ролей** с различными уровнями доступа:

| Роль | Код | Описание | Права на фото |
|------|-----|----------|---------------|
| **Суперадмин** | `SUPERADMIN` | Полный доступ | Фото "До" |
| **Директор** | `DIRECTOR` | Руководитель компании | Фото "До" |
| **Главный инженер** | `CHIEF_ENGINEER` | Главный инженер проекта | Фото "До" |
| **Руководитель проекта** | `PROJECT_MANAGER` | Менеджер проекта | Фото "До" |
| **Инженер ПТО** | `ENGINEER` | Инженерно-технический работник | Фото "До" |
| **Начальник участка** | `SITE_MANAGER` | Руководитель участка | Фото "До" |
| **Прораб** | `FOREMAN` | Производитель работ | - |
| **Мастер** | `MASTER` | Мастер участка | - |
| **Технадзор** | `SUPERVISOR` | Технический надзор | Фото "До" |
| **Подрядчик** | `CONTRACTOR` | Исполнитель работ | Фото "После" |
| **Наблюдатель** | `OBSERVER` | Авторский надзор | Фото "До" |

---

## 📦 Структура проекта

```
checksite/
├── backend/                 # Django Backend
│   ├── apps/               # Django приложения
│   │   ├── users/         # 👥 Пользователи и авторизация
│   │   ├── projects/      # 🏗️ Проекты и участки
│   │   ├── issues/        # 📝 Замечания (с загрузкой фото)
│   │   ├── notifications/ # 🔔 Уведомления и WebSocket
│   │   └── reports/       # 📊 Генерация отчетов
│   ├── config/            # ⚙️ Настройки Django
│   │   ├── settings.py   # Основные настройки
│   │   ├── urls.py       # URL конфигурация
│   │   ├── celery.py     # Настройка Celery
│   │   └── asgi.py       # ASGI для WebSocket
│   ├── Dockerfile
│   ├── requirements.txt
│   └── entrypoint.sh
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── api/          # 🌐 API клиенты (Axios)
│   │   ├── components/   # 🧩 React компоненты
│   │   ├── pages/        # 📄 Страницы
│   │   │   ├── Issues.tsx    # ⭐ С кнопками загрузки фото!
│   │   │   ├── Dashboard.tsx # Дашборд
│   │   │   └── ...
│   │   ├── stores/       # 📦 Zustand stores
│   │   └── App.tsx       # Главный компонент
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── nginx/                  # Nginx reverse proxy
├── docker-compose.yml      # Оркестрация сервисов
├── CLAUDE.md              # Инструкции для Claude AI
├── PROJECT_STRUCTURE.md   # Детальная архитектура
└── README.md              # Этот файл
```

📚 **Подробнее:** [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

---

## 🔧 Разработка

### Backend команды

```bash
# Запуск тестов
docker-compose exec backend pytest

# Запуск тестов с покрытием кода
docker-compose exec backend pytest --cov --cov-report=html

# Создание миграций
docker-compose exec backend python manage.py makemigrations

# Применение миграций
docker-compose exec backend python manage.py migrate

# Создание суперпользователя
docker-compose exec backend python manage.py createsuperuser

# Сбор статических файлов
docker-compose exec backend python manage.py collectstatic --noinput

# Django shell
docker-compose exec backend python manage.py shell

# Bash в контейнере
docker-compose exec backend bash
```

### Frontend команды

```bash
# Установка зависимостей (в контейнере)
docker-compose exec frontend npm install

# Пересборка frontend
docker-compose up -d --build frontend

# Просмотр логов
docker-compose logs frontend -f
```

### База данных

```bash
# Подключение к PostgreSQL
docker-compose exec db psql -U checksite_user -d checksite_db

# Создание дампа
docker-compose exec db pg_dump -U checksite_user checksite_db > backup.sql

# Восстановление из дампа
docker-compose exec -T db psql -U checksite_user checksite_db < backup.sql
```

---

## 🐳 Docker команды

### Управление контейнерами

```bash
# Запустить все сервисы
docker-compose up -d

# Запустить с пересборкой
docker-compose up -d --build

# Остановить все контейнеры
docker-compose down

# Остановить и удалить volumes (⚠️ удалит данные БД!)
docker-compose down -v

# Пересобрать без кэша
docker-compose build --no-cache

# Перезапустить все контейнеры
docker-compose restart

# Перезапустить конкретный сервис
docker-compose restart backend frontend
```

### Просмотр состояния

```bash
# Список запущенных контейнеров
docker-compose ps

# Просмотр логов всех сервисов
docker-compose logs -f

# Просмотр логов конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db

# Последние N строк логов
docker-compose logs --tail=100 backend
```

### Очистка

```bash
# Удалить неиспользуемые образы
docker image prune -a

# Удалить неиспользуемые volumes
docker volume prune

# Полная очистка Docker
docker system prune -a --volumes
```

---

## 📱 API Документация

### Интерактивная документация

API документация доступна в двух форматах:

- **Swagger UI**: http://localhost:8001/api/schema/swagger-ui/
  - Интерактивное тестирование API
  - Автоматическая генерация запросов

- **ReDoc**: http://localhost:8001/api/schema/redoc/
  - Красивый читаемый формат
  - Группировка по модулям

- **OpenAPI Schema**: http://localhost:8001/api/schema/
  - JSON схема для интеграций

### Основные эндпоинты

#### Авторизация
```
POST /api/auth/token/           - Получение JWT токена
POST /api/auth/token/refresh/   - Обновление токена
POST /api/auth/token/verify/    - Проверка токена
GET  /api/users/me/             - Текущий пользователь
POST /api/auth/register/        - Регистрация нового пользователя
```

#### Проекты
```
GET    /api/projects/projects/     - Список проектов
POST   /api/projects/projects/     - Создать проект
GET    /api/projects/projects/{id}/ - Детали проекта
PATCH  /api/projects/projects/{id}/ - Обновить проект
GET    /api/projects/sites/        - Список участков
GET    /api/projects/categories/   - Категории замечаний
```

#### Замечания
```
GET    /api/issues/issues/                   - Список замечаний
POST   /api/issues/issues/                   - Создать замечание
GET    /api/issues/issues/{id}/              - Детали замечания
PATCH  /api/issues/issues/{id}/              - Обновить замечание
POST   /api/issues/issues/{id}/update_status/ - Изменить статус
POST   /api/issues/issues/{id}/upload_photo/ - ⭐ Загрузить фото (FormData: stage, photo)
POST   /api/issues/issues/{id}/add_comment/  - Добавить комментарий
GET    /api/issues/issues/my_issues/         - Мои замечания
GET    /api/issues/issues/pending_review/    - На проверке
GET    /api/issues/issues/overdue/           - Просроченные
GET    /api/issues/issues/statistics/        - Статистика
```

#### Уведомления
```
GET    /api/notifications/                  - Список уведомлений
POST   /api/notifications/{id}/mark_read/   - Отметить прочитанным
POST   /api/notifications/mark_all_read/    - Отметить все
GET    /api/notifications/unread_count/     - Количество непрочитанных
```

#### Отчеты
```
POST   /api/reports/project_summary/        - Отчет по проекту (PDF/Excel)
POST   /api/reports/contractor_performance/ - Отчет по подрядчику
POST   /api/reports/overdue_issues/         - Просроченные замечания
GET    /api/reports/dashboard_stats/        - Статистика для дашборда
```

#### WebSocket
```
ws://localhost:8001/ws/notifications/  - Real-time уведомления
```

### Пример использования API

```bash
# Получение токена
curl -X POST http://localhost:8001/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Использование токена
curl -X GET http://localhost:8001/api/issues/issues/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🔒 Безопасность

### Реализованные меры защиты

- ✅ **JWT авторизация** - Access и Refresh токены
- ✅ **CORS защита** - Настраиваемый список разрешенных источников
- ✅ **CSRF защита** - Django CSRF middleware
- ✅ **Rate limiting** - Ограничение количества запросов
- ✅ **Хеширование паролей** - PBKDF2 с солью
- ✅ **Ролевая система (RBAC)** - Детальный контроль прав доступа
- ✅ **Валидация входных данных** - DRF serializers
- ✅ **SQL Injection защита** - ORM Django
- ✅ **XSS защита** - Автоматическое экранирование в шаблонах
- ✅ **HTTPS ready** - Конфигурация для production

### Рекомендации для production

```python
# backend/config/settings.py

# 1. Измените SECRET_KEY
SECRET_KEY = 'your-very-long-and-random-secret-key'

# 2. Отключите DEBUG
DEBUG = False

# 3. Настройте ALLOWED_HOSTS
ALLOWED_HOSTS = ['yourdomain.com', 'www.yourdomain.com']

# 4. Включите HTTPS
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# 5. Настройте CORS
CORS_ALLOWED_ORIGINS = [
    'https://yourdomain.com',
]
```

---

## 📊 Мониторинг

### Flower - Мониторинг Celery задач

**URL:** http://localhost:5555

Возможности:
- 📈 Отслеживание выполнения задач в реальном времени
- 📊 Статистика workers и очередей
- 🔍 Просмотр истории выполненных задач
- ⚙️ Управление задачами (отмена, перезапуск)
- 📉 Графики производительности

### Логирование

```bash
# Просмотр логов Django
docker-compose logs backend -f

# Логи находятся в
backend/logs/debug.log

# Логи Celery
docker-compose logs celery -f

# Логи frontend
docker-compose logs frontend -f

# Логи базы данных
docker-compose logs db -f
```

### Health checks

Все контейнеры имеют встроенные health checks:

```bash
# Проверка состояния
docker-compose ps

# Детальная проверка конкретного сервиса
docker inspect checksite_backend | grep -A 10 Health
```

---

## 🧪 Тестирование

### Backend тесты (pytest)

```bash
# Запустить все тесты
docker-compose exec backend pytest

# Запустить с покрытием кода
docker-compose exec backend pytest --cov --cov-report=html

# Запустить конкретный модуль
docker-compose exec backend pytest apps/issues/tests.py

# Запустить с verbose выводом
docker-compose exec backend pytest -v

# Только failed тесты
docker-compose exec backend pytest --lf
```

HTML отчет о покрытии будет доступен в `backend/htmlcov/index.html`

### Структура тестов

```
backend/apps/
├── users/tests.py          # Тесты авторизации
├── projects/tests.py       # Тесты проектов
├── issues/tests.py         # Тесты замечаний
├── notifications/tests.py  # Тесты уведомлений
└── reports/tests.py        # Тесты отчетов
```

---

## ⚡ Производительность

### Оптимизация базы данных

```sql
-- Создание индексов для частых запросов
CREATE INDEX idx_issues_status ON issues_issue(status);
CREATE INDEX idx_issues_priority ON issues_issue(priority);
CREATE INDEX idx_issues_created_at ON issues_issue(created_at);
```

### Кэширование

Redis используется для кэширования:
- API ответов (настраиваемое время жизни)
- Сессий пользователей
- Celery результатов
- WebSocket сообщений

### Celery задачи

Асинхронные задачи для:
- ✅ Проверка просроченных замечаний (каждый час)
- ✅ Отправка email уведомлений
- ✅ Отправка Telegram уведомлений
- ✅ Генерация сложных отчетов
- ✅ Ежедневные сводки

---

## 🤝 Вклад в проект

Мы приветствуем вклад в развитие проекта!

### Процесс разработки

1. **Fork** репозитория
2. Создайте **feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit** изменений (`git commit -m 'Add some AmazingFeature'`)
4. **Push** в branch (`git push origin feature/AmazingFeature`)
5. Откройте **Pull Request**

### Стиль кода

- **Python**: следуйте PEP 8, используйте `black` для форматирования
- **TypeScript**: следуйте ESLint правилам
- **Комментарии**: пишите на русском языке для лучшего понимания

### Тестирование

- Все новые функции должны иметь тесты
- Покрытие кода должно быть не менее 80%
- Все тесты должны проходить перед PR

---

## 🐛 Решение проблем

### Контейнеры не запускаются

```bash
# 1. Проверьте логи
docker-compose logs

# 2. Пересоберите образы
docker-compose down
docker-compose build --no-cache
docker-compose up

# 3. Проверьте порты (они не должны быть заняты)
lsof -i :5174  # Frontend
lsof -i :8001  # Backend
lsof -i :5432  # PostgreSQL
```

### База данных недоступна

```bash
# Проверьте здоровье контейнера
docker-compose ps db

# Пересоздайте volume (⚠️ удалит данные!)
docker-compose down -v
docker-compose up -d
```

### Frontend не компилируется

```bash
# Переустановите зависимости
docker-compose exec frontend npm install

# Или пересоберите контейнер
docker-compose up -d --build frontend
```

### Миграции не применяются

```bash
# Проверьте миграции
docker-compose exec backend python manage.py showmigrations

# Примените все миграции
docker-compose exec backend python manage.py migrate

# Сбросьте миграции (⚠️ только для разработки!)
docker-compose exec backend python manage.py migrate app_name zero
```

---

## 📝 Changelog

### Version 2.0 (12.10.2025)
- ✨ Добавлена загрузка фото к замечаниям
- ✨ Кнопки "Добавить фото" и "Добавить фото отчет" в карточках
- ✨ Модальное окно с превью выбранных фото
- ✨ Проверка прав доступа по ролям
- 🐛 Исправлены различные баги
- 📚 Обновлена документация

### Version 1.0 (01.09.2025)
- 🎉 Первый релиз
- ✅ Базовый функционал управления проектами
- ✅ Система замечаний
- ✅ JWT авторизация
- ✅ WebSocket уведомления

---

## 📝 Лицензия

Этот проект лицензирован под MIT License - см. файл [LICENSE](LICENSE) для деталей.

---

## 📞 Поддержка и контакты

### Документация

- 📖 **README.md** - Этот файл (общая информация)
- 📖 **PROJECT_STRUCTURE.md** - Детальная архитектура проекта
- 📖 **QUICKSTART.md** - Быстрый старт для новых разработчиков
- 📖 **CLAUDE.md** - Инструкции для Claude AI
- 📖 **TZ.txt** - Техническое задание

### При возникновении проблем

1. 📋 Проверьте логи: `docker-compose logs -f`
2. 🔍 Убедитесь, что все контейнеры запущены: `docker-compose ps`
3. 🔨 Пересоберите контейнеры: `docker-compose build --no-cache`
4. 📚 Изучите документацию в [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
5. 💬 Создайте Issue в репозитории

### Полезные ссылки

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [React Documentation](https://react.dev/)
- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

<div align="center">

**Check Site** - Прозрачный контроль качества строительства 🏗️

[![Made with Django](https://img.shields.io/badge/Made%20with-Django-092E20?logo=django)](https://www.djangoproject.com/)
[![Made with React](https://img.shields.io/badge/Made%20with-React-61DAFB?logo=react)](https://react.dev/)
[![Powered by Docker](https://img.shields.io/badge/Powered%20by-Docker-2496ED?logo=docker)](https://www.docker.com/)

</div>
