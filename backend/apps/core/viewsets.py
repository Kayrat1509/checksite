"""
ViewSet миксины для работы с корзиной (soft delete).
"""

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone


class SoftDeleteViewSetMixin:
    """
    Миксин для ViewSet, добавляющий поддержку мягкого удаления (soft delete).

    Функционал:
    - Переопределяет destroy() для мягкого удаления (is_deleted=True)
    - Добавляет action restore() для восстановления из корзины
    - Добавляет action permanent_delete() для окончательного удаления
    """

    def destroy(self, request, *args, **kwargs):
        """
        Мягкое удаление: помечает объект как удаленный вместо физического удаления.
        Устанавливает: is_deleted=True, deleted_at=now(), deleted_by=current_user.
        """
        instance = self.get_object()

        # Помечаем как удаленный
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.deleted_by = request.user
        instance.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])

        # Возвращаем 200 с сообщением вместо 204, так как возвращаем тело ответа
        return Response(
            {'detail': 'Объект перемещен в корзину. Срок хранения: 31 день.'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        """
        Восстанавливает удаленный объект из корзины.
        Сбрасывает: is_deleted=False, deleted_at=None, deleted_by=None.
        """
        # Получаем объект включая удаленные
        # Используем all_objects manager для доступа к удаленным записям
        model_class = self.get_queryset().model
        try:
            instance = model_class.all_objects.get(pk=pk)
        except model_class.DoesNotExist:
            return Response(
                {'detail': 'Объект не найден.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверяем, что объект действительно удален
        if not instance.is_deleted:
            return Response(
                {'detail': 'Объект не находится в корзине.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Восстанавливаем
        instance.is_deleted = False
        instance.deleted_at = None
        instance.deleted_by = None
        instance.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])

        return Response(
            {'detail': 'Объект успешно восстановлен из корзины.'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['delete'], url_path='permanent-delete')
    def permanent_delete(self, request, pk=None):
        """
        Окончательно удаляет объект из базы данных (физическое удаление).
        Это действие необратимо.
        """
        # Получаем объект включая удаленные
        model_class = self.get_queryset().model
        try:
            instance = model_class.all_objects.get(pk=pk)
        except model_class.DoesNotExist:
            return Response(
                {'detail': 'Объект не найден.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверяем, что объект находится в корзине
        if not instance.is_deleted:
            return Response(
                {'detail': 'Можно удалять только объекты из корзины.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Физически удаляем из БД
        instance.delete()

        return Response(
            {'detail': 'Объект окончательно удален.'},
            status=status.HTTP_204_NO_CONTENT
        )
