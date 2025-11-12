# 🚀 Быстрый деплой ButtonAccess на продакшн

## Сервер
```
ssh kayrat1509@194.34.232.112
```

---

## ⚡ Автоматический деплой (1 команда)

На **локальной машине** выполните:

```bash
cd /Users/kairatkhidirboev/Projects/checksite
./deploy_button_access_to_prod.sh
```

Скрипт автоматически:
1. ✅ Скопирует `button_access_export.sql` на сервер
2. ✅ Удалит записи `material-requests` из продакшн БД
3. ✅ Очистит таблицу `core_button_access`
4. ✅ Загрузит актуальные данные (92 записи)
5. ✅ Перезапустит backend
6. ✅ Покажет итоговую статистику

**Готово!** 🎉

---

## 🔧 Ручной деплой (если нужен полный контроль)

### Шаг 1: Копирование файла на сервер

```bash
scp button_access_export.sql kayrat1509@194.34.232.112:~/checksite/
```

### Шаг 2: Подключение к серверу

```bash
ssh kayrat1509@194.34.232.112
cd ~/checksite
```

### Шаг 3: Синхронизация данных

```bash
# Удалить записи material-requests
docker compose exec db psql -U checksite_user -d checksite_db -c "DELETE FROM core_button_access WHERE page = 'material-requests';"

# Очистить таблицу
docker compose exec db psql -U checksite_user -d checksite_db -c "TRUNCATE TABLE core_button_access RESTART IDENTITY CASCADE;"

# Загрузить данные
docker compose exec -T db psql -U checksite_user -d checksite_db < button_access_export.sql

# Проверить количество записей (должно быть 92)
docker compose exec db psql -U checksite_user -d checksite_db -c "SELECT COUNT(*) FROM core_button_access;"

# Перезапустить backend
docker compose restart backend
```

---

## ✅ Проверка результата

1. Откройте админку:
   ```
   https://admin.stroyka.asia/admin/core/buttonaccess/
   ```

2. Убедитесь что:
   - ❌ Страница `material-requests` отсутствует
   - ✅ Всего 92 записи ButtonAccess
   - ✅ Все остальные страницы присутствуют

3. Проверьте список страниц на сервере:
   ```bash
   docker compose exec db psql -U checksite_user -d checksite_db -c "SELECT DISTINCT page, COUNT(*) as buttons FROM core_button_access GROUP BY page ORDER BY page;"
   ```

**Ожидаемый результат:**
```
     page     | buttons
--------------+---------
 contractors  |      13
 dashboard    |       4
 issues       |      13
 profile      |       1
 projects     |      10
 recycle-bin  |       1
 reports      |       5
 settings     |       3
 supervisions |      13
 tenders      |      14
 users        |      14
 warehouse    |       1
(12 rows)
```

---

## 📋 Чеклист

- [ ] Выполнен автоматический деплой: `./deploy_button_access_to_prod.sh`
- [ ] Файл успешно скопирован на сервер
- [ ] Удалены записи `material-requests`
- [ ] Загружено 92 записи ButtonAccess
- [ ] Перезапущен backend
- [ ] Проверена админка - страница `material-requests` отсутствует
- [ ] Проверен список страниц - 12 страниц присутствуют

---

## 🔄 Откат изменений (если что-то пошло не так)

На сервере создайте бэкап перед синхронизацией:

```bash
ssh kayrat1509@194.34.232.112
cd ~/checksite
docker compose exec db pg_dump -U checksite_user checksite_db > backup_buttonaccess_$(date +%Y%m%d_%H%M%S).sql
```

Для восстановления:
```bash
docker compose exec -T db psql -U checksite_user -d checksite_db < backup_buttonaccess_YYYYMMDD_HHMMSS.sql
docker compose restart backend
```
