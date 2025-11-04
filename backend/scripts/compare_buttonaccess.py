#!/usr/bin/env python
"""
Скрипт для сравнения записей ButtonAccess между локальной и продакшн БД.

Использование:
    python manage.py shell < scripts/compare_buttonaccess.py

Или запустить напрямую из Django shell:
    from scripts.compare_buttonaccess import compare_databases
    compare_databases()
"""

def compare_databases():
    """
    Сравнивает записи ButtonAccess локальной БД с тем, что должно быть в продакшн.
    """
    from apps.core.models import ButtonAccess

    print("=" * 80)
    print("СРАВНЕНИЕ ЛОКАЛЬНОЙ И ПРОДАКШН БАЗ ДАННЫХ ButtonAccess")
    print("=" * 80)

    # Получаем все записи из локальной БД
    local_records = ButtonAccess.objects.filter(company__isnull=True).order_by('id')

    # Статистика продакшн (от пользователя)
    prod_buttons_count = 77
    prod_pages_count = 12
    prod_total_count = 89

    # Статистика локальной БД
    local_buttons = local_records.filter(access_type='button')
    local_pages = local_records.filter(access_type='page')

    local_buttons_count = local_buttons.count()
    local_pages_count = local_pages.count()
    local_total_count = local_records.count()

    print(f"\n📊 СТАТИСТИКА:")
    print(f"{'':20} {'Локальная БД':15} {'Продакшн БД':15} {'Разница':10}")
    print("-" * 60)
    print(f"{'Кнопки:':20} {local_buttons_count:<15} {prod_buttons_count:<15} {local_buttons_count - prod_buttons_count:<10}")
    print(f"{'Страницы:':20} {local_pages_count:<15} {prod_pages_count:<15} {local_pages_count - prod_pages_count:<10}")
    print(f"{'Всего записей:':20} {local_total_count:<15} {prod_total_count:<15} {local_total_count - prod_total_count:<10}")
    print("-" * 60)

    missing_buttons = local_buttons_count - prod_buttons_count
    missing_pages = local_pages_count - prod_pages_count
    missing_total = local_total_count - prod_total_count

    print(f"\n⚠️  В ПРОДАКШН ОТСУТСТВУЕТ:")
    print(f"   • {missing_buttons} кнопок")
    print(f"   • {missing_pages} страница")
    print(f"   • {missing_total} записей всего")

    # Поиск недавно добавленных записей (ID > 134)
    print(f"\n🔍 НЕДАВНО ДОБАВЛЕННЫЕ ЗАПИСИ (ID > 134):")
    print("-" * 80)

    recent_records = local_records.filter(id__gt=134).order_by('id')
    if recent_records.exists():
        print(f"Найдено {recent_records.count()} записей с ID > 134:\n")

        for rec in recent_records:
            access_type_emoji = "🔘" if rec.access_type == "button" else "📄"
            print(f"{access_type_emoji} ID={rec.id:3d} | {rec.access_type:6} | page=\"{rec.page}\" | button_key=\"{rec.button_key}\" | name=\"{rec.button_name}\"")
    else:
        print("Нет записей с ID > 134")

    # Вероятные отсутствующие записи (самые свежие)
    print(f"\n🎯 ВЕРОЯТНЫЕ ОТСУТСТВУЮЩИЕ ЗАПИСИ В ПРОДАКШН:")
    print("-" * 80)
    print(f"(Предположительно, это {missing_total} самых новых записей)\n")

    # Сортируем по ID в обратном порядке и берём первые missing_total
    all_records_desc = local_records.order_by('-id')[:missing_total]

    pages_missing = []
    buttons_missing = []

    for rec in all_records_desc:
        if rec.access_type == 'page':
            pages_missing.append(rec)
        else:
            buttons_missing.append(rec)

    # Выводим отсутствующую страницу
    if pages_missing:
        print("📄 ОТСУТСТВУЮЩАЯ СТРАНИЦА:")
        for page in pages_missing:
            print(f"   ID={page.id:3d} | page=\"{page.page}\" | button_key=\"{page.button_key}\" | name=\"{page.button_name}\"")
        print()

    # Выводим отсутствующие кнопки
    if buttons_missing:
        print(f"🔘 ОТСУТСТВУЮЩИЕ КНОПКИ ({len(buttons_missing)} шт.):")

        # Группируем по страницам
        buttons_by_page = {}
        for btn in buttons_missing:
            if btn.page not in buttons_by_page:
                buttons_by_page[btn.page] = []
            buttons_by_page[btn.page].append(btn)

        for page_name in sorted(buttons_by_page.keys()):
            page_buttons = buttons_by_page[page_name]
            print(f"\n   [{page_name}] - {len(page_buttons)} кнопок:")
            for btn in page_buttons:
                print(f"      ID={btn.id:3d} | button_key=\"{btn.button_key}\" | name=\"{btn.button_name}\"")

    # SQL для добавления отсутствующих записей
    print(f"\n\n" + "=" * 80)
    print("📝 SQL ДЛЯ СИНХРОНИЗАЦИИ ПРОДАКШН БД:")
    print("=" * 80)
    print("\n-- Добавьте эти записи в продакшн базу данных:\n")

    for rec in all_records_desc.order_by('id'):
        # Формируем список ролей
        roles_dict = {
            'DIRECTOR': rec.DIRECTOR,
            'CHIEF_ENGINEER': rec.CHIEF_ENGINEER,
            'PROJECT_MANAGER': rec.PROJECT_MANAGER,
            'ENGINEER': rec.ENGINEER,
            'SITE_MANAGER': rec.SITE_MANAGER,
            'FOREMAN': rec.FOREMAN,
            'MASTER': rec.MASTER,
            'SUPERVISOR': rec.SUPERVISOR,
            'CONTRACTOR': rec.CONTRACTOR,
            'OBSERVER': rec.OBSERVER,
            'SUPPLY_MANAGER': rec.SUPPLY_MANAGER,
            'WAREHOUSE_HEAD': rec.WAREHOUSE_HEAD,
            'SITE_WAREHOUSE_MANAGER': rec.SITE_WAREHOUSE_MANAGER,
        }

        roles_str = ', '.join([f'"{k}"' for k, v in roles_dict.items() if v])

        print(f"""INSERT INTO core_buttonaccess (
    id, access_type, company_id, page, button_key, button_name, description,
    default_access, created_at, updated_at,
    "DIRECTOR", "CHIEF_ENGINEER", "PROJECT_MANAGER", "ENGINEER", "SITE_MANAGER",
    "FOREMAN", "MASTER", "SUPERVISOR", "CONTRACTOR", "OBSERVER",
    "SUPPLY_MANAGER", "WAREHOUSE_HEAD", "SITE_WAREHOUSE_MANAGER"
) VALUES (
    {rec.id}, '{rec.access_type}', NULL, '{rec.page}', '{rec.button_key}', '{rec.button_name}', '{rec.description or ""}',
    {str(rec.default_access).upper()}, NOW(), NOW(),
    {str(rec.DIRECTOR).upper()}, {str(rec.CHIEF_ENGINEER).upper()}, {str(rec.PROJECT_MANAGER).upper()},
    {str(rec.ENGINEER).upper()}, {str(rec.SITE_MANAGER).upper()}, {str(rec.FOREMAN).upper()},
    {str(rec.MASTER).upper()}, {str(rec.SUPERVISOR).upper()}, {str(rec.CONTRACTOR).upper()},
    {str(rec.OBSERVER).upper()}, {str(rec.SUPPLY_MANAGER).upper()}, {str(rec.WAREHOUSE_HEAD).upper()},
    {str(rec.SITE_WAREHOUSE_MANAGER).upper()}
);
""")

    print("\n" + "=" * 80)
    print("✅ СРАВНЕНИЕ ЗАВЕРШЕНО")
    print("=" * 80)


if __name__ == '__main__':
    compare_databases()
