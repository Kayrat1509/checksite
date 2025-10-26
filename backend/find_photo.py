#!/usr/bin/env python
"""
Скрипт для поиска информации о конкретном файле photo_2025-09-28_13.41.53
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.issues.models import Issue, IssuePhoto

# Ищем файл по имени
target_file = 'photo_2025-09-28_13.41.53'

print(f'=== Поиск файла: {target_file} ===\n')

# Поиск в IssuePhoto
photos = IssuePhoto.objects.filter(photo__icontains=target_file)
print(f'Найдено записей IssuePhoto: {photos.count()}')

for photo in photos:
    exists = photo.photo.storage.exists(photo.photo.name) if photo.photo else False
    url = photo.photo.url if photo.photo else None

    print(f'\n--- IssuePhoto ID: {photo.id} ---')
    print(f'  Issue ID: {photo.issue_id}')
    print(f'  Stage: {photo.stage}')
    print(f'  Photo path: {photo.photo}')
    print(f'  Photo URL: {url}')
    print(f'  File exists: {exists}')
    print(f'  Created at: {photo.created_at}')
    print(f'  Uploaded by: {photo.uploaded_by}')

# Ищем все замечания которые могут содержать этот файл
issues_with_photos = Issue.objects.prefetch_related('photos').filter(
    photos__photo__icontains=target_file
)

print(f'\n=== Замечания с этим фото: {issues_with_photos.count()} ===')
for issue in issues_with_photos:
    print(f'\n--- Issue ID: {issue.id} ---')
    print(f'  Title: {issue.title}')
    print(f'  Created: {issue.created_at}')
    print(f'  Photos count: {issue.photos.count()}')

    for idx, p in enumerate(issue.photos.all(), 1):
        print(f'    Photo {idx}: {p.photo} (ID: {p.id})')

# Проверяем файлы на диске
print(f'\n=== Файлы на диске ===')
import subprocess
result = subprocess.run(
    ['find', '/app/media', '-name', f'{target_file}*', '-type', 'f'],
    capture_output=True,
    text=True
)
if result.stdout:
    print('Найденные файлы:')
    for line in result.stdout.strip().split('\n'):
        print(f'  {line}')
else:
    print('Файлы не найдены на диске')
