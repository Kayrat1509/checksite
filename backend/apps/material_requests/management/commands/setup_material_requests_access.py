"""
Management команда для настройки прав доступа к странице заявок на материалы.

Создает записи в ButtonAccess для страницы material-requests и всех кнопок.

Использование:
    python manage.py setup_material_requests_access
"""

from django.core.management.base import BaseCommand
from apps.core.models import ButtonAccess


class Command(BaseCommand):
    help = 'Настраивает права доступа для страницы заявок на материалы'

    def handle(self, *args, **options):
        self.stdout.write('Настройка прав доступа для заявок на материалы...\n')

        # Список всех ролей с правами доступа
        # Категория "Руководство" - полный доступ
        management_roles = {
            'SUPERADMIN': True,
            'DIRECTOR': True,
            'CHIEF_ENGINEER': True,
            'PROJECT_MANAGER': True,
            'CHIEF_POWER_ENGINEER': True,
            'SITE_MANAGER': True,
            'FOREMAN': True,
        }

        # ИТР роли - доступ на просмотр и создание заявок
        itr_roles = {
            'ENGINEER': True,
            'POWER_ENGINEER': True,
            'MASTER': True,
        }

        # Роли снабжения - доступ для работы с заявками
        supply_roles = {
            'SUPPLY_MANAGER': True,
            'WAREHOUSE_HEAD': True,
            'SITE_WAREHOUSE_MANAGER': True,
        }

        # Объединяем все роли с доступом к странице
        all_access_roles = {**management_roles, **itr_roles, **supply_roles}

        # 1. Доступ к странице (просмотр)
        page_access, created = ButtonAccess.objects.update_or_create(
            access_type='page',
            page='material-requests',
            button_key='view',
            defaults={
                'button_name': 'Заявки на материалы',
                'description': 'Доступ к странице заявок на строительные материалы',
                'default_access': False,
                'company': None,
                **all_access_roles,
                'SUPERVISOR': False,
                'CONTRACTOR': False,
                'OBSERVER': False,
            }
        )
        self.stdout.write(
            self.style.SUCCESS(f'  ✓ Доступ к странице: {"создан" if created else "обновлен"}')
        )

        # 2. Создание заявки
        create_access, created = ButtonAccess.objects.update_or_create(
            access_type='button',
            page='material-requests',
            button_key='create',
            defaults={
                'button_name': 'Создать заявку',
                'description': 'Создание новой заявки на материалы',
                'default_access': False,
                'company': None,
                **all_access_roles,
                'SUPERVISOR': False,
                'CONTRACTOR': False,
                'OBSERVER': False,
            }
        )
        self.stdout.write(
            self.style.SUCCESS(f'  ✓ Кнопка "Создать": {"создана" if created else "обновлена"}')
        )

        # 3. Редактирование заявки (только для автора в статусе DRAFT)
        edit_access, created = ButtonAccess.objects.update_or_create(
            access_type='button',
            page='material-requests',
            button_key='edit',
            defaults={
                'button_name': 'Редактировать заявку',
                'description': 'Редактирование заявки (только черновики и автор)',
                'default_access': False,
                'company': None,
                **all_access_roles,
                'SUPERVISOR': False,
                'CONTRACTOR': False,
                'OBSERVER': False,
            }
        )
        self.stdout.write(
            self.style.SUCCESS(f'  ✓ Кнопка "Редактировать": {"создана" if created else "обновлена"}')
        )

        # 4. Удаление заявки
        delete_access, created = ButtonAccess.objects.update_or_create(
            access_type='button',
            page='material-requests',
            button_key='delete',
            defaults={
                'button_name': 'Удалить заявку',
                'description': 'Удаление заявки (soft delete)',
                'default_access': False,
                'company': None,
                **management_roles,  # Только руководство
                'ENGINEER': False,
                'POWER_ENGINEER': False,
                'MASTER': False,
                'SUPPLY_MANAGER': False,
                'WAREHOUSE_HEAD': False,
                'SITE_WAREHOUSE_MANAGER': False,
                'SUPERVISOR': False,
                'CONTRACTOR': False,
                'OBSERVER': False,
            }
        )
        self.stdout.write(
            self.style.SUCCESS(f'  ✓ Кнопка "Удалить": {"создана" if created else "обновлена"}')
        )

        # 5. Согласование заявки
        approve_access, created = ButtonAccess.objects.update_or_create(
            access_type='button',
            page='material-requests',
            button_key='approve',
            defaults={
                'button_name': 'Согласовать заявку',
                'description': 'Согласование/отклонение заявки (для согласующих)',
                'default_access': False,
                'company': None,
                **management_roles,
                **itr_roles,
                'SUPPLY_MANAGER': False,
                'WAREHOUSE_HEAD': False,
                'SITE_WAREHOUSE_MANAGER': False,
                'SUPERVISOR': False,
                'CONTRACTOR': False,
                'OBSERVER': False,
            }
        )
        self.stdout.write(
            self.style.SUCCESS(f'  ✓ Кнопка "Согласовать": {"создана" if created else "обновлена"}')
        )

        # 6. Экспорт заявки
        export_access, created = ButtonAccess.objects.update_or_create(
            access_type='button',
            page='material-requests',
            button_key='export',
            defaults={
                'button_name': 'Экспорт заявки',
                'description': 'Экспорт заявки в Excel/PDF',
                'default_access': False,
                'company': None,
                **all_access_roles,
                'SUPERVISOR': False,
                'CONTRACTOR': False,
                'OBSERVER': False,
            }
        )
        self.stdout.write(
            self.style.SUCCESS(f'  ✓ Кнопка "Экспорт": {"создана" if created else "обновлена"}')
        )

        # 7. Работа со складом (Завсклад)
        warehouse_access, created = ButtonAccess.objects.update_or_create(
            access_type='button',
            page='material-requests',
            button_key='warehouse_work',
            defaults={
                'button_name': 'Взять в работу (Завсклад)',
                'description': 'Взять заявку в работу (доступно только Завскладу)',
                'default_access': False,
                'company': None,
                'SUPERADMIN': True,
                'WAREHOUSE_HEAD': True,
                'DIRECTOR': False,
                'CHIEF_ENGINEER': False,
                'PROJECT_MANAGER': False,
                'CHIEF_POWER_ENGINEER': False,
                'SITE_MANAGER': False,
                'FOREMAN': False,
                'ENGINEER': False,
                'POWER_ENGINEER': False,
                'MASTER': False,
                'SUPPLY_MANAGER': False,
                'SITE_WAREHOUSE_MANAGER': False,
                'SUPERVISOR': False,
                'CONTRACTOR': False,
                'OBSERVER': False,
            }
        )
        self.stdout.write(
            self.style.SUCCESS(f'  ✓ Кнопка "Взять в работу": {"создана" if created else "обновлена"}')
        )

        # 8. Управление оплатой и доставкой (Снабжение)
        supply_access, created = ButtonAccess.objects.update_or_create(
            access_type='button',
            page='material-requests',
            button_key='supply_work',
            defaults={
                'button_name': 'Управление оплатой/доставкой (Снабжение)',
                'description': 'Перевод на оплату и доставку (доступно Снабжению)',
                'default_access': False,
                'company': None,
                'SUPERADMIN': True,
                'SUPPLY_MANAGER': True,
                'DIRECTOR': False,
                'CHIEF_ENGINEER': False,
                'PROJECT_MANAGER': False,
                'CHIEF_POWER_ENGINEER': False,
                'SITE_MANAGER': False,
                'FOREMAN': False,
                'ENGINEER': False,
                'POWER_ENGINEER': False,
                'MASTER': False,
                'WAREHOUSE_HEAD': False,
                'SITE_WAREHOUSE_MANAGER': False,
                'SUPERVISOR': False,
                'CONTRACTOR': False,
                'OBSERVER': False,
            }
        )
        self.stdout.write(
            self.style.SUCCESS(f'  ✓ Кнопка "Управление оплатой/доставкой": {"создана" if created else "обновлена"}')
        )

        self.stdout.write(self.style.SUCCESS('\n✅ Права доступа успешно настроены!'))
        self.stdout.write('\nДоступ к странице имеют:')
        self.stdout.write('  • Все роли категории "Руководство"')
        self.stdout.write('  • Все ИТР роли')
        self.stdout.write('  • Все роли снабжения')
        self.stdout.write('\nОграниченный доступ:')
        self.stdout.write('  • Удаление - только руководство')
        self.stdout.write('  • Согласование - руководство и ИТР')
        self.stdout.write('  • Работа со складом - только Завсклад')
        self.stdout.write('  • Оплата/доставка - только Снабжение')
