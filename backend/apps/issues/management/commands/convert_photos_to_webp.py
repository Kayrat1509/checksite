"""
Management команда для конвертации существующих фото в формат WebP.

Эта команда находит все фотографии в БД которые не в формате WebP,
конвертирует их и обновляет записи в БД.

Использование:
    python manage.py convert_photos_to_webp
    python manage.py convert_photos_to_webp --dry-run  # Только просмотр
"""
import os
from django.core.management.base import BaseCommand
from django.core.files.uploadedfile import InMemoryUploadedFile
from apps.issues.models import IssuePhoto
from apps.issues.utils import convert_image_to_webp


class Command(BaseCommand):
    help = 'Конвертирует все существующие фотографии в формат WebP'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Показать какие файлы будут конвертированы, но не конвертировать',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('РЕЖИМ ПРОСМОТРА: Файлы НЕ будут конвертированы'))
        else:
            self.stdout.write(self.style.WARNING('ВНИМАНИЕ: Файлы БУДУТ конвертированы!'))

        # Получаем все фото которые не в формате WebP
        all_photos = IssuePhoto.objects.all()
        non_webp_photos = []

        for photo in all_photos:
            if photo.photo:
                ext = os.path.splitext(photo.photo.name)[1].lower()
                if ext != '.webp':
                    non_webp_photos.append(photo)

        if not non_webp_photos:
            self.stdout.write(self.style.SUCCESS('✅ Все фото уже в формате WebP!'))
            return

        self.stdout.write(
            self.style.WARNING(f'\n📷 Найдено {len(non_webp_photos)} фото для конвертации:\n')
        )

        converted_count = 0
        error_count = 0
        total_saved_bytes = 0

        for idx, photo in enumerate(non_webp_photos, 1):
            old_path = photo.photo.name
            old_size = photo.photo.size if photo.photo else 0

            # Форматируем размер
            old_size_str = self._format_size(old_size)

            self.stdout.write(f'[{idx}/{len(non_webp_photos)}] {old_path} ({old_size_str})')

            if dry_run:
                self.stdout.write(self.style.WARNING('  → Будет конвертировано в WebP'))
                continue

            # Конвертируем фото
            try:
                # Открываем файл
                with photo.photo.open('rb') as f:
                    # Создаем InMemoryUploadedFile из существующего файла
                    from io import BytesIO
                    file_content = f.read()
                    file_buffer = BytesIO(file_content)

                    # Создаем uploaded file объект
                    uploaded_file = InMemoryUploadedFile(
                        file=file_buffer,
                        field_name='photo',
                        name=os.path.basename(photo.photo.name),
                        content_type='image/jpeg',  # Примерный тип
                        size=len(file_content),
                        charset=None
                    )

                    # Конвертируем в WebP
                    webp_file = convert_image_to_webp(
                        uploaded_file,
                        quality=85,
                        max_dimension=2560
                    )

                    # Сохраняем старый путь для удаления
                    old_file = photo.photo

                    # Заменяем файл
                    photo.photo = webp_file
                    photo.save()

                    # Удаляем старый файл
                    if old_file.storage.exists(old_file.name):
                        old_file.delete(save=False)

                    # Вычисляем сэкономленное место
                    new_size = photo.photo.size
                    saved_bytes = old_size - new_size
                    total_saved_bytes += saved_bytes

                    new_size_str = self._format_size(new_size)
                    saved_str = self._format_size(saved_bytes)
                    percent = (saved_bytes / old_size * 100) if old_size > 0 else 0

                    self.stdout.write(
                        self.style.SUCCESS(
                            f'  ✅ Конвертировано: {photo.photo.name} ({new_size_str}, '
                            f'сэкономлено {saved_str}, {percent:.1f}%)'
                        )
                    )
                    converted_count += 1

            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  ❌ Ошибка: {e}'))
                error_count += 1

        # Итоговая статистика
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'\n⚠️  Для конвертации запустите команду без --dry-run'
                )
            )
        else:
            total_saved_str = self._format_size(total_saved_bytes)
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n📊 Итого:'
                    f'\n  ✅ Конвертировано: {converted_count}'
                    f'\n  ❌ Ошибок: {error_count}'
                    f'\n  💾 Сэкономлено места: {total_saved_str}'
                )
            )

    def _format_size(self, size_bytes):
        """Форматирует размер файла в читабельный вид"""
        if size_bytes < 0:
            return '0 Б'
        for unit in ['Б', 'КБ', 'МБ', 'ГБ']:
            if size_bytes < 1024.0:
                return f'{size_bytes:.1f} {unit}'
            size_bytes /= 1024.0
        return f'{size_bytes:.1f} ТБ'
