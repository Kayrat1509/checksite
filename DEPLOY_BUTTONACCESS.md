# 🚀 Инструкция: Деплой ButtonAccess на продакшн

## 🔍 Проблема
На продакшн-сервере https://admin.stroyka.asia/admin/core/buttonaccess/ отображается **0 кнопок**,
в то время как на локальной разработке http://localhost:8001/admin/core/buttonaccess/ их **54**.

## ✅ Причина
После деплоя новой функциональности не была запущена команда `populate_button_access`,
которая создает записи в таблице `core_button_access` в базе данных.

---

## 📋 Решение (выполнить на продакшн-сервере)

### Вариант 1: Через Makefile (рекомендуется)

```bash
# Подключиться к продакшн-серверу
ssh user@stroyka.asia

# Перейти в директорию проекта
cd /path/to/checksite

# Запустить команду через Makefile
make populate-button-access
```

### Вариант 2: Через Docker напрямую

```bash
# Если используется Docker Compose
docker compose exec backend python manage.py populate_button_access

# Если используется Docker Compose в продакшн-конфигурации
docker compose -f docker-compose.prod.yml exec backend python manage.py populate_button_access
```

### Вариант 3: Без Docker

```bash
# Активировать виртуальное окружение
source venv/bin/activate

# Запустить команду Django
python manage.py populate_button_access
```

---

## ✨ Результат

После выполнения команды вы увидите:

```
Начинаем заполнение матрицы доступа к кнопкам...
  ✓ Создано: projects - Создать проект
  ✓ Создано: projects - Редактировать
  ✓ Создано: projects - Удалить
  ...
  (еще 51 запись)
  ...
================================================================================
Завершено! Создано: 54, Обновлено: 0
================================================================================
```

После этого в админ-панели https://admin.stroyka.asia/admin/core/buttonaccess/
появятся все 54 кнопки с настройками доступа.

---

## 🔄 Для автоматизации будущих деплоев

### Добавить в скрипт деплоя

Если у вас есть скрипт деплоя (например, `deploy.sh`), добавьте туда команду:

```bash
#!/bin/bash

# ... другие команды деплоя ...

# Применить миграции
docker compose exec backend python manage.py migrate

# ВАЖНО: Заполнить матрицы доступа
docker compose exec backend python manage.py create_page_access
docker compose exec backend python manage.py populate_button_access

# ... остальные команды ...
```

### Через CI/CD (GitHub Actions / GitLab CI)

Добавьте шаг в pipeline после миграций:

```yaml
- name: Populate Access Matrix
  run: |
    docker compose exec -T backend python manage.py create_page_access
    docker compose exec -T backend python manage.py populate_button_access
```

---

## 🎯 Что делает команда?

Команда `populate_button_access` создает записи для управления доступом к кнопкам на странцах:

- **projects** (6 кнопок): create, edit, delete, view_details, export_excel, import_excel
- **users** (7 кнопок): create, edit, delete, export_excel, import_excel, reset_password, view_details
- **contractors** (6 кнопок): create, edit, delete, export_excel, import_excel, view_details
- **issues** (8 кнопок): create, edit, delete, change_status, assign, add_comment, upload_photo, view_details
- **warehouse** (6 кнопок): create_item, edit_item, delete_item, move_items, write_off, view_details
- **material-requests** (6 кнопок): create, edit, delete, approve, reject, view_details
- **tenders** (5 кнопок): create, edit, delete, view_details, submit_bid
- **supervisions** (6 кнопок): create, edit, delete, export_excel, import_excel, view_details
- **reports** (4 кнопки): generate, export_pdf, export_excel, view_details

**Итого: 54 кнопки**

Каждая кнопка настраивается индивидуально для каждой роли через админ-панель.

---

## 🔧 Проверка результата

1. Откройте админ-панель: https://admin.stroyka.asia/admin/core/buttonaccess/
2. Должно отображаться **54 записи ButtonAccess**
3. Каждая запись содержит галочки для ролей (DIRECTOR, CHIEF_ENGINEER, и т.д.)
4. Измените галочки и проверьте, что кнопки появляются/исчезают на фронтенде

---

## 📞 Поддержка

Если команда не работает или возникли проблемы:

1. Проверьте, что миграции применены: `docker compose exec backend python manage.py showmigrations`
2. Проверьте логи: `docker compose logs backend`
3. Проверьте подключение к БД: `docker compose exec backend python manage.py dbshell`

---

**Дата создания:** 2025-11-02
**Автор:** Claude Code Assistant
