# 📂 ПОЛНАЯ АРХИТЕКТУРА ПРОЕКТА CHECKSITE

> Обновлено: 12 октября 2025
> Версия: 2.0

---

## 📁 Структура файлов проекта

```
/Users/kairatkhidirboev/Projects/checksite/
│
├── 📋 Документация
│   ├── CLAUDE.md                    # Инструкции для Claude AI
│   ├── README.md                    # Основная документация
│   ├── PROJECT_STRUCTURE.md         # Описание структуры проекта (этот файл)
│   ├── QUICKSTART.md               # Быстрый старт
│   └── TZ.txt                      # Техническое задание
│
├── 🐳 Docker конфигурация
│   ├── docker-compose.yml          # Конфигурация всех сервисов
│   └── Makefile                    # Команды для управления проектом
│
├── 🔧 Backend (Django 4.2 + DRF)
│   ├── apps/                       # Django приложения
│   │   │
│   │   ├── users/                  # 👥 Управление пользователями
│   │   │   ├── models.py          # User, Company модели
│   │   │   │   └── User.Role: SUPERADMIN, DIRECTOR, CHIEF_ENGINEER,
│   │   │   │                 PROJECT_MANAGER, ENGINEER, SITE_MANAGER,
│   │   │   │                 FOREMAN, MASTER, SUPERVISOR, CONTRACTOR, OBSERVER
│   │   │   ├── views.py           # UserViewSet, RegisterView, Login/Logout
│   │   │   ├── serializers.py     # UserSerializer, CompanySerializer, JWT
│   │   │   ├── permissions.py     # IsOwnerOrReadOnly, CanManageUsers
│   │   │   ├── signals.py         # Создание профиля при регистрации
│   │   │   ├── admin.py           # Админ-панель для User и Company
│   │   │   ├── urls.py            # URL маршруты (/api/auth/, /api/users/)
│   │   │   ├── tests.py           # Pytest тесты (auth, permissions)
│   │   │   └── migrations/        # Миграции БД
│   │   │
│   │   ├── projects/               # 🏗️ Управление проектами
│   │   │   ├── models.py          # Project, Site, Category, Drawing
│   │   │   │   ├── Project: название, адрес, дата начала/окончания, компания
│   │   │   │   ├── Site: участок проекта (корпус, блок)
│   │   │   │   ├── Category: категории замечаний (Бетонные работы, Отделка...)
│   │   │   │   └── Drawing: чертежи проекта с загрузкой файлов
│   │   │   ├── views.py           # CRUD для проектов, участков, категорий
│   │   │   ├── serializers.py     # Вложенные сериализаторы с участками
│   │   │   ├── admin.py           # Админ-панель
│   │   │   ├── urls.py            # URL маршруты (/api/projects/)
│   │   │   └── migrations/        # Миграции БД
│   │   │
│   │   ├── issues/                 # 📝 Управление замечаниями ⭐ ОСНОВНОЙ МОДУЛЬ
│   │   │   ├── models.py          # Issue, IssuePhoto, IssueComment
│   │   │   │   ├── Issue: замечание с статусом, приоритетом, дедлайном
│   │   │   │   │   └── Status: NEW, IN_PROGRESS, PENDING_REVIEW, COMPLETED, OVERDUE, REJECTED
│   │   │   │   │   └── Priority: CRITICAL, HIGH, NORMAL
│   │   │   │   ├── IssuePhoto: фото замечания (До/После/Осмотр)
│   │   │   │   │   └── Stage: BEFORE, AFTER, INSPECTION
│   │   │   │   └── IssueComment: комментарии к замечанию
│   │   │   ├── views.py           # IssueViewSet с кастомными действиями
│   │   │   │   ├── upload_photo() - ⭐ Загрузка фото к замечанию (line 171)
│   │   │   │   ├── update_status() - Изменение статуса
│   │   │   │   ├── add_comment() - Добавление комментария
│   │   │   │   ├── my_issues() - Мои замечания
│   │   │   │   ├── pending_review() - На проверке
│   │   │   │   ├── overdue() - Просроченные
│   │   │   │   └── statistics() - Статистика
│   │   │   ├── serializers.py     # IssueSerializer, IssuePhotoSerializer
│   │   │   ├── signals.py         # Уведомления при изменении замечаний
│   │   │   ├── tasks.py           # Celery задачи (проверка просрочек)
│   │   │   ├── admin.py           # Админ-панель с inline фото
│   │   │   ├── urls.py            # URL маршруты (/api/issues/)
│   │   │   ├── tests.py           # Pytest тесты
│   │   │   └── migrations/        # Миграции БД
│   │   │
│   │   ├── notifications/          # 🔔 Система уведомлений (WebSocket)
│   │   │   ├── models.py          # Notification модель
│   │   │   ├── views.py           # API для уведомлений
│   │   │   ├── consumers.py       # WebSocket Consumer (Django Channels)
│   │   │   ├── routing.py         # WebSocket URL маршруты
│   │   │   ├── serializers.py     # NotificationSerializer
│   │   │   ├── tasks.py           # Celery задачи (Email, Telegram)
│   │   │   ├── admin.py           # Админ-панель
│   │   │   ├── urls.py            # URL маршруты (/api/notifications/)
│   │   │   └── migrations/        # Миграции БД
│   │   │
│   │   └── reports/                # 📊 Генерация отчетов
│   │       ├── models.py          # (Пусто - используются модели других app)
│   │       ├── views.py           # Генерация PDF/Excel отчетов
│   │       ├── utils.py           # Утилиты (WeasyPrint, XlsxWriter)
│   │       ├── tasks.py           # Celery задачи (ежедневные отчеты)
│   │       ├── admin.py           # Админ-панель
│   │       ├── urls.py            # URL маршруты (/api/reports/)
│   │       └── migrations/        # Миграции БД
│   │
│   ├── config/                     # ⚙️ Настройки Django
│   │   ├── settings.py            # Основные настройки проекта
│   │   ├── urls.py                # Главные URL маршруты
│   │   ├── wsgi.py                # WSGI конфигурация (production)
│   │   ├── asgi.py                # ASGI конфигурация (WebSocket)
│   │   ├── celery.py              # Настройка Celery
│   │   └── middleware.py          # Кастомные middleware
│   │
│   ├── logs/                       # 📜 Логи приложения
│   │   └── debug.log
│   │
│   ├── media/                      # 📸 Загруженные файлы (фото замечаний)
│   ├── staticfiles/                # 📦 Собранные статические файлы
│   │
│   ├── Dockerfile                  # Docker образ для backend
│   ├── entrypoint.sh              # Скрипт запуска контейнера
│   ├── requirements.txt           # Python зависимости
│   ├── manage.py                  # Django management команды
│   └── pytest.ini                 # Конфигурация тестов
│
├── 💻 Frontend (React 18 + TypeScript + Vite)
│   ├── src/
│   │   │
│   │   ├── api/                   # 🌐 API клиенты (Axios)
│   │   │   ├── axios.ts          # Настройка Axios с interceptors
│   │   │   ├── auth.ts           # Auth API (login, register, refresh)
│   │   │   ├── users.ts          # Users API (CRUD пользователей)
│   │   │   ├── projects.ts       # Projects API (проекты, участки)
│   │   │   ├── issues.ts         # ⭐ Issues API + uploadPhoto (line 67)
│   │   │   └── companies.ts      # Companies API (компании)
│   │   │
│   │   ├── components/            # 🧩 React компоненты
│   │   │   └── Layout/
│   │   │       └── MainLayout.tsx # Основной layout с навигацией и сайдбаром
│   │   │
│   │   ├── pages/                 # 📄 Страницы приложения (React Router)
│   │   │   ├── Auth/
│   │   │   │   ├── Login.tsx     # Страница входа
│   │   │   │   └── Register.tsx  # Страница регистрации
│   │   │   ├── Home/
│   │   │   │   └── LandingPage.tsx # Главная страница (публичная)
│   │   │   ├── Dashboard.tsx      # Дашборд (статистика, графики)
│   │   │   ├── Issues.tsx         # ⭐ Список замечаний С НОВЫМИ КНОПКАМИ!
│   │   │   │   ├── Кнопка "Добавить фото" (line 377-385)
│   │   │   │   │   └── Для: ENGINEER, SITE_MANAGER, SUPERVISOR,
│   │   │   │   │            OBSERVER, PROJECT_MANAGER, CHIEF_ENGINEER
│   │   │   │   ├── Кнопка "Добавить фото отчет" (line 388-396)
│   │   │   │   │   └── Для: CONTRACTOR
│   │   │   │   ├── Модальное окно загрузки фото (line 677-742)
│   │   │   │   ├── Превью выбранных фото
│   │   │   │   └── Отправка на backend через uploadPhoto API
│   │   │   ├── Projects.tsx       # Управление проектами
│   │   │   ├── Users.tsx          # Управление пользователями
│   │   │   ├── Reports.tsx        # Генерация и просмотр отчетов
│   │   │   ├── Profile.tsx        # Профиль пользователя
│   │   │   └── NotFound.tsx       # 404 страница
│   │   │
│   │   ├── stores/                # 📦 Zustand stores (управление состоянием)
│   │   │   ├── authStore.ts      # Авторизация (user, tokens, login, logout)
│   │   │   └── notificationStore.ts # WebSocket уведомления
│   │   │
│   │   ├── App.tsx                # Главный компонент с роутингом
│   │   ├── main.tsx               # Точка входа React приложения
│   │   ├── index.css              # Глобальные стили
│   │   └── vite-env.d.ts          # TypeScript декларации Vite
│   │
│   ├── public/                     # Статические файлы (favicon, manifest)
│   ├── Dockerfile                  # Docker образ для frontend
│   ├── nginx.conf                  # Nginx конфигурация для production
│   ├── package.json                # NPM зависимости и скрипты
│   ├── package-lock.json           # Lockfile зависимостей
│   ├── tsconfig.json               # TypeScript конфигурация
│   ├── tsconfig.node.json          # TypeScript для Vite config
│   ├── vite.config.ts              # Vite конфигурация + PWA
│   └── index.html                  # HTML шаблон
│
├── 🌐 Nginx (Reverse Proxy)
│   ├── conf.d/
│   │   └── default.conf           # Конфигурация прокси (backend, frontend, static)
│   └── nginx.conf                 # Основная конфигурация Nginx
│
└── 📁 Другие файлы
    ├── .claude/                    # Настройки Claude Code
    │   └── settings.local.json
    ├── .gitignore                  # Git ignore правила
    └── .dockerignore               # Docker ignore правила
```

