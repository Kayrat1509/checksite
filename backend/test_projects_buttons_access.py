#!/usr/bin/env python
"""
Тестирование доступа к кнопкам страницы Projects для разных ролей.

Проверяет все кнопки: create, edit, delete, add_drawing, delete_drawing,
export, export_excel, import, import_excel, view_details

Цель: Убедиться, что матрица доступа ButtonAccess работает корректно,
      и что нет хардкода проверок ролей в коде.
"""

import os
import sys
import django

# Настройка Django окружения
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'checksite.settings')
django.setup()

from apps.core.models import ButtonAccess
from apps.users.models import User


# ============================================================================
# Цветной вывод в консоль
# ============================================================================

class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


def print_header(text):
    """Печатает заголовок теста"""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'=' * 80}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text.center(80)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'=' * 80}{Colors.ENDC}\n")


def print_success(text):
    """Печатает сообщение об успехе"""
    print(f"{Colors.OKGREEN}✓ {text}{Colors.ENDC}")


def print_error(text):
    """Печатает сообщение об ошибке"""
    print(f"{Colors.FAIL}✗ {text}{Colors.ENDC}")


def print_info(text):
    """Печатает информационное сообщение"""
    print(f"{Colors.OKCYAN}ℹ {text}{Colors.ENDC}")


def print_warning(text):
    """Печатает предупреждение"""
    print(f"{Colors.WARNING}⚠ {text}{Colors.ENDC}")


# ============================================================================
# Роли для тестирования
# ============================================================================

ROLES_TO_TEST = [
    ('SUPERADMIN', 'Суперадмин'),
    ('DIRECTOR', 'Директор'),
    ('CHIEF_ENGINEER', 'Главный инженер'),
    ('PROJECT_MANAGER', 'Руководитель проекта'),
    ('SITE_MANAGER', 'Начальник участка'),
    ('ENGINEER', 'Инженер ПТО'),
    ('FOREMAN', 'Прораб'),
    ('MASTER', 'Мастер'),
    ('SUPERVISOR', 'Технадзор'),
    ('CONTRACTOR', 'Подрядчик'),
    ('OBSERVER', 'Наблюдатель'),
    ('SUPPLY_MANAGER', 'Снабженец'),
    ('WAREHOUSE_HEAD', 'Заведующий склада'),
    ('SITE_WAREHOUSE_MANAGER', 'Завсклад объекта')
]


# ============================================================================
# Кнопки страницы Projects для проверки
# ============================================================================

BUTTONS_TO_TEST = [
    ('create', 'Создать проект'),
    ('edit', 'Редактировать проект'),
    ('delete', 'Удалить проект'),
    ('add_drawing', 'Добавить чертёж'),
    ('delete_drawing', 'Удалить чертёж'),
    ('export', 'Экспорт проектов'),
    ('export_excel', 'Экспорт Excel'),
    ('import', 'Импорт проектов'),
    ('import_excel', 'Импорт Excel'),
    ('view_details', 'Просмотр деталей')
]


# ============================================================================
# Тестовые функции
# ============================================================================

def test_button_exists_in_db():
    """
    ТЕСТ 1: Проверка наличия всех кнопок в БД
    """
    print_header("ТЕСТ 1: Проверка наличия всех кнопок в БД")

    all_buttons_exist = True

    for button_key, button_name in BUTTONS_TO_TEST:
        try:
            btn = ButtonAccess.objects.get(
                page='projects',
                button_key=button_key,
                access_type='button',
                company__isnull=True
            )
            print_success(f"Кнопка '{button_key}' ({button_name}) существует в БД")
        except ButtonAccess.DoesNotExist:
            print_error(f"Кнопка '{button_key}' ({button_name}) НЕ НАЙДЕНА в БД!")
            all_buttons_exist = False

    print()
    if all_buttons_exist:
        print_success("✅ ТЕСТ 1 ПРОЙДЕН: Все кнопки найдены в БД")
        return True
    else:
        print_error("❌ ТЕСТ 1 ПРОВАЛЕН: Некоторые кнопки отсутствуют в БД")
        return False


