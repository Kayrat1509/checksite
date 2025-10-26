"""
Management команда для очистки файлов-сирот (orphaned files).

Файлы-сироты - это файлы которые существуют на диске, но не имеют
соответствующих записей в базе данных.

Использование:
    python manage.py cleanup_orphaned_photos
    python manage.py cleanup_orphaned_photos --dry-run  # Только просмотр без удаления
"""
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.issues.models import IssuePhoto


class Command(BaseCommand):
    help = 'Удаляет файлы фотографий, которых нет в базе данных (orphaned files)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Показать файлы которые будут удалены, но не удалять их',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('РЕЖИМ ПРОСМОТРА: Файлы НЕ будут удалены'))
        else:
            self.stdout.write(self.style.WARNING('ВНИМАНИЕ: Файлы БУДУТ удалены!'))

        # Путь к директории с фото замечаний
        issues_media_root = os.path.join(settings.MEDIA_ROOT, 'issues')

        if not os.path.exists(issues_media_root):
            self.stdout.write(self.style.SUCCESS(f'Директория {issues_media_root} не существует'))
            return

        # Получаем все пути к файлам из БД
        db_files = set()
        for photo in IssuePhoto.objects.all():
            if photo.photo:
                # Получаем полный путь к файлу
                file_path = photo.photo.path
                db_files.add(file_path)

        self.stdout.write(f'Найдено {len(db_files)} файлов в базе данных')

        # Сканируем директорию и находим все файлы
        disk_files = []
        for root, dirs, files in os.walk(issues_media_root):
            for filename in files:
                file_path = os.path.join(root, filename)
                disk_files.append(file_path)

        self.stdout.write(f'Найдено {len(disk_files)} файлов на диске')

        # Находим файлы-сироты (есть на диске, но нет в БД)
        orphaned_files = [f for f in disk_files if f not in db_files]

        if not orphaned_files:
            self.stdout.write(self.style.SUCCESS('✅ Файлов-сирот не найдено!'))
            return

        self.stdout.write(
            self.style.WARNING(f'\n🗑️  Найдено {len(orphaned_files)} файлов-сирот:\n')
        )

        total_size = 0
        for file_path in orphaned_files:
            # Получаем размер файла
            file_size = os.path.getsize(file_path)
            total_size += file_size

            # Получаем относительный путь для красивого вывода
            rel_path = os.path.relpath(file_path, settings.MEDIA_ROOT)

            # Форматируем размер файла
            size_str = self._format_size(file_size)

            self.stdout.write(f'  • {rel_path} ({size_str})')

            # Удаляем файл если не dry-run
            if not dry_run:
                try:
                    os.remove(file_path)
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'    ❌ Ошибка удаления: {e}')
                    )

        # Выводим итоговую статистику
        total_size_str = self._format_size(total_size)

        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n📊 Всего будет освобождено: {total_size_str}'
                )
            )
            self.stdout.write(
                self.style.WARNING(
                    f'\n⚠️  Для удаления запустите команду без --dry-run'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n✅ Удалено {len(orphaned_files)} файлов ({total_size_str})'
                )
            )

        # Очищаем пустые директории
        if not dry_run:
            self._cleanup_empty_dirs(issues_media_root)

    def _format_size(self, size_bytes):
        """Форматирует размер файла в читабельный вид"""
        for unit in ['Б', 'КБ', 'МБ', 'ГБ']:
            if size_bytes < 1024.0:
                return f'{size_bytes:.1f} {unit}'
            size_bytes /= 1024.0
        return f'{size_bytes:.1f} ТБ'

    def _cleanup_empty_dirs(self, root_dir):
        """Удаляет пустые директории"""
        deleted_dirs = 0
        for dirpath, dirnames, filenames in os.walk(root_dir, topdown=False):
            # Пропускаем корневую директорию
            if dirpath == root_dir:
                continue

            # Если директория пустая, удаляем её
            if not os.listdir(dirpath):
                try:
                    os.rmdir(dirpath)
                    deleted_dirs += 1
                    rel_path = os.path.relpath(dirpath, root_dir)
                    self.stdout.write(f'  🗑️  Удалена пустая директория: {rel_path}')
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'    ❌ Ошибка удаления директории {dirpath}: {e}')
                    )

        if deleted_dirs > 0:
            self.stdout.write(
                self.style.SUCCESS(f'\n✅ Удалено {deleted_dirs} пустых директорий')
            )
