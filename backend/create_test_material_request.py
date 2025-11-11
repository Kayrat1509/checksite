#!/usr/bin/env python
"""
Скрипт для создания тестовой заявки на материалы
"""
import os
import sys
import django

# Настройка Django окружения
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.material_requests.models import MaterialRequest, MaterialRequestItem
from apps.users.models import User
from apps.projects.models import Project

def create_test_data():
    """Создание тестовых данных для заявки на материалы"""

    print("=" * 60)
    print("Создание тестовой заявки на материалы")
    print("=" * 60)

    # 1. Найти или создать пользователя
    try:
        user = User.objects.filter(is_superuser=True).first()
        if not user:
            user = User.objects.first()

        if not user:
            print("❌ Ошибка: Нет пользователей в системе!")
            return

        print(f"✅ Пользователь найден: {user.email} (ID: {user.id})")
    except Exception as e:
        print(f"❌ Ошибка при поиске пользователя: {e}")
        return

    # 2. Найти или создать проект
    try:
        project = Project.objects.first()
        if not project:
            print("⚠️  Проект не найден, создаю тестовый проект...")
            project = Project.objects.create(
                name="Тестовый проект",
                address="Тестовый адрес",
                description="Тестовое описание проекта"
            )
        print(f"✅ Проект найден: {project.name} (ID: {project.id})")
    except Exception as e:
        print(f"❌ Ошибка при поиске/создании проекта: {e}")
        return

    # 3. Проверить, есть ли уже тестовая заявка
    existing_request = MaterialRequest.objects.filter(number='MR-2025-0001').first()
    if existing_request:
        print(f"⚠️  Заявка MR-2025-0001 уже существует (ID: {existing_request.id})")
        print(f"   Статус: {existing_request.status}")
        print(f"   Количество позиций: {existing_request.items.count()}")
        return

    # 4. Создать заявку
    try:
        material_request = MaterialRequest.objects.create(
            number='MR-2025-0001',
            project=project,
            created_by=user,
            status='DRAFT',
            description='Тестовая заявка на материалы',
            delivery_date='2025-11-20'
        )
        print(f"✅ Заявка создана: {material_request.number} (ID: {material_request.id})")
    except Exception as e:
        print(f"❌ Ошибка при создании заявки: {e}")
        return

    # 5. Создать позиции заявки
    items_data = [
        {
            'name': 'Цемент М500',
            'unit': 'тонн',
            'quantity': 10.0,
            'estimated_price': 15000.0
        },
        {
            'name': 'Арматура 12мм',
            'unit': 'метров',
            'quantity': 500.0,
            'estimated_price': 50.0
        },
        {
            'name': 'Кирпич красный',
            'unit': 'шт',
            'quantity': 5000.0,
            'estimated_price': 25.0
        }
    ]

    created_items = []
    for item_data in items_data:
        try:
            item = MaterialRequestItem.objects.create(
                request=material_request,
                **item_data
            )
            created_items.append(item)
            print(f"✅ Позиция создана: {item.name} - {item.quantity} {item.unit}")
        except Exception as e:
            print(f"❌ Ошибка при создании позиции {item_data['name']}: {e}")

    # 6. Вывод итоговой информации
    print("=" * 60)
    print("✅ ТЕСТОВЫЕ ДАННЫЕ УСПЕШНО СОЗДАНЫ!")
    print("=" * 60)
    print(f"Заявка: {material_request.number}")
    print(f"Проект: {material_request.project.name}")
    print(f"Автор: {material_request.created_by.email}")
    print(f"Статус: {material_request.status}")
    print(f"Количество позиций: {len(created_items)}")
    print(f"\nПозиции:")
    for i, item in enumerate(created_items, 1):
        total = item.quantity * item.estimated_price
        print(f"  {i}. {item.name}: {item.quantity} {item.unit} × {item.estimated_price}₽ = {total}₽")

    total_sum = sum(item.quantity * item.estimated_price for item in created_items)
    print(f"\nОбщая сумма: {total_sum}₽")
    print("=" * 60)

if __name__ == '__main__':
    create_test_data()