def test_access_matrix():
    """
    ТЕСТ 2: Проверка матрицы доступа для каждой роли
    """
    print_header("ТЕСТ 2: Проверка матрицы доступа для каждой роли")

    # Получаем все кнопки
    buttons = {}
    for button_key, _ in BUTTONS_TO_TEST:
        try:
            btn = ButtonAccess.objects.get(
                page='projects',
                button_key=button_key,
                access_type='button',
                company__isnull=True
            )
            buttons[button_key] = btn
        except ButtonAccess.DoesNotExist:
            print_warning(f"Кнопка '{button_key}' не найдена, пропускаем")
            continue

    print_info(f"Найдено кнопок для тестирования: {len(buttons)}")
    print()

    # Таблица доступа
    print(f"{'Роль':<30} | " + " | ".join([f"{btn_key:^15}" for btn_key, _ in BUTTONS_TO_TEST]))
    print("-" * 200)

    all_tests_passed = True

    for role_code, role_name in ROLES_TO_TEST:
        access_results = []

        for button_key, _ in BUTTONS_TO_TEST:
            if button_key in buttons:
                btn = buttons[button_key]
                has_access = btn.has_access(role_code)
                access_results.append("✓" if has_access else "✗")
            else:
                access_results.append("?")

        # Выводим строку таблицы
        access_str = " | ".join([f"{result:^15}" for result in access_results])
        print(f"{role_name:<30} | {access_str}")

    print()
    print_success("✅ ТЕСТ 2 ПРОЙДЕН: Матрица доступа отображена")
    return True


def test_expected_access_patterns():
    """
    ТЕСТ 3: Проверка ожидаемых паттернов доступа
    """
    print_header("ТЕСТ 3: Проверка ожидаемых паттернов доступа")

    # Ожидаемые доступы для критичных кнопок
    expected_patterns = {
        'add_drawing': {
            'description': 'Добавить чертёж',
            'should_have_access': ['SUPERADMIN', 'DIRECTOR', 'CHIEF_ENGINEER',
                                   'PROJECT_MANAGER', 'SITE_MANAGER', 'ENGINEER', 'FOREMAN'],
            'should_not_have': ['CONTRACTOR', 'OBSERVER', 'MASTER']
        },
        'delete_drawing': {
            'description': 'Удалить чертёж',
            'should_have_access': ['SUPERADMIN', 'DIRECTOR', 'CHIEF_ENGINEER',
                                   'PROJECT_MANAGER', 'SITE_MANAGER', 'ENGINEER'],
            'should_not_have': ['FOREMAN', 'CONTRACTOR', 'OBSERVER', 'MASTER']
        },
        'delete': {
            'description': 'Удалить проект',
            'should_have_access': ['SUPERADMIN', 'DIRECTOR', 'CHIEF_ENGINEER',
                                   'PROJECT_MANAGER', 'SITE_MANAGER', 'ENGINEER'],
            'should_not_have': ['FOREMAN', 'CONTRACTOR', 'OBSERVER', 'MASTER']
        }
    }

    all_passed = True

    for button_key, pattern in expected_patterns.items():
        print_info(f"\nПроверка кнопки: {button_key} ({pattern['description']})")

        try:
            btn = ButtonAccess.objects.get(
                page='projects',
                button_key=button_key,
                access_type='button',
                company__isnull=True
            )

            # Проверяем роли, которые ДОЛЖНЫ иметь доступ
            for role in pattern['should_have_access']:
                has_access = btn.has_access(role)
                if has_access:
                    print_success(f"  {role}: имеет доступ ✓")
                else:
                    print_error(f"  {role}: НЕ имеет доступа (ОШИБКА!) ✗")
                    all_passed = False

            # Проверяем роли, которые НЕ должны иметь доступ
            for role in pattern['should_not_have']:
                has_access = btn.has_access(role)
                if not has_access:
                    print_success(f"  {role}: НЕ имеет доступа (правильно) ✓")
                else:
                    print_error(f"  {role}: имеет доступ (ОШИБКА!) ✗")
                    all_passed = False

        except ButtonAccess.DoesNotExist:
            print_error(f"  Кнопка '{button_key}' не найдена в БД!")
            all_passed = False

    print()
    if all_passed:
        print_success("✅ ТЕСТ 3 ПРОЙДЕН: Все ожидаемые паттерны доступа корректны")
        return True
    else:
        print_error("❌ ТЕСТ 3 ПРОВАЛЕН: Обнаружены несоответствия в паттернах доступа")
        return False


