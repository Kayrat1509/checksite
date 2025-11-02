"""
Management команда для заполнения начальных данных матрицы доступа к кнопкам.

Использование:
    python manage.py populate_button_access

Описание:
    Создает начальные записи ButtonAccess для всех страниц системы.
    Если запись уже существует (по page + button_key), она будет обновлена.
"""

from django.core.management.base import BaseCommand
from apps.core.models import ButtonAccess


class Command(BaseCommand):
    help = 'Заполнение начальных данных для матрицы доступа к кнопкам'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Начинаем заполнение матрицы доступа к кнопкам...'))

        buttons_data = self.get_buttons_data()
        created_count = 0
        updated_count = 0

        for button_data in buttons_data:
            obj, created = ButtonAccess.objects.update_or_create(
                page=button_data['page'],
                button_key=button_data['button_key'],
                defaults=button_data
            )

            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  ✓ Создано: {button_data["page"]} - {button_data["button_name"]}'
                    )
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(
                        f'  ↻ Обновлено: {button_data["page"]} - {button_data["button_name"]}'
                    )
                )

        self.stdout.write('\n' + '=' * 80)
        self.stdout.write(
            self.style.SUCCESS(
                f'Завершено! Создано: {created_count}, Обновлено: {updated_count}'
            )
        )
        self.stdout.write('=' * 80)

    def get_buttons_data(self):
        """
        Возвращает список начальных данных для кнопок.

        Формат:
        {
            'page': 'projects',
            'button_key': 'create',
            'button_name': 'Создать проект',
            'description': 'Создание нового проекта',
            'default_access': False,
            'DIRECTOR': True,
            'CHIEF_ENGINEER': True,
            ...
        }
        """
        return [
            # ============ ПРОЕКТЫ (projects) ============
            {
                'page': 'projects',
                'button_key': 'create',
                'button_name': 'Создать проект',
                'description': 'Создание нового проекта',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
                'PROJECT_MANAGER': True,
            },
            {
                'page': 'projects',
                'button_key': 'edit',
                'button_name': 'Редактировать',
                'description': 'Редактирование проекта',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
                'PROJECT_MANAGER': True,
                'SITE_MANAGER': True,
            },
            {
                'page': 'projects',
                'button_key': 'delete',
                'button_name': 'Удалить',
                'description': 'Удаление проекта (в корзину)',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
            },
            {
                'page': 'projects',
                'button_key': 'view_details',
                'button_name': 'Просмотр деталей',
                'description': 'Просмотр подробной информации о проекте',
                'default_access': True,
            },
            {
                'page': 'projects',
                'button_key': 'export_excel',
                'button_name': 'Экспорт Excel',
                'description': 'Экспорт проектов в Excel',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
                'PROJECT_MANAGER': True,
            },
            {
                'page': 'projects',
                'button_key': 'import_excel',
                'button_name': 'Импорт Excel',
                'description': 'Импорт проектов из Excel',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
            },

            # ============ СОТРУДНИКИ (users) ============
            {
                'page': 'users',
                'button_key': 'create',
                'button_name': 'Добавить сотрудника',
                'description': 'Создание нового пользователя',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
                'PROJECT_MANAGER': True,
            },
            {
                'page': 'users',
                'button_key': 'edit',
                'button_name': 'Редактировать',
                'description': 'Редактирование данных сотрудника',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
                'PROJECT_MANAGER': True,
            },
            {
                'page': 'users',
                'button_key': 'delete',
                'button_name': 'Удалить',
                'description': 'Удаление сотрудника (в корзину)',
                'default_access': False,
                'DIRECTOR': True,
            },
            {
                'page': 'users',
                'button_key': 'export_excel',
                'button_name': 'Экспорт Excel',
                'description': 'Экспорт сотрудников в Excel',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
                'PROJECT_MANAGER': True,
            },
            {
                'page': 'users',
                'button_key': 'import_excel',
                'button_name': 'Импорт Excel',
                'description': 'Импорт сотрудников из Excel',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
            },
            {
                'page': 'users',
                'button_key': 'reset_password',
                'button_name': 'Сбросить пароль',
                'description': 'Сброс пароля пользователя',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
            },
            {
                'page': 'users',
                'button_key': 'view_details',
                'button_name': 'Просмотр профиля',
                'description': 'Просмотр профиля сотрудника',
                'default_access': True,
            },

            # ============ ПОДРЯДЧИКИ (contractors) ============
            {
                'page': 'contractors',
                'button_key': 'create',
                'button_name': 'Добавить подрядчика',
                'description': 'Создание нового подрядчика',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
                'PROJECT_MANAGER': True,
            },
            {
                'page': 'contractors',
                'button_key': 'edit',
                'button_name': 'Редактировать',
                'description': 'Редактирование данных подрядчика',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
                'PROJECT_MANAGER': True,
            },
            {
                'page': 'contractors',
                'button_key': 'delete',
                'button_name': 'Удалить',
                'description': 'Удаление подрядчика',
                'default_access': False,
                'DIRECTOR': True,
            },
            {
                'page': 'contractors',
                'button_key': 'export_excel',
                'button_name': 'Экспорт Excel',
                'description': 'Экспорт подрядчиков в Excel',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
                'PROJECT_MANAGER': True,
            },
            {
                'page': 'contractors',
                'button_key': 'import_excel',
                'button_name': 'Импорт Excel',
                'description': 'Импорт подрядчиков из Excel',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
            },
            {
                'page': 'contractors',
                'button_key': 'view_details',
                'button_name': 'Просмотр деталей',
                'description': 'Просмотр информации о подрядчике',
                'default_access': True,
            },

            # ============ ЗАМЕЧАНИЯ (issues) ============
            {
                'page': 'issues',
                'button_key': 'create',
                'button_name': 'Создать замечание',
                'description': 'Создание нового замечания',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
                'PROJECT_MANAGER': True,
                'ENGINEER': True,
                'SITE_MANAGER': True,
                'FOREMAN': True,
                'MASTER': True,
                'SUPERVISOR': True,
            },
            {
                'page': 'issues',
                'button_key': 'edit',
                'button_name': 'Редактировать',
                'description': 'Редактирование замечания',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
                'PROJECT_MANAGER': True,
                'ENGINEER': True,
                'SITE_MANAGER': True,
                'FOREMAN': True,
            },
            {
                'page': 'issues',
                'button_key': 'delete',
                'button_name': 'Удалить',
                'description': 'Удаление замечания',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
                'PROJECT_MANAGER': True,
            },
            {
                'page': 'issues',
                'button_key': 'change_status',
                'button_name': 'Изменить статус',
                'description': 'Изменение статуса замечания',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
                'PROJECT_MANAGER': True,
                'ENGINEER': True,
                'SITE_MANAGER': True,
                'FOREMAN': True,
                'MASTER': True,
            },
            {
                'page': 'issues',
                'button_key': 'assign',
                'button_name': 'Назначить исполнителя',
                'description': 'Назначение исполнителя на замечание',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
                'PROJECT_MANAGER': True,
                'SITE_MANAGER': True,
                'FOREMAN': True,
            },
            {
                'page': 'issues',
                'button_key': 'add_comment',
                'button_name': 'Добавить комментарий',
                'description': 'Добавление комментария к замечанию',
                'default_access': True,
            },
            {
                'page': 'issues',
                'button_key': 'upload_photo',
                'button_name': 'Загрузить фото',
                'description': 'Загрузка фотографий к замечанию',
                'default_access': True,
            },
            {
                'page': 'issues',
                'button_key': 'view_details',
                'button_name': 'Просмотр деталей',
                'description': 'Просмотр подробной информации о замечании',
                'default_access': True,
            },

            # ============ СКЛАД (warehouse) ============
            {
                'page': 'warehouse',
                'button_key': 'create_item',
                'button_name': 'Добавить товар',
                'description': 'Добавление нового товара на склад',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
                'SUPPLY_MANAGER': True,
                'WAREHOUSE_HEAD': True,
                'SITE_WAREHOUSE_MANAGER': True,
            },
            {
                'page': 'warehouse',
                'button_key': 'edit_item',
                'button_name': 'Редактировать',
                'description': 'Редактирование информации о товаре',
                'default_access': False,
                'DIRECTOR': True,
                'SUPPLY_MANAGER': True,
                'WAREHOUSE_HEAD': True,
                'SITE_WAREHOUSE_MANAGER': True,
            },
            {
                'page': 'warehouse',
                'button_key': 'delete_item',
                'button_name': 'Удалить',
                'description': 'Удаление товара со склада',
                'default_access': False,
                'DIRECTOR': True,
                'WAREHOUSE_HEAD': True,
            },
            {
                'page': 'warehouse',
                'button_key': 'move_items',
                'button_name': 'Перемещение',
                'description': 'Перемещение товаров между складами',
                'default_access': False,
                'DIRECTOR': True,
                'SUPPLY_MANAGER': True,
                'WAREHOUSE_HEAD': True,
                'SITE_WAREHOUSE_MANAGER': True,
            },
            {
                'page': 'warehouse',
                'button_key': 'write_off',
                'button_name': 'Списание',
                'description': 'Списание товаров',
                'default_access': False,
                'DIRECTOR': True,
                'WAREHOUSE_HEAD': True,
            },
            {
                'page': 'warehouse',
                'button_key': 'view_details',
                'button_name': 'Просмотр деталей',
                'description': 'Просмотр информации о товаре',
                'default_access': True,
            },

            # ============ ЗАЯВКИ (material-requests) ============
            {
                'page': 'material-requests',
                'button_key': 'create',
                'button_name': 'Создать заявку',
                'description': 'Создание новой заявки на материалы',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
                'PROJECT_MANAGER': True,
                'ENGINEER': True,
                'SITE_MANAGER': True,
                'FOREMAN': True,
                'MASTER': True,
            },
            {
                'page': 'material-requests',
                'button_key': 'edit',
                'button_name': 'Редактировать',
                'description': 'Редактирование заявки',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
                'PROJECT_MANAGER': True,
                'SUPPLY_MANAGER': True,
            },
            {
                'page': 'material-requests',
                'button_key': 'delete',
                'button_name': 'Удалить',
                'description': 'Удаление заявки',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
            },
            {
                'page': 'material-requests',
                'button_key': 'approve',
                'button_name': 'Согласовать',
                'description': 'Согласование заявки',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
                'PROJECT_MANAGER': True,
                'SUPPLY_MANAGER': True,
            },
            {
                'page': 'material-requests',
                'button_key': 'reject',
                'button_name': 'Отклонить',
                'description': 'Отклонение заявки',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
                'PROJECT_MANAGER': True,
                'SUPPLY_MANAGER': True,
            },
            {
                'page': 'material-requests',
                'button_key': 'view_details',
                'button_name': 'Просмотр деталей',
                'description': 'Просмотр подробной информации о заявке',
                'default_access': True,
            },

            # ============ ТЕНДЕРЫ (tenders) ============
            {
                'page': 'tenders',
                'button_key': 'create',
                'button_name': 'Создать тендер',
                'description': 'Создание нового тендера',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
                'PROJECT_MANAGER': True,
            },
            {
                'page': 'tenders',
                'button_key': 'edit',
                'button_name': 'Редактировать',
                'description': 'Редактирование тендера',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
                'PROJECT_MANAGER': True,
            },
            {
                'page': 'tenders',
                'button_key': 'delete',
                'button_name': 'Удалить',
                'description': 'Удаление тендера',
                'default_access': False,
                'DIRECTOR': True,
            },
            {
                'page': 'tenders',
                'button_key': 'view_details',
                'button_name': 'Просмотр деталей',
                'description': 'Просмотр подробной информации о тендере',
                'default_access': True,
            },
            {
                'page': 'tenders',
                'button_key': 'submit_bid',
                'button_name': 'Подать заявку',
                'description': 'Подача заявки на участие в тендере',
                'default_access': False,
                'CONTRACTOR': True,
            },

            # ============ НАДЗОРЫ (supervisions) ============
            {
                'page': 'supervisions',
                'button_key': 'create',
                'button_name': 'Добавить надзор',
                'description': 'Создание нового надзора',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
                'PROJECT_MANAGER': True,
            },
            {
                'page': 'supervisions',
                'button_key': 'edit',
                'button_name': 'Редактировать',
                'description': 'Редактирование данных надзора',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
                'PROJECT_MANAGER': True,
            },
            {
                'page': 'supervisions',
                'button_key': 'delete',
                'button_name': 'Удалить',
                'description': 'Удаление надзора',
                'default_access': False,
                'DIRECTOR': True,
            },
            {
                'page': 'supervisions',
                'button_key': 'export_excel',
                'button_name': 'Экспорт Excel',
                'description': 'Экспорт надзоров в Excel',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
                'PROJECT_MANAGER': True,
            },
            {
                'page': 'supervisions',
                'button_key': 'import_excel',
                'button_name': 'Импорт Excel',
                'description': 'Импорт надзоров из Excel',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
            },
            {
                'page': 'supervisions',
                'button_key': 'view_details',
                'button_name': 'Просмотр деталей',
                'description': 'Просмотр информации о надзоре',
                'default_access': True,
            },

            # ============ ОТЧЕТЫ (reports) ============
            {
                'page': 'reports',
                'button_key': 'generate',
                'button_name': 'Сгенерировать отчет',
                'description': 'Генерация нового отчета',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
                'PROJECT_MANAGER': True,
                'SITE_MANAGER': True,
                'FOREMAN': True,
            },
            {
                'page': 'reports',
                'button_key': 'export_pdf',
                'button_name': 'Экспорт PDF',
                'description': 'Экспорт отчета в PDF',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
                'PROJECT_MANAGER': True,
                'SITE_MANAGER': True,
            },
            {
                'page': 'reports',
                'button_key': 'export_excel',
                'button_name': 'Экспорт Excel',
                'description': 'Экспорт отчета в Excel',
                'default_access': False,
                'DIRECTOR': True,
                'CHIEF_ENGINEER': True,
                'PROJECT_MANAGER': True,
                'SITE_MANAGER': True,
            },
            {
                'page': 'reports',
                'button_key': 'view_details',
                'button_name': 'Просмотр отчета',
                'description': 'Просмотр детальной информации отчета',
                'default_access': True,
            },
        ]
