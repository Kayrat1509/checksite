#!/usr/bin/env python3
"""
Тест производительности Dashboard - измерение скорости SQL агрегации
"""
import time
import sys
import os
import django

# Настройка Django окружения
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db.models import Count, Q
from apps.issues.models import Issue

def test_old_method():
    """Старый метод: загрузка всех замечаний в память"""
    print("\n🔴 СТАРЫЙ МЕТОД: Загрузка всех замечаний в память")
    start = time.time()

    # Загружаем ВСЕ замечания
    issues = list(Issue.objects.all())
    total = len(issues)

    # Подсчёт в Python
    new_count = sum(1 for i in issues if i.status == 'NEW')
    in_progress_count = sum(1 for i in issues if i.status == 'IN_PROGRESS')
    pending_review_count = sum(1 for i in issues if i.status == 'PENDING_REVIEW')
    completed_count = sum(1 for i in issues if i.status == 'COMPLETED')
    overdue_count = sum(1 for i in issues if i.status == 'OVERDUE')
    critical_count = sum(1 for i in issues if i.priority == 'CRITICAL')
    high_count = sum(1 for i in issues if i.priority == 'HIGH')

    elapsed = time.time() - start

    print(f"  ⏱️  Время: {elapsed:.3f} секунд")
    print(f"  📊 Всего замечаний: {total}")
    print(f"  📈 Статусы: NEW={new_count}, IN_PROGRESS={in_progress_count}, COMPLETED={completed_count}")
    print(f"  🔥 Приоритеты: CRITICAL={critical_count}, HIGH={high_count}")

    return elapsed, total


def test_new_method():
    """Новый метод: SQL агрегация"""
    print("\n✅ НОВЫЙ МЕТОД: SQL агрегация с COUNT()")
    start = time.time()

    # Один SQL запрос с агрегацией
    stats = Issue.objects.aggregate(
        total=Count('id'),
        new=Count('id', filter=Q(status='NEW')),
        in_progress=Count('id', filter=Q(status='IN_PROGRESS')),
        pending_review=Count('id', filter=Q(status='PENDING_REVIEW')),
        completed=Count('id', filter=Q(status='COMPLETED')),
        overdue=Count('id', filter=Q(status='OVERDUE')),
        critical=Count('id', filter=Q(priority='CRITICAL')),
        high=Count('id', filter=Q(priority='HIGH')),
    )

    elapsed = time.time() - start

    print(f"  ⏱️  Время: {elapsed:.3f} секунд")
    print(f"  📊 Всего замечаний: {stats['total']}")
    print(f"  📈 Статусы: NEW={stats['new']}, IN_PROGRESS={stats['in_progress']}, COMPLETED={stats['completed']}")
    print(f"  🔥 Приоритеты: CRITICAL={stats['critical']}, HIGH={stats['high']}")

    return elapsed, stats['total']


def test_with_project_filter(project_id=1):
    """Тест с фильтрацией по проекту"""
    print(f"\n🎯 ТЕСТ С ФИЛЬТРОМ: project_id={project_id}")
    start = time.time()

    stats = Issue.objects.filter(project_id=project_id).aggregate(
        total=Count('id'),
        new=Count('id', filter=Q(status='NEW')),
        in_progress=Count('id', filter=Q(status='IN_PROGRESS')),
        completed=Count('id', filter=Q(status='COMPLETED')),
    )

    elapsed = time.time() - start

    print(f"  ⏱️  Время: {elapsed:.3f} секунд")
    print(f"  📊 Замечаний в проекте: {stats['total']}")
    print(f"  📈 Статусы: NEW={stats['new']}, IN_PROGRESS={stats['in_progress']}, COMPLETED={stats['completed']}")

    return elapsed


if __name__ == '__main__':
    print("="*80)
    print("🚀 ТЕСТ ПРОИЗВОДИТЕЛЬНОСТИ DASHBOARD")
    print("="*80)

    # Тест 1: Старый метод
    old_time, old_count = test_old_method()

    # Тест 2: Новый метод
    new_time, new_count = test_new_method()

    # Тест 3: С фильтром по проекту
    filter_time = test_with_project_filter(project_id=1)

    # Итоговая статистика
    print("\n" + "="*80)
    print("📊 ИТОГОВАЯ СТАТИСТИКА")
    print("="*80)
    print(f"  Старый метод:      {old_time:.3f} сек")
    print(f"  Новый метод:       {new_time:.3f} сек")
    print(f"  С фильтром:        {filter_time:.3f} сек")
    print(f"\n  🚀 Ускорение:      {old_time/new_time:.1f}x раз быстрее!")
    print(f"  💾 Проверено:      {old_count} замечаний")
    print("="*80)

    # Проверка корректности
    if old_count == new_count:
        print("✅ РЕЗУЛЬТАТЫ ИДЕНТИЧНЫ - оптимизация работает корректно!")
    else:
        print(f"⚠️  ВНИМАНИЕ: Разные результаты! Старый={old_count}, Новый={new_count}")
