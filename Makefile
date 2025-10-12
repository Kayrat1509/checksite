.PHONY: help build up down restart logs shell-backend shell-frontend test migrate makemigrations createsuperuser

help:
	@echo "Доступные команды:"
	@echo "  make build           - Собрать все контейнеры"
	@echo "  make up              - Запустить все сервисы"
	@echo "  make down            - Остановить все сервисы"
	@echo "  make restart         - Перезапустить все сервисы"
	@echo "  make logs            - Показать логи всех сервисов"
	@echo "  make shell-backend   - Войти в backend контейнер"
	@echo "  make shell-frontend  - Войти в frontend контейнер"
	@echo "  make test            - Запустить тесты backend"
	@echo "  make migrate         - Применить миграции"
	@echo "  make makemigrations  - Создать миграции"
	@echo "  make createsuperuser - Создать суперпользователя"

build:
	docker-compose build --no-cache

up:
	docker-compose up -d

down:
	docker-compose down

restart:
	docker-compose down && docker-compose up -d

logs:
	docker-compose logs -f

shell-backend:
	docker-compose exec backend bash

shell-frontend:
	docker-compose exec frontend sh

test:
	docker-compose exec backend pytest --cov

migrate:
	docker-compose exec backend python manage.py migrate

makemigrations:
	docker-compose exec backend python manage.py makemigrations

createsuperuser:
	docker-compose exec backend python manage.py createsuperuser
