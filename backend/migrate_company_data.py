#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Скрипт для миграции данных компаний подрядчиков и надзоров
из старых полей (position, supervision_company) в новое поле external_company_name
"""

import os
import sys
import django

# Настройка Django окружения
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User

def migrate_company_data():
    """Миграция данных компаний в поле external_company_name."""

    print("=" * 60)
    print("Миграция данных компаний подрядчиков и надзоров")
    print("=" * 60)

    # Получаем всех подрядчиков, у которых position заполнено, но external_company_name пусто
    contractors = User.objects.filter(
        role='CONTRACTOR',
        position__isnull=False,
        external_company_name=''
    ).exclude(position='')

    print(f"\nНайдено подрядчиков для миграции: {contractors.count()}")

    contractors_migrated = 0
    for contractor in contractors:
        old_position = contractor.position
        contractor.external_company_name = old_position
        # Очищаем position, так как теперь это название компании в external_company_name
        contractor.position = ''
        contractor.save(update_fields=['external_company_name', 'position'])
        print(f"  ✓ {contractor.get_full_name()} ({contractor.email}): '{old_position}' → external_company_name")
        contractors_migrated += 1

    # Получаем всех надзоров, у которых supervision_company заполнено, но external_company_name пусто
    supervisors = User.objects.filter(
        role__in=['SUPERVISOR', 'OBSERVER'],
        supervision_company__isnull=False,
        external_company_name=''
    ).exclude(supervision_company='')

    print(f"\nНайдено надзоров для миграции: {supervisors.count()}")

    supervisors_migrated = 0
    for supervisor in supervisors:
        old_supervision_company = supervisor.supervision_company
        supervisor.external_company_name = old_supervision_company
        # Оставляем supervision_company для обратной совместимости, но помечено как deprecated
        supervisor.save(update_fields=['external_company_name'])
        print(f"  ✓ {supervisor.get_full_name()} ({supervisor.email}): '{old_supervision_company}' → external_company_name")
        supervisors_migrated += 1

    print("\n" + "=" * 60)
    print(f"Миграция завершена!")
    print(f"  Подрядчиков мигрировано: {contractors_migrated}")
    print(f"  Надзоров мигрировано: {supervisors_migrated}")
    print(f"  Всего мигрировано: {contractors_migrated + supervisors_migrated}")
    print("=" * 60)

if __name__ == '__main__':
    migrate_company_data()
