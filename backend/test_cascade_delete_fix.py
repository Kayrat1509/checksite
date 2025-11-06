#!/usr/bin/env python
"""
Тестирование исправления CASCADE удаления.

Проверяет, что при удалении пользователей/подрядчиков/надзоров:
- Задачи НЕ удаляются
- Заявки на тендеры НЕ удаляются
- Все записи сохраняются с NULL в связях

Запуск: docker compose exec backend python test_cascade_delete_fix.py
"""

import os
import sys
import django
from datetime import datetime, timedelta
from django.utils import timezone

# Настройка Django окружения
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.users.models import Company
from apps.projects.models import Project
from apps.tasks.models import Task
from apps.tenders.models import Tender, TenderBid

User = get_user_model()


class Colors:
    """Цвета для вывода в консоль"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    END = '\033[0m'


def print_header(text):
    """Печать заголовка"""
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'=' * 80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{text.center(80)}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'=' * 80}{Colors.END}\n")


def print_success(text):
    """Печать успешного результата"""
    print(f"{Colors.GREEN}✅ {text}{Colors.END}")


def print_error(text):
    """Печать ошибки"""
    print(f"{Colors.RED}❌ {text}{Colors.END}")


def print_info(text):
    """Печать информации"""
    print(f"{Colors.BLUE}ℹ️  {text}{Colors.END}")


def print_warning(text):
    """Печать предупреждения"""
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.END}")


def cleanup_test_data():
    """Очистка тестовых данных"""
    print_info("Очистка старых тестовых данных...")

    # Удаляем тестовые задачи
    Task.objects.filter(title__startswith='[TEST]').delete()

    # Удаляем тестовые тендеры
    Tender.objects.filter(title__startswith='[TEST]').delete()

    # Удаляем тестовых пользователей
    User.objects.filter(email__startswith='test_cascade_').delete()

    print_success("Тестовые данные очищены")


def create_test_company():
    """Создание тестовой компании"""
    company, created = Company.objects.get_or_create(
        name='TEST CASCADE DELETE COMPANY',
        defaults={
            'email': 'test@cascade.com',
            'phone': '+77777777777',
            'address': 'Test Address'
        }
    )
    if created:
        print_success(f"Создана тестовая компания: {company.name}")
    return company


def create_test_users(company):
    """Создание тестовых пользователей"""
    print_info("Создание тестовых пользователей...")

    users = {}

    # Создатель задач
    users['creator'] = User.objects.create_user(
        email='test_cascade_creator@test.com',
        password='test123',
        first_name='Создатель',
        last_name='Тестовый',
        role='PROJECT_MANAGER',
        company=company,
        is_active=True
    )
    print_success(f"Создан пользователь: {users['creator'].email} (Создатель задач)")

    # Исполнитель - сотрудник
    users['executor'] = User.objects.create_user(
        email='test_cascade_executor@test.com',
        password='test123',
        first_name='Исполнитель',
        last_name='Сотрудник',
        role='ENGINEER',
        company=company,
        is_active=True
    )
    print_success(f"Создан пользователь: {users['executor'].email} (Исполнитель)")

    # Подрядчик
    users['contractor'] = User.objects.create_user(
        email='test_cascade_contractor@test.com',
        password='test123',
        first_name='Подрядчик',
        last_name='Тестовый',
        role='CONTRACTOR',
        company=company,
        is_active=True
    )
    print_success(f"Создан пользователь: {users['contractor'].email} (Подрядчик)")

    # Участник тендера
    users['bidder'] = User.objects.create_user(
        email='test_cascade_bidder@test.com',
        password='test123',
        first_name='Участник',
        last_name='Тендера',
        role='PROJECT_MANAGER',
        company=company,
        is_active=True
    )
    print_success(f"Создан пользователь: {users['bidder'].email} (Участник тендера)")

    return users


def create_test_project(company):
    """Создание тестового проекта"""
    project = Project.objects.create(
        name='[TEST] Проект для тестирования CASCADE',
        address='Test Address',
        company=company
    )
    print_success(f"Создан тестовый проект: {project.name}")
    return project


def test_task_created_by_deletion(users, company, project):
    """
    ТЕСТ 1: Удаление создателя задачи
    Ожидание: задача остается, created_by становится NULL
    """
    print_header("ТЕСТ 1: Удаление создателя задачи")

    # Создаем задачу
    task = Task.objects.create(
        title='[TEST] Задача от создателя который будет удален',
        description='Тестовая задача для проверки удаления создателя',
        created_by=users['creator'],
        assigned_to_user=users['executor'],
        deadline=timezone.now() + timedelta(days=7),
        company=company,
        project=project,
        status=Task.STATUS_IN_PROGRESS
    )
    task_id = task.id
    print_info(f"Создана задача #{task.task_number} от {users['creator'].email}")

    # Запоминаем данные
    task_number = task.task_number
    creator_email = users['creator'].email

    # Удаляем создателя
    print_warning(f"Удаляем создателя: {creator_email}")
    users['creator'].delete()

    # Проверяем что задача осталась
    try:
        task = Task.objects.get(id=task_id)
        print_success(f"Задача #{task_number} ОСТАЛАСЬ в базе данных")

        if task.created_by is None:
            print_success(f"created_by = NULL ✓")
        else:
            print_error(f"created_by = {task.created_by} (ожидалось NULL)")
            return False

        if task.assigned_to_user == users['executor']:
            print_success(f"assigned_to_user сохранен: {task.assigned_to_user.email} ✓")
        else:
            print_error(f"assigned_to_user изменен неправильно")
            return False

        print_success("✅ ТЕСТ 1 ПРОЙДЕН: Задача сохранена, создатель = NULL")
        return True

    except Task.DoesNotExist:
        print_error(f"❌ ТЕСТ 1 ПРОВАЛЕН: Задача #{task_number} УДАЛЕНА из базы!")
        return False


def test_task_assigned_user_deletion(users, company, project):
    """
    ТЕСТ 2: Удаление исполнителя задачи (сотрудника)
    Ожидание: задача остается, assigned_to_user становится NULL
    """
    print_header("ТЕСТ 2: Удаление исполнителя задачи (сотрудника)")

    # Создаем задачу
    task = Task.objects.create(
        title='[TEST] Задача для исполнителя который будет удален',
        description='Тестовая задача для проверки удаления исполнителя',
        created_by=users['bidder'],  # Используем другого пользователя как создателя
        assigned_to_user=users['executor'],
        deadline=timezone.now() + timedelta(days=7),
        company=company,
        project=project,
        status=Task.STATUS_IN_PROGRESS
    )
    task_id = task.id
    print_info(f"Создана задача #{task.task_number} для {users['executor'].email}")

    # Запоминаем данные
    task_number = task.task_number
    executor_email = users['executor'].email

    # Удаляем исполнителя
    print_warning(f"Удаляем исполнителя: {executor_email}")
    users['executor'].delete()

    # Проверяем что задача осталась
    try:
        task = Task.objects.get(id=task_id)
        print_success(f"Задача #{task_number} ОСТАЛАСЬ в базе данных")

        if task.assigned_to_user is None:
            print_success(f"assigned_to_user = NULL ✓")
        else:
            print_error(f"assigned_to_user = {task.assigned_to_user} (ожидалось NULL)")
            return False

        if task.created_by == users['bidder']:
            print_success(f"created_by сохранен: {task.created_by.email} ✓")
        else:
            print_error(f"created_by изменен неправильно")
            return False

        print_success("✅ ТЕСТ 2 ПРОЙДЕН: Задача сохранена, исполнитель = NULL")
        return True

    except Task.DoesNotExist:
        print_error(f"❌ ТЕСТ 2 ПРОВАЛЕН: Задача #{task_number} УДАЛЕНА из базы!")
        return False


def test_task_assigned_contractor_deletion(users, company, project):
    """
    ТЕСТ 3: Удаление подрядчика задачи
    Ожидание: задача остается, assigned_to_contractor становится NULL
    """
    print_header("ТЕСТ 3: Удаление подрядчика задачи")

    # Создаем задачу
    task = Task.objects.create(
        title='[TEST] Задача для подрядчика который будет удален',
        description='Тестовая задача для проверки удаления подрядчика',
        created_by=users['bidder'],
        assigned_to_contractor=users['contractor'],
        deadline=timezone.now() + timedelta(days=7),
        company=company,
        project=project,
        status=Task.STATUS_IN_PROGRESS
    )
    task_id = task.id
    print_info(f"Создана задача #{task.task_number} для подрядчика {users['contractor'].email}")

    # Запоминаем данные
    task_number = task.task_number
    contractor_email = users['contractor'].email

    # Удаляем подрядчика
    print_warning(f"Удаляем подрядчика: {contractor_email}")
    users['contractor'].delete()

    # Проверяем что задача осталась
    try:
        task = Task.objects.get(id=task_id)
        print_success(f"Задача #{task_number} ОСТАЛАСЬ в базе данных")

        if task.assigned_to_contractor is None:
            print_success(f"assigned_to_contractor = NULL ✓")
        else:
            print_error(f"assigned_to_contractor = {task.assigned_to_contractor} (ожидалось NULL)")
            return False

        if task.created_by == users['bidder']:
            print_success(f"created_by сохранен: {task.created_by.email} ✓")
        else:
            print_error(f"created_by изменен неправильно")
            return False

        print_success("✅ ТЕСТ 3 ПРОЙДЕН: Задача сохранена, подрядчик = NULL")
        return True

    except Task.DoesNotExist:
        print_error(f"❌ ТЕСТ 3 ПРОВАЛЕН: Задача #{task_number} УДАЛЕНА из базы!")
        return False


def test_tenderbid_participant_deletion(users, company, project):
    """
    ТЕСТ 4: Удаление участника тендера
    Ожидание: заявка остается, participant становится NULL, company_name сохраняется
    """
    print_header("ТЕСТ 4: Удаление участника тендера")

    # Создаем тендер
    tender = Tender.objects.create(
        title='[TEST] Тестовый тендер',
        description='Тендер для тестирования удаления участника',
        start_date=timezone.now(),
        end_date=timezone.now() + timedelta(days=30),
        budget=1000000,
        company_name=company.name,
        city='Тестовый город',
        project=project,
        created_by=users['bidder']
    )
    print_info(f"Создан тендер: {tender.title}")

    # Создаем заявку на тендер
    bid = TenderBid.objects.create(
        tender=tender,
        participant=users['bidder'],
        company_name='ТОО "Тестовая компания участника"',
        amount=900000,
        comment='Тестовая заявка от участника который будет удален'
    )
    bid_id = bid.id
    company_name = bid.company_name
    print_info(f"Создана заявка от {users['bidder'].email}, компания: {company_name}")

    # Запоминаем данные
    bidder_email = users['bidder'].email

    # Удаляем участника
    print_warning(f"Удаляем участника тендера: {bidder_email}")
    users['bidder'].delete()

    # Проверяем что заявка осталась
    try:
        bid = TenderBid.objects.get(id=bid_id)
        print_success(f"Заявка на тендер ОСТАЛАСЬ в базе данных")

        if bid.participant is None:
            print_success(f"participant = NULL ✓")
        else:
            print_error(f"participant = {bid.participant} (ожидалось NULL)")
            return False

        if bid.company_name == company_name:
            print_success(f"company_name сохранено: '{bid.company_name}' ✓")
        else:
            print_error(f"company_name изменено: '{bid.company_name}' (ожидалось '{company_name}')")
            return False

        if bid.amount == 900000:
            print_success(f"amount сохранен: {bid.amount} ✓")
        else:
            print_error(f"amount изменен неправильно")
            return False

        print_success("✅ ТЕСТ 4 ПРОЙДЕН: Заявка сохранена, участник = NULL, данные сохранены")
        return True

    except TenderBid.DoesNotExist:
        print_error(f"❌ ТЕСТ 4 ПРОВАЛЕН: Заявка на тендер УДАЛЕНА из базы!")
        return False


def main():
    """Основная функция запуска тестов"""
    print_header("ТЕСТИРОВАНИЕ ИСПРАВЛЕНИЯ CASCADE УДАЛЕНИЯ")

    print_info("Дата и время: " + datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    print_info("Django версия: " + django.get_version())

    # Очистка старых данных
    cleanup_test_data()

    # Создание тестовых данных
    company = create_test_company()
    users = create_test_users(company)
    project = create_test_project(company)

    # Запуск тестов
    results = []

    results.append(("ТЕСТ 1: Удаление создателя задачи",
                   test_task_created_by_deletion(users, company, project)))

    results.append(("ТЕСТ 2: Удаление исполнителя задачи",
                   test_task_assigned_user_deletion(users, company, project)))

    results.append(("ТЕСТ 3: Удаление подрядчика задачи",
                   test_task_assigned_contractor_deletion(users, company, project)))

    results.append(("ТЕСТ 4: Удаление участника тендера",
                   test_tenderbid_participant_deletion(users, company, project)))

    # Финальный отчет
    print_header("ИТОГОВЫЙ ОТЧЕТ")

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        if result:
            print_success(f"{test_name}: ПРОЙДЕН")
        else:
            print_error(f"{test_name}: ПРОВАЛЕН")

    print(f"\n{Colors.BOLD}Результат: {passed}/{total} тестов пройдено{Colors.END}")

    if passed == total:
        print_success(f"\n{'🎉 ' * 10}")
        print_success("ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!")
        print_success(f"{'🎉 ' * 10}\n")

        print_info("✅ При удалении пользователей/подрядчиков:")
        print_info("   - Задачи НЕ удаляются")
        print_info("   - Заявки на тендеры НЕ удаляются")
        print_info("   - Все связи устанавливаются в NULL")
        print_info("   - История работы сохраняется")
    else:
        print_error("\n❌ НЕКОТОРЫЕ ТЕСТЫ ПРОВАЛЕНЫ!")
        print_error(f"Пройдено: {passed}/{total}")
        sys.exit(1)

    # Очистка после тестов
    cleanup_test_data()
    print_success("\nТестовые данные очищены после завершения тестов")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print_error("\n\nТестирование прервано пользователем")
        cleanup_test_data()
        sys.exit(1)
    except Exception as e:
        print_error(f"\n\n❌ КРИТИЧЕСКАЯ ОШИБКА: {str(e)}")
        import traceback
        traceback.print_exc()
        cleanup_test_data()
        sys.exit(1)
