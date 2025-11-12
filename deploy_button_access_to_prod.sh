#!/bin/bash
# Скрипт для деплоя ButtonAccess на продакшн сервер
# Автоматически копирует файл и выполняет синхронизацию

set -e  # Остановка при ошибке

# Параметры сервера
SERVER_USER="kayrat1509"
SERVER_IP="194.34.232.112"
SERVER_PATH="~/checksite"

echo "=================================================="
echo "🚀 Деплой ButtonAccess на продакшн"
echo "Сервер: $SERVER_USER@$SERVER_IP"
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
EXPORT_COUNT=$(grep -c "^INSERT INTO" button_access_export.sql || echo "0")
echo "📊 Количество записей в экспорте: $EXPORT_COUNT"
echo ""

# Шаг 1: Копирование файла на сервер
echo "📤 Шаг 1: Копирование файла на сервер..."
scp button_access_export.sql $SERVER_USER@$SERVER_IP:$SERVER_PATH/
if [ $? -eq 0 ]; then
    echo "✅ Файл успешно скопирован"
else
    echo "❌ Ошибка копирования файла"
    exit 1
fi
echo ""

# Шаг 2: Выполнение команд на сервере
echo "🔧 Шаг 2: Выполнение синхронизации на сервере..."
echo ""

ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd ~/checksite

echo "🗑️  Удаление записей material-requests..."
docker compose exec -T db psql -U checksite_user -d checksite_db -c "DELETE FROM core_button_access WHERE page = 'material-requests';" > /dev/null 2>&1 || true
echo "✅ Записи material-requests удалены"

echo "🧹 Очистка таблицы core_button_access..."
docker compose exec -T db psql -U checksite_user -d checksite_db -c "TRUNCATE TABLE core_button_access RESTART IDENTITY CASCADE;"
echo "✅ Таблица очищена"

echo "📥 Загрузка актуальных данных..."
docker compose exec -T db psql -U checksite_user -d checksite_db < button_access_export.sql > /dev/null 2>&1
echo "✅ Данные загружены"

echo "🔍 Проверка результата..."
FINAL_COUNT=$(docker compose exec -T db psql -U checksite_user -d checksite_db -t -c "SELECT COUNT(*) FROM core_button_access;" | tr -d ' ' | tr -d '\n' | tr -d '\r')
echo "📊 Итоговое количество записей: $FINAL_COUNT"

echo ""
echo "🔄 Перезапуск backend..."
docker compose restart backend > /dev/null 2>&1
echo "✅ Backend перезапущен"

echo ""
echo "📋 Список страниц в ButtonAccess:"
docker compose exec -T db psql -U checksite_user -d checksite_db -c "SELECT DISTINCT page, COUNT(*) as buttons FROM core_button_access GROUP BY page ORDER BY page;"

ENDSSH

echo ""
echo "=================================================="
echo "✅ Деплой завершен успешно!"
echo "=================================================="
echo ""
echo "Проверьте админку: https://admin.stroyka.asia/admin/core/buttonaccess/"
echo "Убедитесь, что страница 'material-requests' отсутствует"
echo ""
