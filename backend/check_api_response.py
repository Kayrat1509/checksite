#!/usr/bin/env python
"""
Скрипт для проверки API ответа для замечаний
"""
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.issues.models import Issue
from apps.issues.serializers import IssueSerializer
from django.contrib.auth import get_user_model
from rest_framework.request import Request
from django.test import RequestFactory

User = get_user_model()

# Создаем фейковый request для контекста сериализатора
factory = RequestFactory()
fake_request = factory.get('/api/issues/')
fake_request.META['HTTP_HOST'] = 'backend:8000'

# Получаем первые 5 замечаний с фотографиями
issues = Issue.objects.prefetch_related('photos').filter(
    photos__isnull=False
).distinct()[:5]

print(f'=== Проверка API ответа для {issues.count()} замечаний ===\n')

for issue in issues:
    # Сериализуем замечание
    serializer = IssueSerializer(
        issue,
        context={'request': fake_request}
    )
    data = serializer.data

    print(f'\n--- Issue ID: {issue.id} ({issue.title}) ---')
    print(f'Photos count in DB: {issue.photos.count()}')

    if 'photos' in data:
        print(f'Photos in API response: {len(data["photos"])}')

        for idx, photo_data in enumerate(data['photos'][:3], 1):
            print(f'\n  Photo {idx}:')
            print(f'    ID: {photo_data.get("id")}')
            print(f'    photo: {photo_data.get("photo")}')
            print(f'    photo_url: {photo_data.get("photo_url")}')

            # Проверяем существование файла
            photo_obj = issue.photos.filter(id=photo_data.get("id")).first()
            if photo_obj and photo_obj.photo:
                exists = photo_obj.photo.storage.exists(photo_obj.photo.name)
                print(f'    Exists on disk: {exists}')
                if not exists:
                    print(f'    ❌ ФАЙЛ НЕ СУЩЕСТВУЕТ!')

# Ищем конкретно замечания с путем содержащим "10/26"
print(f'\n\n=== Поиск замечаний с фото из директории 10/26 ===')
from apps.issues.models import IssuePhoto

photos_oct26 = IssuePhoto.objects.filter(photo__icontains='2025/10/26')
print(f'Найдено фото: {photos_oct26.count()}')

for photo in photos_oct26:
    print(f'\n--- Photo ID: {photo.id} ---')
    print(f'  Issue ID: {photo.issue_id}')
    print(f'  Photo path: {photo.photo}')
    print(f'  Photo URL: {photo.photo.url}')

    exists = photo.photo.storage.exists(photo.photo.name)
    print(f'  Exists: {exists}')

    if not exists:
        print(f'  ❌ ФАЙЛ НЕ СУЩЕСТВУЕТ НА ДИСКЕ!')