---

## 🗄️ БАЗА ДАННЫХ (PostgreSQL 15)

### Основные таблицы:

| Таблица | Описание | Ключевые поля |
|---------|----------|---------------|
| **users_user** | Пользователи системы | email, role, is_superuser, company |
| **users_company** | Компании | name, inn, legal_form, contact_email |
| **projects_project** | Проекты | name, address, start_date, end_date, company |
| **projects_site** | Участки (корпуса) | name, project, location_notes |
| **projects_category** | Категории замечаний | name, description |
| **projects_drawing** | Чертежи | title, file, project, uploaded_by |
| **issues_issue** | Замечания | title, description, status, priority, project, site, assigned_to, deadline |
| **issues_issuephoto** | Фото замечаний | issue, stage (BEFORE/AFTER), photo, uploaded_by |
| **issues_issuecomment** | Комментарии | issue, author, text, created_at |
| **notifications_notification** | Уведомления | user, message, notification_type, is_read |

### Связи между таблицами:

```
users_company
    ↓ (1:N)
users_user ──────────────┐
    ↓ (1:N)              │
projects_project         │
    ↓ (1:N)              │ (создатель)
projects_site            │
    ↓ (1:N)              ↓
issues_issue ←───────────┘
    ↓ (1:N)
issues_issuephoto
issues_issuecomment
```

