from django.core.management.base import BaseCommand
from apps.settings.models import PageAccess
from apps.users.models import Company


class Command(BaseCommand):
    help = 'Заполняет матрицу доступа значениями по умолчанию для всех компаний'

    def handle(self, *args, **options):
        """
        Создает записи доступа на основе текущей конфигурации из Settings.tsx
        для всех активных компаний в системе.
        """

        # Получаем все активные компании
        companies = Company.objects.filter(is_active=True)

        if not companies.exists():
            self.stdout.write(self.style.WARNING('В системе нет активных компаний'))
            return

        # Матрица доступа по умолчанию (из Settings.tsx)
        default_matrix = {
            'dashboard': {
                'DIRECTOR': True, 'CHIEF_ENGINEER': True, 'PROJECT_MANAGER': True,
                'ENGINEER': True, 'SITE_MANAGER': True, 'FOREMAN': True,
                'MASTER': True, 'SUPERVISOR': True, 'CONTRACTOR': True,
                'OBSERVER': True, 'SUPPLY_MANAGER': False, 'WAREHOUSE_HEAD': False,
                'SITE_WAREHOUSE_MANAGER': False,
            },
            'projects': {
                'DIRECTOR': True, 'CHIEF_ENGINEER': True, 'PROJECT_MANAGER': True,
                'ENGINEER': True, 'SITE_MANAGER': True, 'FOREMAN': True,
                'MASTER': True, 'SUPERVISOR': True, 'CONTRACTOR': True,
                'OBSERVER': True, 'SUPPLY_MANAGER': True, 'WAREHOUSE_HEAD': True,
                'SITE_WAREHOUSE_MANAGER': True,
            },
            'issues': {
                'DIRECTOR': True, 'CHIEF_ENGINEER': True, 'PROJECT_MANAGER': True,
                'ENGINEER': True, 'SITE_MANAGER': True, 'FOREMAN': True,
                'MASTER': True, 'SUPERVISOR': True, 'CONTRACTOR': True,
                'OBSERVER': True, 'SUPPLY_MANAGER': False, 'WAREHOUSE_HEAD': False,
                'SITE_WAREHOUSE_MANAGER': False,
            },
            'users': {
                'DIRECTOR': True, 'CHIEF_ENGINEER': True, 'PROJECT_MANAGER': True,
                'ENGINEER': True, 'SITE_MANAGER': True, 'FOREMAN': True,
                'MASTER': False, 'SUPERVISOR': False, 'CONTRACTOR': False,
                'OBSERVER': False, 'SUPPLY_MANAGER': False, 'WAREHOUSE_HEAD': False,
                'SITE_WAREHOUSE_MANAGER': False,
            },
            'contractors': {
                'DIRECTOR': True, 'CHIEF_ENGINEER': True, 'PROJECT_MANAGER': True,
                'ENGINEER': True, 'SITE_MANAGER': True, 'FOREMAN': False,
                'MASTER': False, 'SUPERVISOR': False, 'CONTRACTOR': False,
                'OBSERVER': False, 'SUPPLY_MANAGER': False, 'WAREHOUSE_HEAD': False,
                'SITE_WAREHOUSE_MANAGER': False,
            },
            'supervisions': {
                'DIRECTOR': True, 'CHIEF_ENGINEER': True, 'PROJECT_MANAGER': True,
                'ENGINEER': True, 'SITE_MANAGER': True, 'FOREMAN': True,
                'MASTER': False, 'SUPERVISOR': False, 'CONTRACTOR': False,
                'OBSERVER': False, 'SUPPLY_MANAGER': False, 'WAREHOUSE_HEAD': False,
                'SITE_WAREHOUSE_MANAGER': False,
            },
            'technical-conditions': {
                'DIRECTOR': True, 'CHIEF_ENGINEER': True, 'PROJECT_MANAGER': True,
                'ENGINEER': True, 'SITE_MANAGER': True, 'FOREMAN': True,
                'MASTER': True, 'SUPERVISOR': True, 'CONTRACTOR': True,
                'OBSERVER': True, 'SUPPLY_MANAGER': False, 'WAREHOUSE_HEAD': False,
                'SITE_WAREHOUSE_MANAGER': False,
            },
            'material-requests': {
                'DIRECTOR': True, 'CHIEF_ENGINEER': True, 'PROJECT_MANAGER': True,
                'ENGINEER': True, 'SITE_MANAGER': True, 'FOREMAN': True,
                'MASTER': True, 'SUPERVISOR': True, 'CONTRACTOR': True,
                'OBSERVER': True, 'SUPPLY_MANAGER': True, 'WAREHOUSE_HEAD': True,
                'SITE_WAREHOUSE_MANAGER': True,
            },
            'warehouse': {
                'DIRECTOR': True, 'CHIEF_ENGINEER': True, 'PROJECT_MANAGER': True,
                'ENGINEER': True, 'SITE_MANAGER': True, 'FOREMAN': True,
                'MASTER': True, 'SUPERVISOR': True, 'CONTRACTOR': True,
                'OBSERVER': True, 'SUPPLY_MANAGER': True, 'WAREHOUSE_HEAD': True,
                'SITE_WAREHOUSE_MANAGER': True,
            },
            'tenders': {
                'DIRECTOR': True, 'CHIEF_ENGINEER': True, 'PROJECT_MANAGER': True,
                'ENGINEER': True, 'SITE_MANAGER': True, 'FOREMAN': True,
                'MASTER': True, 'SUPERVISOR': False, 'CONTRACTOR': False,
                'OBSERVER': False, 'SUPPLY_MANAGER': False, 'WAREHOUSE_HEAD': False,
                'SITE_WAREHOUSE_MANAGER': False,
            },
            'reports': {
                'DIRECTOR': True, 'CHIEF_ENGINEER': True, 'PROJECT_MANAGER': True,
                'ENGINEER': True, 'SITE_MANAGER': True, 'FOREMAN': True,
                'MASTER': True, 'SUPERVISOR': True, 'CONTRACTOR': False,
                'OBSERVER': True, 'SUPPLY_MANAGER': False, 'WAREHOUSE_HEAD': False,
                'SITE_WAREHOUSE_MANAGER': False,
            },
            'profile': {
                'DIRECTOR': True, 'CHIEF_ENGINEER': True, 'PROJECT_MANAGER': True,
                'ENGINEER': True, 'SITE_MANAGER': True, 'FOREMAN': True,
                'MASTER': True, 'SUPERVISOR': True, 'CONTRACTOR': True,
                'OBSERVER': True, 'SUPPLY_MANAGER': True, 'WAREHOUSE_HEAD': True,
                'SITE_WAREHOUSE_MANAGER': True,
            },
            'settings': {
                'DIRECTOR': True, 'CHIEF_ENGINEER': True, 'PROJECT_MANAGER': True,
                'ENGINEER': True, 'SITE_MANAGER': True, 'FOREMAN': True,
                'MASTER': True, 'SUPERVISOR': True, 'CONTRACTOR': True,
                'OBSERVER': True, 'SUPPLY_MANAGER': True, 'WAREHOUSE_HEAD': True,
                'SITE_WAREHOUSE_MANAGER': True,
            },
        }

        created_count = 0
        updated_count = 0

        # Для каждой компании создаем матрицу доступа
        for company in companies:
            self.stdout.write(f'Обработка компании: {company.name}')

            for page, roles in default_matrix.items():
                for role, has_access in roles.items():
                    obj, created = PageAccess.objects.update_or_create(
                        company=company,
                        page=page,
                        role=role,
                        defaults={'has_access': has_access}
                    )

                    if created:
                        created_count += 1
                    else:
                        updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Матрица доступа заполнена успешно для {companies.count()} компаний! '
                f'Создано записей: {created_count}, обновлено: {updated_count}'
            )
        )
