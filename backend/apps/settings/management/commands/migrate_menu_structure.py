"""
Management команда для миграции структуры меню.

Выполняет следующие действия:
1. Удаляет все записи PageAccess с page='technical-conditions'
2. Выводит статистику по компаниям
3. Показывает финальное состояние матрицы доступа

Использование:
    docker compose exec backend python manage.py migrate_menu_structure
"""

from django.core.management.base import BaseCommand
from apps.settings.models import PageAccess
from apps.users.models import Company


class Command(BaseCommand):
    help = 'Миграция структуры меню: удаление technical-conditions из матрицы доступа'

    def handle(self, *args, **options):
        """Основной метод выполнения команды."""

        self.stdout.write('=' * 70)
        self.stdout.write(self.style.SUCCESS('МИГРАЦИЯ СТРУКТУРЫ МЕНЮ'))
        self.stdout.write('=' * 70)
        self.stdout.write('')

        # ЭТАП 1: Подсчет записей перед удалением
        self.stdout.write(self.style.HTTP_INFO('ЭТАП 1: Анализ текущего состояния'))

        # Находим все записи с technical-conditions
        tc_records = PageAccess.objects.filter(page='technical-conditions')
        tc_count = tc_records.count()

        if tc_count == 0:
            self.stdout.write(
                self.style.WARNING(
                    '  ⚠ Записей с technical-conditions не найдено.'
                )
            )
            self.stdout.write(
                self.style.WARNING(
                    '  Возможно, миграция уже была выполнена ранее.'
                )
            )
            self.stdout.write('')
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'  ✓ Найдено записей PageAccess с technical-conditions: {tc_count}'
                )
            )

            # Показываем распределение по компаниям
            companies_with_tc = PageAccess.objects.filter(
                page='technical-conditions'
            ).values_list('company__name', flat=True).distinct()

            self.stdout.write(f'  Затронутых компаний: {len(companies_with_tc)}')
            for company_name in companies_with_tc:
                company_tc_count = PageAccess.objects.filter(
                    page='technical-conditions',
                    company__name=company_name
                ).count()
                self.stdout.write(f'    - {company_name}: {company_tc_count} записей')

            self.stdout.write('')

        # ЭТАП 2: Удаление записей
        self.stdout.write(self.style.HTTP_INFO('ЭТАП 2: Удаление записей technical-conditions'))

        if tc_count > 0:
            # Удаляем все записи с technical-conditions
            deleted_info = tc_records.delete()
            deleted_count = deleted_info[0]  # Количество удаленных записей

            self.stdout.write(
                self.style.SUCCESS(
                    f'  ✓ Удалено записей PageAccess: {deleted_count}'
                )
            )
            self.stdout.write('')
        else:
            self.stdout.write(
                self.style.WARNING(
                    '  → Нечего удалять, пропускаем этап'
                )
            )
            self.stdout.write('')

        # ЭТАП 3: Статистика по компаниям после миграции
        self.stdout.write(self.style.HTTP_INFO('ЭТАП 3: Финальная статистика'))

        companies = Company.objects.all()
        self.stdout.write(f'  Всего компаний в системе: {companies.count()}')
        self.stdout.write('')

        for company in companies:
            # Подсчитываем записи доступа для компании
            access_count = PageAccess.objects.filter(company=company).count()

            # Подсчитываем уникальные страницы
            unique_pages = PageAccess.objects.filter(
                company=company
            ).values_list('page', flat=True).distinct()

            self.stdout.write(f'  Компания: {company.name}')
            self.stdout.write(f'    Всего записей PageAccess: {access_count}')
            self.stdout.write(f'    Уникальных страниц: {len(unique_pages)}')

            # Показываем список страниц
            if unique_pages:
                pages_list = ', '.join(sorted(unique_pages))
                self.stdout.write(f'    Страницы: {pages_list}')

            self.stdout.write('')

        # ЭТАП 4: Проверка отсутствия technical-conditions
        self.stdout.write(self.style.HTTP_INFO('ЭТАП 4: Проверка результатов'))

        remaining_tc = PageAccess.objects.filter(page='technical-conditions').count()

        if remaining_tc == 0:
            self.stdout.write(
                self.style.SUCCESS(
                    '  ✓ Проверка пройдена: technical-conditions полностью удален из БД'
                )
            )
        else:
            self.stdout.write(
                self.style.ERROR(
                    f'  ✗ ОШИБКА: Осталось {remaining_tc} записей с technical-conditions!'
                )
            )

        self.stdout.write('')

        # Итоговая статистика
        self.stdout.write('=' * 70)
        self.stdout.write(self.style.SUCCESS('✓ МИГРАЦИЯ ЗАВЕРШЕНА'))
        self.stdout.write('=' * 70)
        self.stdout.write('')

        # Общая статистика системы
        total_access_records = PageAccess.objects.count()
        total_unique_pages = PageAccess.objects.values_list(
            'page', flat=True
        ).distinct().count()

        self.stdout.write(self.style.SUCCESS('ОБЩАЯ СТАТИСТИКА СИСТЕМЫ:'))
        self.stdout.write(f'  Всего записей PageAccess: {total_access_records}')
        self.stdout.write(f'  Уникальных страниц в системе: {total_unique_pages}')
        self.stdout.write(
            f'  Удалено записей за эту миграцию: {tc_count if tc_count > 0 else 0}'
        )
        self.stdout.write('')