---

## 🐳 DOCKER КОНТЕЙНЕРЫ

| Контейнер | Сервис | Порт хоста → Порт контейнера | Описание |
|-----------|--------|------------------------------|----------|
| **checksite_backend** | backend | 8001 → 8000 | Django + DRF + Channels API сервер |
| **checksite_frontend** | frontend | 5174 → 80 | React приложение (Vite dev или Nginx prod) |
| **checksite_db** | db | 5433 → 5432 | PostgreSQL 15 база данных |
| **checksite_redis** | redis | 6379 → 6379 | Redis (кэш, Celery broker, Channels layer) |
| **checksite_celery** | celery | - | Celery воркер (фоновые задачи) |
| **checksite_celery_beat** | celery-beat | - | Celery Beat (планировщик периодических задач) |
| **checksite_flower** | flower | 5555 → 5555 | Мониторинг Celery задач (UI) |
| **checksite_nginx** | nginx | 8080 → 80 | Реверс-прокси (опционально, для production) |

### Volumes (персистентные данные):

- `postgres_data` - Данные PostgreSQL
- `static_volume` - Статические файлы Django (CSS, JS, admin)
- `media_volume` - Загруженные медиа файлы (фото замечаний, чертежи)

---

## 🔑 КЛЮЧЕВЫЕ ФАЙЛЫ ПРОЕКТА

