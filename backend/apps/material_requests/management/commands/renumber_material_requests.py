"""
Management команда для перенумерации заявок на материалы по проектам.
Использование: python manage.py renumber_material_requests
"""

from django.core.management.base import BaseCommand
from django.db import connection
from apps.material_requests.models import MaterialRequest
from apps.projects.models import Project


class Command(BaseCommand):
    help = 'Перенумеровывает заявки на материалы, чтобы каждый проект имел независимую нумерацию'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Начинаю перенумерацию заявок...'))

        try:
            with connection.cursor() as cursor:
                # Этап 1: Временно удаляем unique constraint
                self.stdout.write('Шаг 1: Временно удаляю unique constraint...')
                cursor.execute("""
                    ALTER TABLE material_requests_materialrequest
                    DROP CONSTRAINT IF EXISTS material_requests_materialrequest_request_number_key
                """)

                # Этап 2: Устанавливаем временные уникальные номера
                self.stdout.write('Шаг 2: Устанавливаю временные номера...')
                cursor.execute("""
                    UPDATE material_requests_materialrequest
                    SET request_number = 'TEMP-' || id::text
                """)

                # Этап 3: Используем CTE для вычисления новых номеров с ID проекта
                self.stdout.write('Шаг 3: Вычисляю новые номера с учетом проектов (формат: З-{project_id}-{number}/{year})...')
                cursor.execute("""
                    WITH numbered_requests AS (
                        SELECT
                            id,
                            'З-' ||
                            project_id::text ||
                            '-' ||
                            LPAD(
                                ROW_NUMBER() OVER (
                                    PARTITION BY project_id, EXTRACT(YEAR FROM created_at)::int % 100
                                    ORDER BY created_at
                                )::text,
                                3,
                                '0'
                            ) ||
                            '/' ||
                            LPAD((EXTRACT(YEAR FROM created_at)::int % 100)::text, 2, '0') AS new_number
                        FROM material_requests_materialrequest
                    )
                    UPDATE material_requests_materialrequest mr
                    SET request_number = nr.new_number
                    FROM numbered_requests nr
                    WHERE mr.id = nr.id
                """)

                # Этап 4: Возвращаем unique constraint
                self.stdout.write('Шаг 4: Возвращаю unique constraint...')
                cursor.execute("""
                    ALTER TABLE material_requests_materialrequest
                    ADD CONSTRAINT material_requests_materialrequest_request_number_key
                    UNIQUE (request_number)
                """)

            self.stdout.write(self.style.SUCCESS('✓ Перенумерация завершена успешно!'))

            # Показываем статистику
            projects = Project.objects.all()
            self.stdout.write('\nСтатистика по проектам:')
            for project in projects:
                count = MaterialRequest.objects.filter(project=project).count()
                if count > 0:
                    self.stdout.write(f'  - {project.name}: {count} заявок')

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Ошибка при перенумерации: {str(e)}'))
            # Пытаемся вернуть constraint обратно в случае ошибки
            try:
                with connection.cursor() as cursor:
                    cursor.execute("""
                        ALTER TABLE material_requests_materialrequest
                        ADD CONSTRAINT material_requests_materialrequest_request_number_key
                        UNIQUE (request_number)
                    """)
            except:
                pass
            raise
