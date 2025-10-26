#!/usr/bin/env python
"""
Скрипт для проверки расширений файлов фотографий в БД
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.issues.models import IssuePhoto

# Проверяем все фото в БД
all_photos = IssuePhoto.objects.all()
print(f'Всего фото в БД: {all_photos.count()}')

# Проверяем расширения
extensions = {}
non_webp = []
missing_files = []

for photo in all_photos:
    if photo.photo:
        ext = os.path.splitext(photo.photo.name)[1]
        extensions[ext] = extensions.get(ext, 0) + 1

        # Проверяем существование файла
        exists = photo.photo.storage.exists(photo.photo.name)

        if ext != '.webp':
            non_webp.append(f'ID {photo.id}: {photo.photo} (exists: {exists})')

        if not exists:
            missing_files.append(f'ID {photo.id}: {photo.photo}')

print('\n=== Расширения файлов ===')
for ext, count in sorted(extensions.items()):
    print(f'  {ext}: {count} файлов')

if non_webp:
    print(f'\n=== Файлы НЕ в формате WebP ({len(non_webp)}) ===')
    for p in non_webp[:20]:
        print(f'  {p}')

if missing_files:
    print(f'\n=== Файлы НЕ СУЩЕСТВУЮЩИЕ на диске ({len(missing_files)}) ===')
    for p in missing_files[:20]:
        print(f'  {p}')