### Backend (Django):

| Файл | Строки | Описание |
|------|--------|----------|
| `backend/config/settings.py` | - | Главные настройки Django (DB, CORS, JWT, Celery) |
| `backend/apps/issues/views.py` | 171-186 | **Endpoint загрузки фото к замечанию** |
| `backend/apps/issues/models.py` | 131-160 | Модель IssuePhoto (Stage: BEFORE/AFTER/INSPECTION) |
| `backend/apps/users/models.py` | 77-88 | Роли пользователей (11 ролей) |
| `backend/config/celery.py` | - | Настройка Celery для фоновых задач |
| `backend/apps/notifications/consumers.py` | - | WebSocket consumer для real-time уведомлений |

### Frontend (React + TypeScript):

| Файл | Строки | Описание |
|------|--------|----------|
| `frontend/src/pages/Issues.tsx` | **371-398** | **⭐ Кнопки "Добавить фото" и "Добавить фото отчет"** |
| `frontend/src/pages/Issues.tsx` | 66-76 | Проверка прав доступа (canAddPhotoBefore, canAddPhotoAfter) |
| `frontend/src/pages/Issues.tsx` | 127-141 | Мутация для загрузки фото (React Query) |
| `frontend/src/pages/Issues.tsx` | 172-189 | Обработчик загрузки фото (handlePhotoUpload) |
| `frontend/src/pages/Issues.tsx` | 677-742 | Модальное окно выбора и загрузки фото |
| `frontend/src/api/issues.ts` | 67-74 | API функция uploadPhoto (POST /issues/{id}/upload_photo/) |
| `frontend/src/stores/authStore.ts` | - | Zustand store для управления авторизацией |

### Docker:

| Файл | Описание |
|------|----------|
| `docker-compose.yml` | Описание всех сервисов и их взаимодействия |
| `backend/Dockerfile` | Docker образ для Django backend |
| `frontend/Dockerfile` | Docker образ для React frontend |
| `backend/entrypoint.sh` | Скрипт инициализации backend (миграции, collectstatic) |

---

## 🚀 URL АДРЕСА

### Основные адреса:

- **Frontend (React):** http://localhost:5174
- **Backend API:** http://localhost:8001/api/
- **Admin Panel:** http://localhost:8001/admin/
- **API Documentation (Swagger):** http://localhost:8001/api/schema/swagger-ui/
- **API Documentation (ReDoc):** http://localhost:8001/api/schema/redoc/
- **Flower (Celery Monitor):** http://localhost:5555
- **WebSocket:** ws://localhost:8001/ws/notifications/

