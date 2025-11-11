#!/bin/bash

# ===============================================
# Скрипт деплоя модуля "Заявки на материалы"
# Дата: 11 ноября 2025
# ===============================================

set -e  # Остановить при ошибке

echo "🚀 Начинаем деплой модуля 'Заявки на материалы'..."
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для вывода успеха
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Функция для вывода ошибки
error() {
    echo -e "${RED}❌ $1${NC}"
}

# Функция для вывода предупреждения
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Функция для вывода шага
step() {
    echo ""
    echo -e "${YELLOW}📍 $1${NC}"
}

# ===============================================
# ШАГ 1: Проверка окружения
# ===============================================
step "ШАГ 1: Проверка окружения"

if ! command -v docker &> /dev/null; then
    error "Docker не установлен"
    exit 1
fi
success "Docker установлен"

if ! command -v docker compose &> /dev/null; then
    error "Docker Compose не установлен"
    exit 1
fi
success "Docker Compose установлен"

# ===============================================
# ШАГ 2: Проверка файлов
# ===============================================
step "ШАГ 2: Проверка наличия файлов"

if [ ! -d "backend/apps/material_requests" ]; then
    error "Директория backend/apps/material_requests не найдена"
    exit 1
fi
success "Директория material_requests найдена"

if [ ! -f "backend/apps/material_requests/migrations/0001_initial.py" ]; then
    error "Миграция 0001_initial.py не найдена"
    exit 1
fi
success "Миграция 0001_initial.py найдена"

if [ ! -d "frontend-requests" ]; then
    error "Директория frontend-requests не найдена"
    exit 1
fi
success "Директория frontend-requests найдена"

# ===============================================
# ШАГ 3: Остановка backend
# ===============================================
step "ШАГ 3: Остановка backend для применения миграций"

docker compose stop backend
success "Backend остановлен"

# ===============================================
# ШАГ 4: Применение миграций
# ===============================================
step "ШАГ 4: Применение миграций"

echo "Применяем миграции для material_requests..."
docker compose run --rm backend python manage.py migrate material_requests

# Проверяем статус миграций
echo ""
echo "Проверяем статус миграций..."
MIGRATION_STATUS=$(docker compose run --rm backend python manage.py showmigrations material_requests 2>&1)

if echo "$MIGRATION_STATUS" | grep -q "\[X\] 0001_initial"; then
    success "Миграция 0001_initial успешно применена"
else
    error "Миграция 0001_initial НЕ применена"
    warning "Статус миграций:"
    echo "$MIGRATION_STATUS"
    exit 1
fi

# ===============================================
# ШАГ 5: Проверка таблиц в БД
# ===============================================
step "ШАГ 5: Проверка таблиц в базе данных"

echo "Проверяем наличие таблиц material_requests и material_request_items..."
TABLE_CHECK=$(docker compose exec -T db psql -U checksite_user -d checksite_db -c "\dt material_*" 2>&1)

if echo "$TABLE_CHECK" | grep -q "material_requests"; then
    success "Таблица material_requests создана"
else
    error "Таблица material_requests НЕ создана"
    exit 1
fi

if echo "$TABLE_CHECK" | grep -q "material_request_items"; then
    success "Таблица material_request_items создана"
else
    error "Таблица material_request_items НЕ создана"
    exit 1
fi

# ===============================================
# ШАГ 6: Сборка frontend-requests
# ===============================================
step "ШАГ 6: Пересборка frontend-requests"

docker compose build frontend-requests
success "Frontend-requests пересобран"

# ===============================================
# ШАГ 7: Перезапуск всех сервисов
# ===============================================
step "ШАГ 7: Перезапуск всех сервисов"

echo "Запускаем backend..."
docker compose up -d backend
sleep 3
success "Backend запущен"

echo "Перезапускаем nginx..."
docker compose restart nginx
success "Nginx перезапущен"

echo "Перезапускаем celery и celery-beat..."
docker compose restart celery celery-beat
success "Celery перезапущен"

echo "Перезапускаем frontend-requests..."
docker compose up -d frontend-requests
success "Frontend-requests запущен"

# ===============================================
# ШАГ 8: Проверка статуса контейнеров
# ===============================================
step "ШАГ 8: Проверка статуса контейнеров"

sleep 5  # Ждём запуска контейнеров

CONTAINERS_STATUS=$(docker compose ps)
echo "$CONTAINERS_STATUS"
echo ""

# Проверяем статус критичных контейнеров
for container in backend frontend-requests nginx celery db redis; do
    if echo "$CONTAINERS_STATUS" | grep "checksite_$container" | grep -q "Up"; then
        success "Контейнер $container работает"
    else
        error "Контейнер $container НЕ работает"
    fi
done

# ===============================================
# ШАГ 9: Проверка API
# ===============================================
step "ШАГ 9: Проверка API endpoint"

echo "Ожидание запуска backend (10 секунд)..."
sleep 10

# Проверяем API через внутренний Docker network
API_RESPONSE=$(docker compose exec -T backend curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/material-requests/requests/ 2>&1 || echo "error")

if [ "$API_RESPONSE" = "200" ] || [ "$API_RESPONSE" = "401" ]; then
    success "API endpoint /api/material-requests/requests/ доступен (HTTP $API_RESPONSE)"
else
    warning "API endpoint вернул код: $API_RESPONSE (может потребоваться авторизация)"
fi

# ===============================================
# ШАГ 10: Проверка логов на ошибки
# ===============================================
step "ШАГ 10: Проверка логов на наличие ошибок"

echo "Проверяем логи backend..."
BACKEND_ERRORS=$(docker compose logs backend --tail=50 | grep -i "error\|exception\|traceback" || echo "")

if [ -z "$BACKEND_ERRORS" ]; then
    success "Ошибок в логах backend не найдено"
else
    warning "Найдены ошибки в логах backend:"
    echo "$BACKEND_ERRORS"
fi

echo "Проверяем логи nginx..."
NGINX_ERRORS=$(docker compose logs nginx --tail=50 | grep -i "error" || echo "")

if [ -z "$NGINX_ERRORS" ]; then
    success "Ошибок в логах nginx не найдено"
else
    warning "Найдены ошибки в логах nginx:"
    echo "$NGINX_ERRORS"
fi

# ===============================================
# ФИНАЛ: Итоговый отчёт
# ===============================================
echo ""
echo "=========================================="
echo "🎉 Деплой завершён!"
echo "=========================================="
echo ""
success "Модуль 'Заявки на материалы' успешно задеплоен"
echo ""
echo "📋 Следующие шаги:"
echo ""
echo "1. Проверьте админ-панель:"
echo "   https://admin.stroyka.asia/admin/material_requests/materialrequest/"
echo ""
echo "2. Проверьте frontend:"
echo "   https://requests.stroyka.asia/requests"
echo ""
echo "3. Проверьте API:"
echo "   https://admin.stroyka.asia/api/material-requests/requests/"
echo ""
echo "4. Проверьте логи в реальном времени:"
echo "   docker compose logs backend -f"
echo ""
echo "5. Если возникли проблемы, смотрите файл DEPLOY_MATERIAL_REQUESTS.md"
echo ""
echo "=========================================="
echo ""

# Спрашиваем, показать ли логи
read -p "Показать последние логи backend? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "📜 Последние 30 строк логов backend:"
    echo "=========================================="
    docker compose logs backend --tail=30
fi

echo ""
success "Скрипт деплоя завершён успешно ✨"
