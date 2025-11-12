#!/bin/bash
# Скрипт для синхронизации ButtonAccess между локальной и продакшн БД
# Автоматически удаляет записи material-requests и загружает актуальные данные

set -e  # Остановка при ошибке

echo "=================================================="
echo "Синхронизация ButtonAccess с продакшн"
echo "=================================================="
echo ""

# Проверка наличия экспортированного файла
if [ ! -f "button_access_export.sql" ]; then
    echo "❌ Ошибка: Файл button_access_export.sql не найден!"
    echo "Создайте экспорт командой:"
    echo "docker compose exec db pg_dump -U checksite_user -d checksite_db -t core_button_access --data-only --column-inserts > button_access_export.sql"
    exit 1
fi

echo "📦 Найден файл экспорта: button_access_export.sql"
echo ""

# Подсчет записей в экспорте
EXPORT_COUNT=$(grep -c "^INSERT INTO" button_access_export.sql || echo "0")
echo "📊 Количество записей в экспорте: $EXPORT_COUNT"
echo ""

# Шаг 1: Удаление записей material-requests из продакшн БД
echo "🗑️  Шаг 1: Удаление записей material-requests из продакшн..."
docker compose exec db psql -U checksite_user -d checksite_db -c "DELETE FROM core_button_access WHERE page = 'material-requests';" > /dev/null 2>&1 || true
echo "✅ Записи material-requests удалены"
echo ""

# Шаг 2: Очистка таблицы ButtonAccess
echo "🧹 Шаг 2: Очистка таблицы core_button_access..."
docker compose exec db psql -U checksite_user -d checksite_db -c "TRUNCATE TABLE core_button_access RESTART IDENTITY CASCADE;"
echo "✅ Таблица очищена"
echo ""

# Шаг 3: Загрузка данных из экспорта
echo "📥 Шаг 3: Загрузка актуальных данных..."
docker compose exec -T db psql -U checksite_user -d checksite_db < button_access_export.sql > /dev/null 2>&1
echo "✅ Данные загружены"
echo ""

# Шаг 4: Проверка результата
echo "🔍 Шаг 4: Проверка результата..."
FINAL_COUNT=$(docker compose exec db psql -U checksite_user -d checksite_db -t -c "SELECT COUNT(*) FROM core_button_access;" | tr -d ' ' | tr -d '\n' | tr -d '\r')
echo "📊 Итоговое количество записей: $FINAL_COUNT"
echo ""

# Показываем список страниц
echo "📋 Список страниц в ButtonAccess:"
docker compose exec db psql -U checksite_user -d checksite_db -c "SELECT DISTINCT page, COUNT(*) as buttons FROM core_button_access GROUP BY page ORDER BY page;"
echo ""

echo "=================================================="
echo "✅ Синхронизация завершена успешно!"
echo "=================================================="
echo ""
echo "Для применения на продакшн сервере:"
echo "1. Скопируйте файл button_access_export.sql на сервер"
echo "2. Выполните команды на сервере:"
echo "   docker compose exec db psql -U checksite_user -d checksite_db -c \"DELETE FROM core_button_access WHERE page = 'material-requests';\""
echo "   docker compose exec db psql -U checksite_user -d checksite_db -c \"TRUNCATE TABLE core_button_access RESTART IDENTITY CASCADE;\""
echo "   docker compose exec -T db psql -U checksite_user -d checksite_db < button_access_export.sql"
echo "3. Перезапустите backend: docker compose restart backend"
echo ""