### Структура API endpoints:

```
/api/
├── /auth/                          # Авторизация (JWT)
│   ├── /token/                    # POST - Получить токен
│   ├── /token/refresh/            # POST - Обновить токен
│   └── /token/verify/             # POST - Проверить токен
│
├── /users/                         # Пользователи
│   ├── /                          # GET, POST
│   ├── /{id}/                     # GET, PATCH, DELETE
│   ├── /me/                       # GET - Текущий пользователь
│   ├── /update_profile/           # PATCH - Обновить профиль
│   └── /change_password/          # POST - Сменить пароль
│
├── /projects/                      # Проекты
│   ├── /projects/                 # GET, POST
│   ├── /projects/{id}/            # GET, PATCH, DELETE
│   ├── /sites/                    # GET, POST - Участки
│   ├── /categories/               # GET, POST - Категории
│   └── /drawings/                 # GET, POST - Чертежи
│
├── /issues/                        # Замечания ⭐
│   ├── /issues/                   # GET, POST - Список/создание
│   ├── /issues/{id}/              # GET, PATCH, DELETE - Детали
│   ├── /issues/{id}/update_status/ # POST - Изменить статус
│   ├── /issues/{id}/upload_photo/ # POST - ⭐ Загрузить фото (FormData: stage, photo)
│   ├── /issues/{id}/add_comment/  # POST - Добавить комментарий
│   ├── /issues/my_issues/         # GET - Мои замечания
│   ├── /issues/pending_review/    # GET - На проверке
│   ├── /issues/overdue/           # GET - Просроченные
│   └── /issues/statistics/        # GET - Статистика
│
├── /notifications/                 # Уведомления
│   ├── /                          # GET - Список уведомлений
│   ├── /{id}/mark_read/           # POST - Отметить прочитанным
│   ├── /mark_all_read/            # POST - Отметить все
│   └── /unread_count/             # GET - Количество непрочитанных
│
└── /reports/                       # Отчеты
    ├── /project_summary/          # POST - Отчет по проекту (PDF/Excel)
    ├── /contractor_performance/   # POST - Отчет по подрядчику
    ├── /overdue_issues/           # POST - Просроченные замечания
    └── /dashboard_stats/          # GET - Статистика для дашборда
```

---

## 📦 ОСНОВНЫЕ ТЕХНОЛОГИИ

### Backend:

| Технология | Версия | Назначение |
|------------|--------|------------|
| **Python** | 3.11 | Язык программирования |
| **Django** | 4.2 | Web framework |
| **Django REST Framework** | 3.14 | REST API |
| **Django Channels** | 4.0 | WebSocket support |
| **Celery** | 5.3 | Асинхронные задачи |
| **PostgreSQL** | 15 | Реляционная база данных |
| **Redis** | 7 | Кэш, брокер сообщений, Channels layer |
| **JWT (Simple JWT)** | 5.3 | Авторизация через токены |
| **Pillow** | 10.0 | Обработка изображений |
| **WeasyPrint** | 60.0 | Генерация PDF отчетов |
| **XlsxWriter** | 3.1 | Генерация Excel отчетов |
| **drf-spectacular** | 0.27 | OpenAPI/Swagger документация |
| **pytest** | 7.4 | Тестирование |
| **Flower** | 2.0 | Мониторинг Celery |

### Frontend:

| Технология | Версия | Назначение |
|------------|--------|------------|
| **React** | 18.2 | UI библиотека |
| **TypeScript** | 5.2 | Типизация JavaScript |
| **Vite** | 5.0 | Сборщик и dev сервер |
| **Ant Design** | 5.12 | UI компоненты |
| **Zustand** | 4.4 | State management (легковесная альтернатива Redux) |
| **React Query (TanStack Query)** | 5.0 | Управление серверным состоянием, кэширование |
| **React Router** | 6.20 | Маршрутизация |
| **Axios** | 1.6 | HTTP клиент |
| **Socket.io Client** | 4.6 | WebSocket клиент |
| **Leaflet** | 1.9 | Интерактивные карты |
| **Day.js** | 1.11 | Работа с датами |
| **Recharts** | 2.10 | Графики и диаграммы |

