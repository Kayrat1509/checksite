#!/usr/bin/env python
"""
Тест endpoint /api/auth/users/me/ для проверки возвращаемых данных
"""
import os
import django
import sys

# Настройка Django
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.users.models import User
from apps.users.serializers import UserSerializer
import json

print("=" * 60)
print("ТЕСТ ENDPOINT /api/auth/users/me/")
print("=" * 60)

# Тестируем для разных ролей
test_roles = ['DIRECTOR', 'ENGINEER', 'OBSERVER']

for role_name in test_roles:
    print(f"\n{'='*60}")
    print(f"Роль: {role_name}")
    print('='*60)

    # Находим пользователя с этой ролью
    try:
        user = User.objects.filter(role=role_name, company__isnull=False).first()

        if not user:
            print(f"❌ Пользователь с ролью {role_name} не найден")
            continue

        print(f"✅ Найден пользователь: {user.email}")
        print(f"   Компания: {user.company.name if user.company else 'Нет'}")
        print(f"   is_superuser: {user.is_superuser}")
        print(f"   approved: {user.approved}")
        print(f"   is_company_owner: {user.is_company_owner}")
        print(f"   has_full_access: {user.has_full_access}")
        print(f"   role_category: {user.role_category}")

        # Сериализуем как в API
        serializer = UserSerializer(user)
        data = serializer.data

        print(f"\nДанные из UserSerializer (как в /api/auth/users/me/):")
        print(json.dumps({
            'id': data.get('id'),
            'email': data.get('email'),
            'role': data.get('role'),
            'is_superuser': data.get('is_superuser'),
            'approved': data.get('approved'),
            'is_company_owner': data.get('is_company_owner'),
            'has_full_access': data.get('has_full_access'),
            'role_category': data.get('role_category'),
            'company': data.get('company'),
            'company_name': data.get('company_name'),
        }, indent=2, ensure_ascii=False))

    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()

print("\n" + "="*60)
print("ТЕСТ ЗАВЕРШЕН")
print("="*60)
