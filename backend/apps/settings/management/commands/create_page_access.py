from django.core.management.base import BaseCommand
from apps.users.models import Company, User
from apps.settings.models import PageAccess


class Command(BaseCommand):
    help = 'Создать дефолтную матрицу доступа для существующих компаний и обновить статусы пользователей'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Пересоздать матрицу доступа даже если она уже существует',
        )

    def handle(self, *args, **options):
        force = options.get('force', False)

        self.stdout.write('=' * 70)
        self.stdout.write(self.style.SUCCESS('СОЗДАНИЕ МАТРИЦЫ ДОСТУПА ДЛЯ СУЩЕСТВУЮЩИХ КОМПАНИЙ'))
        self.stdout.write('=' * 70)
        self.stdout.write('')

        companies = Company.objects.all()
        self.stdout.write(f'Найдено компаний: {companies.count()}')
        self.stdout.write('')

        for company in companies:
            self.stdout.write(f'{"=" * 70}')
            self.stdout.write(f'Компания: {company.name}')
            self.stdout.write(f'{"=" * 70}')

            # Проверяем, есть ли уже записи PageAccess
            existing_count = PageAccess.objects.filter(company=company).count()

            if existing_count > 0 and not force:
                self.stdout.write(
                    self.style.WARNING(
                        f'  У компании уже есть {existing_count} записей PageAccess.'
                    )
                )
                self.stdout.write(
                    self.style.WARNING(
                        '  Используйте флаг --force для пересоздания матрицы.'
                    )
                )
                self.stdout.write('')
                continue

            if force and existing_count > 0:
                self.stdout.write(
                    self.style.WARNING(
                        f'  Удаление существующих {existing_count} записей PageAccess...'
                    )
                )
                PageAccess.objects.filter(company=company).delete()

            # ЭТАП 1: Обновление статусов пользователей компании
            self.stdout.write(self.style.HTTP_INFO('\n  ЭТАП 1: Обновление статусов пользователей'))

            users = User.objects.filter(company=company).exclude(is_superuser=True)
            users_count = users.count()

            if users_count == 0:
                self.stdout.write(
                    self.style.WARNING('    Нет пользователей в компании. Пропускаем.')
                )
                self.stdout.write('')
                continue

            self.stdout.write(f'    Найдено пользователей: {users_count}')

            # Находим первого пользователя (по дате создания)
            first_user = users.order_by('created_at').first()

            if first_user:
                self.stdout.write(f'\n    Первый пользователь: {first_user.email}')
                self.stdout.write(f'      Роль: {first_user.get_role_display()}')

                # Обновляем статусы первого пользователя
                first_user.is_company_owner = True
                first_user.has_full_access = True
                first_user.role_category = 'MANAGEMENT'
                first_user.approved = True
                first_user.is_verified = True

                # Если роль не руководящая, назначаем DIRECTOR
                if not first_user.is_management_category:
                    old_role = first_user.get_role_display()
                    first_user.role = User.Role.DIRECTOR
                    self.stdout.write(
                        self.style.WARNING(
                            f'      Роль изменена: {old_role} → {first_user.get_role_display()}'
                        )
                    )

                first_user.save()
                self.stdout.write(
                    self.style.SUCCESS(
                        f'      ✓ Назначен владельцем компании с полным доступом'
                    )
                )

            # Обновляем остальных пользователей
            for user in users.exclude(id=first_user.id if first_user else None):
                self.stdout.write(f'\n    Пользователь: {user.email}')
                self.stdout.write(f'      Роль: {user.get_role_display()}')

                # Определяем категорию и полный доступ
                if user.is_management_category:
                    user.has_full_access = True
                    user.role_category = 'MANAGEMENT'
                    self.stdout.write(
                        self.style.SUCCESS(
                            '      ✓ Категория: Руководство (полный доступ)'
                        )
                    )
                elif user.is_itr_supply_category:
                    user.has_full_access = False
                    user.role_category = 'ITR_SUPPLY'
                    self.stdout.write(
                        self.style.HTTP_INFO(
                            '      → Категория: ИТР и снабжение (ограниченный доступ)'
                        )
                    )
                else:
                    # Для остальных ролей (CONTRACTOR, SUPERVISOR, OBSERVER)
                    user.has_full_access = False
                    user.role_category = 'ITR_SUPPLY'
                    self.stdout.write(
                        self.style.HTTP_INFO(
                            f'      → Роль {user.get_role_display()}: ограниченный доступ'
                        )
                    )

                user.save()

            # ЭТАП 2: Создание матрицы доступа
            self.stdout.write(self.style.HTTP_INFO('\n  ЭТАП 2: Создание матрицы доступа'))

            # Дефолтные права для категории "Руководство"
            # ОБНОВЛЕНО: Удален 'technical-conditions' из списка доступных страниц
            management_pages = [
                'dashboard', 'projects', 'issues', 'users', 'contractors',
                'supervisions', 'material-requests', 'warehouse',
                'tenders', 'reports', 'profile', 'settings'
            ]

            management_roles = [
                'DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER',
                'SITE_MANAGER', 'FOREMAN'
            ]

            created_count = 0
            for role in management_roles:
                for page in management_pages:
                    PageAccess.objects.create(
                        company=company,
                        role=role,
                        page=page,
                        has_access=True
                    )
                    created_count += 1

            self.stdout.write(
                self.style.SUCCESS(
                    f'    ✓ Создано {created_count} записей для категории "Руководство"'
                )
            )

            # Дефолтные права для категории "ИТР и снабжение"
            itr_pages = ['dashboard', 'profile']
            itr_roles = [
                'ENGINEER', 'MASTER', 'SUPPLY_MANAGER',
                'WAREHOUSE_HEAD', 'SITE_WAREHOUSE_MANAGER'
            ]

            itr_created_count = 0
            for role in itr_roles:
                for page in itr_pages:
                    PageAccess.objects.create(
                        company=company,
                        role=role,
                        page=page,
                        has_access=True
                    )
                    itr_created_count += 1

            self.stdout.write(
                self.style.SUCCESS(
                    f'    ✓ Создано {itr_created_count} записей для категории "ИТР и снабжение"'
                )
            )

            # Минимальный доступ для остальных ролей
            other_roles = ['CONTRACTOR', 'SUPERVISOR', 'OBSERVER']
            other_pages = ['dashboard', 'profile']

            other_created_count = 0
            for role in other_roles:
                for page in other_pages:
                    PageAccess.objects.create(
                        company=company,
                        role=role,
                        page=page,
                        has_access=True
                    )
                    other_created_count += 1

            self.stdout.write(
                self.style.SUCCESS(
                    f'    ✓ Создано {other_created_count} записей для остальных ролей'
                )
            )

            total_created = created_count + itr_created_count + other_created_count
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n  ✓ ИТОГО создано {total_created} записей PageAccess для компании "{company.name}"'
                )
            )
            self.stdout.write('')

        self.stdout.write('=' * 70)
        self.stdout.write(self.style.SUCCESS('✓ ОБРАБОТКА ЗАВЕРШЕНА!'))
        self.stdout.write('=' * 70)
        self.stdout.write('')

        # Статистика
        total_companies = companies.count()
        total_users = User.objects.exclude(is_superuser=True).count()
        total_owners = User.objects.filter(is_company_owner=True).count()
        total_access_records = PageAccess.objects.count()

        self.stdout.write(self.style.SUCCESS('СТАТИСТИКА:'))
        self.stdout.write(f'  Всего компаний: {total_companies}')
        self.stdout.write(f'  Всего пользователей: {total_users}')
        self.stdout.write(f'  Владельцев компаний: {total_owners}')
        self.stdout.write(f'  Всего записей PageAccess: {total_access_records}')
        self.stdout.write('')
