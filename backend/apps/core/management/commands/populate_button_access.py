"""
Management команда для создания записей ButtonAccess для всех кнопок системы.

Запуск:
    python manage.py populate_button_access
"""
from django.core.management.base import BaseCommand
from apps.core.models import ButtonAccess


class Command(BaseCommand):
    help = 'Создаёт записи ButtonAccess для всех кнопок и действий в системе'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('\n' + '='*80))
        self.stdout.write(self.style.WARNING('Создание записей ButtonAccess для кнопок'))
        self.stdout.write(self.style.WARNING('='*80 + '\n'))

        # Определяем все кнопки которые нужно создать
        buttons = [
            # ========== ISSUES (Замечания) ==========
            {
                'page': 'issues',
                'button_key': 'create',
                'button_name': 'Создать замечание',
                'description': 'Право на создание нового замечания',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 
                          'FOREMAN', 'SUPERVISOR', 'OBSERVER']
            },
            {
                'page': 'issues',
                'button_key': 'edit',
                'button_name': 'Редактировать замечание',
                'description': 'Право на редактирование замечания',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 'FOREMAN']
            },
            {
                'page': 'issues',
                'button_key': 'delete',
                'button_name': 'Удалить замечание',
                'description': 'Право на удаление замечания',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER']
            },
            {
                'page': 'issues',
                'button_key': 'accept',
                'button_name': 'Принять замечание',
                'description': 'Право на принятие (завершение) замечания',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 
                          'FOREMAN', 'SUPERVISOR', 'OBSERVER']
            },
            {
                'page': 'issues',
                'button_key': 'reject',
                'button_name': 'Отклонить замечание',
                'description': 'Право на отклонение замечания',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER']
            },
            {
                'page': 'issues',
                'button_key': 'upload_photo',
                'button_name': 'Загрузить фото',
                'description': 'Право на загрузку фотографий к замечанию',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 
                          'FOREMAN', 'SUPERVISOR', 'OBSERVER', 'CONTRACTOR']
            },
            {
                'page': 'issues',
                'button_key': 'add_comment',
                'button_name': 'Добавить комментарий',
                'description': 'Право на добавление комментариев к замечанию',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 
                          'FOREMAN', 'SUPERVISOR', 'OBSERVER', 'CONTRACTOR', 'ENGINEER']
            },

            # ========== PROJECTS (Проекты) ==========
            {
                'page': 'projects',
                'button_key': 'create',
                'button_name': 'Создать проект',
                'description': 'Право на создание нового проекта',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER']
            },
            {
                'page': 'projects',
                'button_key': 'edit',
                'button_name': 'Редактировать проект',
                'description': 'Право на редактирование проекта',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 'ENGINEER']
            },
            {
                'page': 'projects',
                'button_key': 'delete',
                'button_name': 'Удалить проект',
                'description': 'Право на удаление проекта',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER']
            },
            {
                'page': 'projects',
                'button_key': 'export',
                'button_name': 'Экспорт проектов',
                'description': 'Право на экспорт данных проектов в Excel',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 'ENGINEER']
            },
            {
                'page': 'projects',
                'button_key': 'import',
                'button_name': 'Импорт проектов',
                'description': 'Право на импорт данных проектов из Excel',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER']
            },

            # ========== USERS (Сотрудники) ==========
            {
                'page': 'users',
                'button_key': 'create',
                'button_name': 'Создать сотрудника',
                'description': 'Право на создание нового сотрудника',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 'ENGINEER']
            },
            {
                'page': 'users',
                'button_key': 'edit',
                'button_name': 'Редактировать сотрудника',
                'description': 'Право на редактирование данных сотрудника',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 'ENGINEER']
            },
            {
                'page': 'users',
                'button_key': 'delete',
                'button_name': 'Удалить сотрудника',
                'description': 'Право на удаление сотрудника',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER']
            },
            {
                'page': 'users',
                'button_key': 'export',
                'button_name': 'Экспорт персонала',
                'description': 'Право на экспорт данных персонала в Excel',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER']
            },
            {
                'page': 'users',
                'button_key': 'import',
                'button_name': 'Импорт персонала',
                'description': 'Право на импорт данных персонала из Excel',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER']
            },
            {
                'page': 'users',
                'button_key': 'approve',
                'button_name': 'Одобрить пользователя',
                'description': 'Право на одобрение регистрации пользователя',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER']
            },

            # ========== CONTRACTORS (Подрядчики) ==========
            {
                'page': 'contractors',
                'button_key': 'create',
                'button_name': 'Создать подрядчика',
                'description': 'Право на создание нового подрядчика',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 
                          'FOREMAN', 'ENGINEER']
            },
            {
                'page': 'contractors',
                'button_key': 'edit',
                'button_name': 'Редактировать подрядчика',
                'description': 'Право на редактирование данных подрядчика',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 
                          'FOREMAN', 'ENGINEER']
            },
            {
                'page': 'contractors',
                'button_key': 'delete',
                'button_name': 'Удалить подрядчика',
                'description': 'Право на удаление подрядчика',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER']
            },
            {
                'page': 'contractors',
                'button_key': 'export',
                'button_name': 'Экспорт подрядчиков',
                'description': 'Право на экспорт данных подрядчиков в Excel',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 
                          'FOREMAN', 'ENGINEER']
            },
            {
                'page': 'contractors',
                'button_key': 'import',
                'button_name': 'Импорт подрядчиков',
                'description': 'Право на импорт данных подрядчиков из Excel',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 
                          'FOREMAN', 'ENGINEER']
            },

            # ========== SUPERVISIONS (Надзоры) ==========
            {
                'page': 'supervisions',
                'button_key': 'create',
                'button_name': 'Создать надзор',
                'description': 'Право на создание нового надзора',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 
                          'FOREMAN', 'ENGINEER']
            },
            {
                'page': 'supervisions',
                'button_key': 'edit',
                'button_name': 'Редактировать надзор',
                'description': 'Право на редактирование данных надзора',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 
                          'FOREMAN', 'ENGINEER']
            },
            {
                'page': 'supervisions',
                'button_key': 'delete',
                'button_name': 'Удалить надзор',
                'description': 'Право на удаление надзора',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER']
            },
            {
                'page': 'supervisions',
                'button_key': 'export',
                'button_name': 'Экспорт надзоров',
                'description': 'Право на экспорт данных надзоров в Excel',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 
                          'FOREMAN', 'ENGINEER']
            },
            {
                'page': 'supervisions',
                'button_key': 'import',
                'button_name': 'Импорт надзоров',
                'description': 'Право на импорт данных надзоров из Excel',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 
                          'FOREMAN', 'ENGINEER']
            },

            # ========== MATERIAL REQUESTS (Заявки) ==========
            {
                'page': 'material-requests',
                'button_key': 'create',
                'button_name': 'Создать заявку',
                'description': 'Право на создание заявки на материалы',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 
                          'FOREMAN', 'MASTER', 'ENGINEER']
            },
            {
                'page': 'material-requests',
                'button_key': 'edit',
                'button_name': 'Редактировать заявку',
                'description': 'Право на редактирование заявки',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SUPPLY_MANAGER']
            },
            {
                'page': 'material-requests',
                'button_key': 'delete',
                'button_name': 'Удалить заявку',
                'description': 'Право на удаление заявки',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'SUPPLY_MANAGER']
            },
            {
                'page': 'material-requests',
                'button_key': 'approve',
                'button_name': 'Утвердить заявку',
                'description': 'Право на утверждение заявки',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'SUPPLY_MANAGER']
            },
            {
                'page': 'material-requests',
                'button_key': 'reject',
                'button_name': 'Отклонить заявку',
                'description': 'Право на отклонение заявки',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'SUPPLY_MANAGER']
            },

            # ========== WAREHOUSE (Склад) ==========
            {
                'page': 'warehouse',
                'button_key': 'create',
                'button_name': 'Добавить на склад',
                'description': 'Право на добавление товаров на склад',
                'roles': ['DIRECTOR', 'WAREHOUSE_HEAD', 'SUPPLY_MANAGER']
            },
            {
                'page': 'warehouse',
                'button_key': 'edit',
                'button_name': 'Редактировать товар',
                'description': 'Право на редактирование товара на складе',
                'roles': ['DIRECTOR', 'WAREHOUSE_HEAD', 'SUPPLY_MANAGER']
            },
            {
                'page': 'warehouse',
                'button_key': 'delete',
                'button_name': 'Удалить товар',
                'description': 'Право на удаление товара со склада',
                'roles': ['DIRECTOR', 'WAREHOUSE_HEAD']
            },

            # ========== TENDERS (Тендеры) ==========
            {
                'page': 'tenders',
                'button_key': 'create',
                'button_name': 'Создать тендер',
                'description': 'Право на создание тендера',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SUPPLY_MANAGER']
            },
            {
                'page': 'tenders',
                'button_key': 'edit',
                'button_name': 'Редактировать тендер',
                'description': 'Право на редактирование тендера',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SUPPLY_MANAGER']
            },
            {
                'page': 'tenders',
                'button_key': 'delete',
                'button_name': 'Удалить тендер',
                'description': 'Право на удаление тендера',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER']
            },
            {
                'page': 'tenders',
                'button_key': 'approve',
                'button_name': 'Утвердить тендер',
                'description': 'Право на утверждение тендера',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER']
            },

            # ========== SETTINGS (Настройки) ==========
            {
                'page': 'settings',
                'button_key': 'edit',
                'button_name': 'Изменить настройки',
                'description': 'Право на изменение настроек системы',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER']
            },
            {
                'page': 'settings',
                'button_key': 'manage_access',
                'button_name': 'Управление доступом',
                'description': 'Право на управление матрицей доступа',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER']
            },

            # ========== RECYCLE BIN (Корзина) ==========
            {
                'page': 'dashboard',
                'button_key': 'recycle_bin_access',
                'button_name': 'Доступ к корзине',
                'description': 'Право на просмотр корзины удалённых элементов',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER']
            },
            {
                'page': 'dashboard',
                'button_key': 'recycle_bin_restore',
                'button_name': 'Восстановить из корзины',
                'description': 'Право на восстановление элементов из корзины',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER']
            },
            {
                'page': 'dashboard',
                'button_key': 'recycle_bin_delete',
                'button_name': 'Окончательно удалить',
                'description': 'Право на окончательное удаление элементов из корзины',
                'roles': ['DIRECTOR', 'CHIEF_ENGINEER']
            },
        ]

        created_count = 0
        updated_count = 0
        skipped_count = 0

        for button_data in buttons:
            page = button_data['page']
            button_key = button_data['button_key']
            button_name = button_data['button_name']
            description = button_data['description']
            allowed_roles = button_data['roles']

            # Проверяем существует ли уже такая кнопка
            existing = ButtonAccess.objects.filter(
                access_type='button',
                button_key=button_key,
                page=page,
                company__isnull=True
            ).first()

            if existing:
                # Обновляем существующую кнопку
                existing.button_name = button_name
                existing.description = description
                
                # Устанавливаем права для всех ролей
                for role in ['SUPERADMIN', 'DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER',
                             'SITE_MANAGER', 'FOREMAN', 'MASTER', 'ENGINEER', 'SUPERVISOR',
                             'OBSERVER', 'CONTRACTOR', 'SUPPLY_MANAGER', 'WAREHOUSE_HEAD',
                             'SITE_WAREHOUSE_MANAGER']:
                    setattr(existing, role, role in allowed_roles or role == 'SUPERADMIN')
                
                existing.save()
                updated_count += 1
                self.stdout.write(self.style.SUCCESS(f'  ✓ Обновлено: {page}/{button_key}'))
            else:
                # Создаём новую кнопку
                button = ButtonAccess(
                    access_type='button',
                    company=None,
                    page=page,
                    button_key=button_key,
                    button_name=button_name,
                    description=description,
                    default_access=False,
                    SUPERADMIN=True,
                )
                
                # Устанавливаем права для ролей
                for role in ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER',
                             'SITE_MANAGER', 'FOREMAN', 'MASTER', 'ENGINEER', 'SUPERVISOR',
                             'OBSERVER', 'CONTRACTOR', 'SUPPLY_MANAGER', 'WAREHOUSE_HEAD',
                             'SITE_WAREHOUSE_MANAGER']:
                    setattr(button, role, role in allowed_roles)
                
                button.save()
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  + Создано: {page}/{button_key}'))

        self.stdout.write('\n' + '='*80)
        self.stdout.write(self.style.SUCCESS(f'\n✅ Готово!'))
        self.stdout.write(self.style.SUCCESS(f'   Создано: {created_count}'))
        self.stdout.write(self.style.SUCCESS(f'   Обновлено: {updated_count}'))
        self.stdout.write(self.style.SUCCESS(f'   Пропущено: {skipped_count}'))
        self.stdout.write(self.style.WARNING('\n📝 Настроить права доступа можно в админке:'))
        self.stdout.write(self.style.WARNING('   http://localhost:8001/admin/core/buttonaccess/\n'))
        self.stdout.write('='*80 + '\n')
