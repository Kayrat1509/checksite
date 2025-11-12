# ⚡ Быстрая инструкция - Вы на продакшн сервере

Если вы уже подключены к серверу `kayrat1509@vmi2871095`, выполните эти команды:

## 📥 Шаг 1: Получить файл экспорта

Сначала на **локальной машине** (откройте новый терминал) скопируйте файл:

```bash
# На ЛОКАЛЬНОЙ машине (не на сервере!)
cd /Users/kairatkhidirboev/Projects/checksite
scp button_access_export.sql kayrat1509@194.34.232.112:~/checksite/
```

## 🔧 Шаг 2: На продакшн сервере выполните

Вы уже на сервере, выполните:

```bash
cd ~/checksite

# 1. Удалить записи material-requests
docker compose exec db psql -U checksite_user -d checksite_db -c "DELETE FROM core_button_access WHERE page = 'material-requests';"

# 2. Очистить таблицу
docker compose exec db psql -U checksite_user -d checksite_db -c "TRUNCATE TABLE core_button_access RESTART IDENTITY CASCADE;"

# 3. Загрузить данные
docker compose exec -T db psql -U checksite_user -d checksite_db < button_access_export.sql

# 4. Проверить количество (должно быть 92)
docker compose exec db psql -U checksite_user -d checksite_db -c "SELECT COUNT(*) FROM core_button_access;"

# 5. Перезапустить backend
docker compose restart backend
```

## ✅ Шаг 3: Проверка

Откройте в браузере:
```
https://admin.stroyka.asia/admin/core/buttonaccess/
```

Проверьте:
- ❌ Страница `material-requests` удалена
- ✅ Всего 92 записи

---

## 🎯 Альтернатива - Автоматический скрипт

Если хотите автоматически (выполняется с локальной машины):

1. Выйдите с сервера: `exit`
2. На локальной машине выполните:
```bash
cd /Users/kairatkhidirboev/Projects/checksite
./deploy_button_access_to_prod.sh
```
