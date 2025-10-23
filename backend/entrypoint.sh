#!/bin/bash

# Exit on error
set -e

echo "Waiting for PostgreSQL..."
while ! nc -z $DB_HOST $DB_PORT; do
  sleep 0.1
done
echo "PostgreSQL started"

echo "Checking for unapplied migrations..."
# Проверяем, есть ли несозданные миграции (только предупреждение)
python manage.py makemigrations --check --dry-run || echo "Warning: You have model changes without migrations"

echo "Running migrations..."
# Безопасное применение миграций с обработкой ошибок
python manage.py migrate --noinput || {
    echo "Migration failed. Trying to fix..."
    # Если миграция не удалась из-за существующих таблиц, пробуем fake
    python manage.py migrate --fake-initial --noinput
}

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Creating superuser if not exists..."
python manage.py shell << END
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(email='admin@checksite.com').exists():
    User.objects.create_superuser(
        email='admin@checksite.com',
        password='admin123',
        first_name='Admin',
        last_name='User'
    )
    print('Superuser created')
else:
    print('Superuser already exists')
END

echo "Starting server..."
exec "$@"
