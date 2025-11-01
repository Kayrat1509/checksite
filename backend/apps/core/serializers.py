"""
Сериализаторы для работы с корзиной (Recycle Bin).
"""

from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType


class RecycleBinItemSerializer(serializers.Serializer):
    """
    Сериализатор для элемента корзины.

    Отображает удаленные записи из разных моделей в едином формате.
    """

    id = serializers.IntegerField(read_only=True)
    model_name = serializers.CharField(read_only=True)  # 'Project', 'User', 'MaterialRequest', 'Tender'
    model_verbose_name = serializers.CharField(read_only=True)  # 'Проект', 'Пользователь', и т.д.
    title = serializers.CharField(read_only=True)  # Название записи
    deleted_at = serializers.DateTimeField(read_only=True)
    deleted_by = serializers.CharField(source='deleted_by.get_full_name', read_only=True)
    deleted_by_id = serializers.IntegerField(source='deleted_by.id', read_only=True)
    days_left = serializers.IntegerField(read_only=True)  # Сколько дней осталось до автоудаления
    expires_soon = serializers.BooleanField(read_only=True)  # True если осталось < 7 дней
    can_restore = serializers.BooleanField(read_only=True)  # Может ли текущий пользователь восстановить
    can_delete = serializers.BooleanField(read_only=True)  # Может ли текущий пользователь окончательно удалить


class RecycleBinStatsSerializer(serializers.Serializer):
    """
    Сериализатор для статистики корзины.
    """

    total_items = serializers.IntegerField(read_only=True)
    projects_count = serializers.IntegerField(read_only=True)
    users_count = serializers.IntegerField(read_only=True)
    material_requests_count = serializers.IntegerField(read_only=True)
    tenders_count = serializers.IntegerField(read_only=True)
    expires_soon_count = serializers.IntegerField(read_only=True)  # Записей с days_left < 7
