# 📋 Инструкция по синхронизации ButtonAccess с продакшн

## 🎯 Зачем нужна синхронизация?

После удаления модуля `material_requests` необходимо синхронизировать данные **ButtonAccess** (матрица доступа) между локальной и продакшн версией, чтобы:
- Удалить устаревшие записи для страницы `material-requests`
- Обновить права доступа для всех ролей
- Убрать несоответствия в админке `/admin/core/buttonaccess/`

---

## 🚀 Быстрая синхронизация (для локального тестирования)

Если вы хотите протестировать синхронизацию локально:

```bash
cd /Users/kairatkhidirboev/Projects/checksite
./sync_button_access.sh
```

Скрипт автоматически:
1. ✅ Удалит записи `material-requests`
2. ✅ Очистит таблицу `core_button_access`
3. ✅ Загрузит актуальные данные из экспорта
4. ✅ Покажет итоговую статистику

---

## 🌐 Синхронизация с ПРОДАКШН сервером

### Шаг 1: Подготовка файла экспорта

На **локальной** машине файл экспорта уже создан:
```
/Users/kairatkhidirboev/Projects/checksite/button_access_export.sql
```

### Шаг 2: Копирование файла на продакшн

Скопируйте файл на сервер:
```bash
scp button_access_export.sql kayrat1509@194.34.232.112:~/checksite/
```

### Шаг 3: Подключение к продакшн серверу

```bash
ssh kayrat1509@194.34.232.112
cd ~/checksite
```

### Шаг 4: Выполнение синхронизации

Выполните команды **по порядку**:

```bash
# 1. Удалить записи material-requests
docker compose exec db psql -U checksite_user -d checksite_db -c "DELETE FROM core_button_access WHERE page = 'material-requests';"

# 2. Очистить таблицу (удалить все записи)
docker compose exec db psql -U checksite_user -d checksite_db -c "TRUNCATE TABLE core_button_access RESTART IDENTITY CASCADE;"

# 3. Загрузить актуальные данные
docker compose exec -T db psql -U checksite_user -d checksite_db < button_access_export.sql

# 4. Проверить результат
docker compose exec db psql -U checksite_user -d checksite_db -c "SELECT COUNT(*) FROM core_button_access;"
```

**Ожидаемый результат:** `92` записи

### Шаг 5: Перезапуск backend

```bash
docker compose restart backend
```

### Шаг 6: Проверка

Откройте в браузере:
```
https://admin.stroyka.asia/admin/core/buttonaccess/
```

Проверьте:
- ❌ Нет записей для страницы `material-requests`
- ✅ Все остальные страницы присутствуют (dashboard, projects, issues, contractors, supervisions, users, reports, settings, profile, recycle-bin, tenders, warehouse)

---

## 📊 Статистика ButtonAccess после синхронизации

| Страница | Количество кнопок |
|----------|-------------------|
| contractors | 13 |
| dashboard | 4 |
| issues | 13 |
| profile | 1 |
| projects | 10 |
| recycle-bin | 1 |
| reports | 5 |
| settings | 3 |
| supervisions | 13 |
| tenders | 14 |
| users | 14 |
| warehouse | 1 |
| **ИТОГО** | **92 записи** |

---

## 🔍 Дополнительные команды

### Показать список страниц в ButtonAccess:
```bash
docker compose exec db psql -U checksite_user -d checksite_db -c "SELECT DISTINCT page, COUNT(*) as buttons FROM core_button_access GROUP BY page ORDER BY page;"
```

### Проверить наличие material-requests:
```bash
docker compose exec db psql -U checksite_user -d checksite_db -c "SELECT * FROM core_button_access WHERE page = 'material-requests';"
```
*Должно вернуть: 0 rows*

### Посмотреть список всех кнопок для конкретной страницы:
```bash
docker compose exec db psql -U checksite_user -d checksite_db -c "SELECT button_key, button_name FROM core_button_access WHERE page = 'projects' ORDER BY button_key;"
```

---

## ⚠️ Важные примечания

1. **Резервное копирование**: Перед синхронизацией на продакшн рекомендуется создать бэкап БД:
   ```bash
   docker compose exec db pg_dump -U checksite_user checksite_db > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Проверка версии**: Убедитесь, что структура таблицы `core_button_access` на продакшн совпадает с локальной:
   ```bash
   docker compose exec db psql -U checksite_user -d checksite_db -c "\d core_button_access"
   ```

3. **Откат изменений**: Если что-то пошло не так, восстановите из бэкапа:
   ```bash
   docker compose exec -T db psql -U checksite_user -d checksite_db < backup_YYYYMMDD_HHMMSS.sql
   ```

---

## ✅ Чеклист синхронизации

- [ ] Создан экспорт локальной БД (`button_access_export.sql`)
- [ ] Файл скопирован на продакшн сервер
- [ ] Создан бэкап продакшн БД
- [ ] Удалены записи `material-requests` на продакшн
- [ ] Очищена таблица `core_button_access` на продакшн
- [ ] Загружены данные из экспорта
- [ ] Проверено количество записей (должно быть 92)
- [ ] Перезапущен backend
- [ ] Проверена админка `/admin/core/buttonaccess/`
- [ ] Убедились, что страница `material-requests` отсутствует

---

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте логи backend: `docker compose logs backend --tail 50`
2. Проверьте структуру БД: `\d core_button_access`
3. Проверьте права пользователя БД
4. Восстановите из бэкапа при необходимости