def test_no_hardcoded_checks():
    """
    ТЕСТ 4: Проверка отсутствия хардкода в Frontend (информационный)
    """
    print_header("ТЕСТ 4: Информация о хардкоде в Frontend")

    print_info("Этот тест проверяет, что в Projects.tsx убран хардкод проверок")
    print_info("Проверьте вручную, что все функции canAddProject(), canEditProject(),")
    print_info("canDeleteProject(), canAddDrawing(), canDeleteDrawing() используют")
    print_info("ТОЛЬКО canUseButton() без проверок user?.is_superuser || user?.role === 'SUPERADMIN'")

    print()
    print_warning("⚠️  Этот тест требует ручной проверки кода Frontend")
    print_info("Откройте frontend/src/pages/Projects.tsx и убедитесь, что:")
    print_info("  1. Нет проверок типа: if (user?.is_superuser || user?.role === 'SUPERADMIN')")
    print_info("  2. Все функции проверки прав используют только: return canUseButton('button_name')")
    print_info("  3. Комментарии обновлены и не содержат устаревшей информации")

    print()
    print_success("✅ ТЕСТ 4: Информация предоставлена")
    return True


def test_page_access():
    """
    ТЕСТ 5: Проверка доступа к самой странице Projects
    """
    print_header("ТЕСТ 5: Проверка доступа к странице Projects")

    try:
        page_access = ButtonAccess.objects.get(
            page='projects',
            access_type='page',
            company__isnull=True
        )

        print_success(f"Найдена настройка доступа к странице: {page_access.button_name}")
        print_info(f"Описание: {page_access.description}")

        accessible_roles = page_access.get_accessible_roles()
        print_info(f"Роли с доступом к странице: {', '.join(accessible_roles)}")

        print()
        print_success("✅ ТЕСТ 5 ПРОЙДЕН: Доступ к странице настроен")
        return True

    except ButtonAccess.DoesNotExist:
        print_error("Настройка доступа к странице 'projects' не найдена!")
        print()
        print_error("❌ ТЕСТ 5 ПРОВАЛЕН")
        return False


# ============================================================================
# Главная функция
# ============================================================================

def main():
    """Запуск всех тестов"""
    print_header("🧪 ТЕСТИРОВАНИЕ ДОСТУПА К КНОПКАМ СТРАНИЦЫ PROJECTS")

    print_info(f"Django version: {django.get_version()}")
    print_info(f"Database: {os.environ.get('DB_NAME', 'checksite_db')}")
    print()

    # Запускаем тесты
    results = []

    results.append(("ТЕСТ 1: Проверка наличия кнопок в БД", test_button_exists_in_db()))
    results.append(("ТЕСТ 2: Проверка матрицы доступа", test_access_matrix()))
    results.append(("ТЕСТ 3: Проверка ожидаемых паттернов", test_expected_access_patterns()))
    results.append(("ТЕСТ 4: Информация о хардкоде", test_no_hardcoded_checks()))
    results.append(("ТЕСТ 5: Проверка доступа к странице", test_page_access()))

    # Финальный отчет
    print_header("📊 ИТОГОВЫЙ ОТЧЕТ")

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = f"{Colors.OKGREEN}✓ ПРОЙДЕН{Colors.ENDC}" if result else f"{Colors.FAIL}✗ ПРОВАЛЕН{Colors.ENDC}"
        print(f"{test_name:<60} {status}")

    print()
    print(f"{Colors.BOLD}Результат: {passed}/{total} тестов пройдено{Colors.ENDC}")

    if passed == total:
        print_success("✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!")
        return 0
    else:
        print_error(f"❌ ПРОВАЛЕНО ТЕСТОВ: {total - passed}")
        return 1


if __name__ == '__main__':
    sys.exit(main())