### DevOps:

| Технология | Назначение |
|------------|------------|
| **Docker** | Контейнеризация приложений |
| **Docker Compose** | Оркестрация контейнеров |
| **Nginx** | Reverse proxy, статические файлы |
| **Gunicorn** | WSGI сервер для Django |
| **Daphne** | ASGI сервер для Django Channels |

---

## 👥 РОЛИ ПОЛЬЗОВАТЕЛЕЙ И ПРАВА ДОСТУПА

### Роли в системе (backend/apps/users/models.py:77-88):

| Роль | Код | Описание | Права на добавление фото |
|------|-----|----------|--------------------------|
| **Суперадмин** | `SUPERADMIN` | Полный доступ ко всему | ✅ Фото "До" |
| **Директор** | `DIRECTOR` | Руководитель компании | ✅ Фото "До" |
| **Главный инженер** | `CHIEF_ENGINEER` | Главный инженер проекта | ✅ Фото "До" |
| **Руководитель проекта** | `PROJECT_MANAGER` | Менеджер проекта | ✅ Фото "До" |
| **Инженер ПТО** | `ENGINEER` | Инженерно-технический работник | ✅ Фото "До" |
| **Начальник участка** | `SITE_MANAGER` | Руководитель участка | ✅ Фото "До" |
| **Прораб** | `FOREMAN` | Производитель работ | ❌ |
| **Мастер** | `MASTER` | Мастер участка | ❌ |
| **Технадзор** | `SUPERVISOR` | Технический надзор | ✅ Фото "До" |
| **Подрядчик** | `CONTRACTOR` | Исполнитель работ | ✅ Фото "После" (отчет) |
| **Наблюдатель** | `OBSERVER` | Авторский надзор, клиент | ✅ Фото "До" |

### Логика кнопок в Issues.tsx:

```typescript
// Кнопка "Добавить фото" (frontend/src/pages/Issues.tsx:66-70)
const canAddPhotoBefore = () => {
  if (!user) return false
  const allowedRoles = ['ENGINEER', 'SITE_MANAGER', 'SUPERVISOR',
                        'OBSERVER', 'PROJECT_MANAGER', 'CHIEF_ENGINEER']
  return user.is_superuser || allowedRoles.includes(user.role)
}

// Кнопка "Добавить фото отчет" (frontend/src/pages/Issues.tsx:73-76)
const canAddPhotoAfter = () => {
  if (!user) return false
  return user.role === 'CONTRACTOR'
}
```

---

## 🔧 КОМАНДЫ ДЛЯ РАБОТЫ С ПРОЕКТОМ

### Запуск проекта:

```bash
# Запустить все контейнеры
docker-compose up -d

# Запустить с пересборкой
docker-compose up -d --build

# Остановить все контейнеры
docker-compose down

# Перезапустить контейнеры
docker-compose restart

# Перезапустить только backend и frontend
docker-compose restart backend frontend
```

### Работа с backend:

```bash
# Выполнить миграции
docker-compose exec backend python manage.py migrate

# Создать суперпользователя
docker-compose exec backend python manage.py createsuperuser

# Собрать статические файлы
docker-compose exec backend python manage.py collectstatic --noinput

# Запустить тесты
docker-compose exec backend pytest --cov

# Открыть Django shell
docker-compose exec backend python manage.py shell

# Просмотр логов
docker-compose logs backend -f
```

### Работа с frontend:

```bash
# Установить зависимости
docker-compose exec frontend npm install

# Пересобрать frontend
docker-compose up -d --build frontend

# Просмотр логов
docker-compose logs frontend -f
```

### Работа с базой данных:

```bash
# Подключиться к PostgreSQL
docker-compose exec db psql -U checksite_user -d checksite_db

# Создать дамп базы данных
docker-compose exec db pg_dump -U checksite_user checksite_db > backup.sql

# Восстановить из дампа
docker-compose exec -T db psql -U checksite_user checksite_db < backup.sql
```

---

## 🧪 ТЕСТИРОВАНИЕ

### Backend тесты (pytest):

```bash
# Запустить все тесты
docker-compose exec backend pytest

# Запустить с покрытием кода
docker-compose exec backend pytest --cov --cov-report=html

# Запустить конкретный файл тестов
docker-compose exec backend pytest apps/issues/tests.py

# Запустить с verbose выводом
docker-compose exec backend pytest -v
```

### Структура тестов:

```
backend/apps/
├── users/tests.py          # Тесты авторизации, пользователей
├── projects/tests.py       # Тесты проектов, участков
├── issues/tests.py         # Тесты замечаний, фото, комментариев
├── notifications/tests.py  # Тесты уведомлений
└── reports/tests.py        # Тесты генерации отчетов
```

---

## 🔐 БЕЗОПАСНОСТЬ

### Реализованные меры:

1. **Аутентификация:**
   - JWT токены (access + refresh)
   - Автоматическое обновление токенов
   - Logout с удалением токенов

2. **Авторизация:**
   - Ролевая система (RBAC)
   - Кастомные Permission classes
   - Проверка прав на уровне ViewSet

3. **Защита данных:**
   - CORS protection (CORS_ALLOWED_ORIGINS)
   - CSRF protection
   - Password hashing (PBKDF2 с солью)
   - Валидация входных данных (DRF serializers)

4. **API защита:**
   - Rate limiting (настраивается)
   - Фильтрация запросов по ролям
   - Логирование всех действий

---

## 📈 МОНИТОРИНГ И ЛОГИРОВАНИЕ

### Инструменты мониторинга:

1. **Flower** (http://localhost:5555)
   - Мониторинг Celery задач
   - Статистика выполнения
   - Управление воркерами

2. **Django Debug Toolbar** (в режиме разработки)
   - SQL запросы
   - Время выполнения
   - Кэш статистика

3. **Логи:**
   - `backend/logs/debug.log` - Логи Django
   - `docker-compose logs` - Логи контейнеров

### Health checks:

Все контейнеры имеют health checks в docker-compose.yml:
- `checksite_db` - проверка PostgreSQL
- `checksite_redis` - проверка Redis
- `checksite_backend` - проверка Django

---

## ⭐ ПОСЛЕДНИЕ ИЗМЕНЕНИЯ (12.10.2025)

### Добавлен функционал загрузки фото к замечаниям:

1. **Frontend (Issues.tsx):**
   - ✅ Кнопка "Добавить фото" в карточках замечаний (line 377-385)
   - ✅ Кнопка "Добавить фото отчет" для подрядчиков (line 388-396)
   - ✅ Модальное окно выбора фото с превью (line 677-742)
   - ✅ Проверка прав доступа по ролям (line 66-76)
   - ✅ React Query мутация для загрузки (line 127-141)
   - ✅ Обработчик загрузки с FormData (line 172-189)

2. **Backend (уже существовало):**
   - ✅ Endpoint `/api/issues/{id}/upload_photo/` (views.py:171)
   - ✅ Модель IssuePhoto с полем stage (BEFORE/AFTER/INSPECTION)
   - ✅ Сериализатор для загрузки фото

3. **Docker:**
   - ✅ Frontend контейнер пересобран с новым кодом
   - ✅ Backend контейнер перезапущен

---

## 📞 ПОДДЕРЖКА

Для вопросов и предложений:
- Документация проекта: `/Users/kairatkhidirboev/Projects/checksite/README.md`
- Быстрый старт: `/Users/kairatkhidirboev/Projects/checksite/QUICKSTART.md`
- Техническое задание: `/Users/kairatkhidirboev/Projects/checksite/TZ.txt`

---

**Документ актуален на:** 12 октября 2025
**Версия проекта:** 2.0
**Автор документации:** Claude AI Assistant
