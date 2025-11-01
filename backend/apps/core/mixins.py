"""
Миксины для моделей Django.

Содержит:
- SoftDeleteMixin: миксин для мягкого удаления (soft delete)
- SoftDeleteManager: manager для автоматической фильтрации удаленных записей
"""

from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class SoftDeleteMixin(models.Model):
    """
    Миксин для мягкого удаления (soft delete).

    Добавляет поля:
    - is_deleted: флаг удаления
    - deleted_at: дата и время удаления
    - deleted_by: пользователь, удаливший запись

    Срок хранения в корзине: 31 день
    После 31 дня записи автоматически удаляются навсегда.

    Использование:
        class MyModel(SoftDeleteMixin, models.Model):
            # ... ваши поля ...

            objects = SoftDeleteManager()
            all_objects = models.Manager()
    """

    is_deleted = models.BooleanField(
        _('Удалено'),
        default=False,
        db_index=True,
        help_text=_('Запись помечена как удаленная (soft delete)')
    )

    deleted_at = models.DateTimeField(
        _('Дата удаления'),
        null=True,
        blank=True,
        db_index=True,
        help_text=_('Дата и время когда запись была удалена')
    )

    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deleted_%(app_label)s_%(class)s',
        verbose_name=_('Удалил'),
        help_text=_('Пользователь, удаливший запись')
    )

    class Meta:
        abstract = True


class SoftDeleteManager(models.Manager):
    """
    Manager для автоматической фильтрации удаленных записей.

    По умолчанию возвращает только НЕ удаленные записи.

    Методы:
    - get_queryset(): возвращает только активные записи (is_deleted=False)
    - deleted(): возвращает только удаленные записи (is_deleted=True)
    - all_with_deleted(): возвращает ВСЕ записи (включая удаленные)

    Использование:
        # Получить только активные записи
        MyModel.objects.all()

        # Получить только удаленные записи
        MyModel.objects.deleted()

        # Получить все записи (включая удаленные)
        MyModel.all_objects.all()
    """

    def get_queryset(self):
        """Возвращает только НЕ удаленные записи."""
        return super().get_queryset().filter(is_deleted=False)

    def deleted(self):
        """Возвращает только удаленные записи."""
        return super().get_queryset().filter(is_deleted=True)

    def all_with_deleted(self):
        """Возвращает ВСЕ записи (включая удаленные)."""
        return super().get_queryset()
