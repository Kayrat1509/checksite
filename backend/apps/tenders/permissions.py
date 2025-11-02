from rest_framework import permissions
from apps.core.access_helpers import has_button_access


class CanManageTenders(permissions.BasePermission):
    """
    Право на управление тендерами.

    Проверяет доступ через ButtonAccess (кнопки на странице 'tenders').
    """

    def has_permission(self, request, view):
        # Проверяем аутентификацию
        if not request.user or not request.user.is_authenticated:
            return False

        # Проверяем базовый доступ к странице тендеров через ButtonAccess
        # Достаточно иметь доступ хотя бы к одной из кнопок: create, edit, delete
        return (
            has_button_access(request.user, 'create', 'tenders') or
            has_button_access(request.user, 'edit', 'tenders') or
            has_button_access(request.user, 'delete', 'tenders')
        )

    def has_object_permission(self, request, view, obj):
        # Суперадмин всегда имеет доступ
        if request.user and request.user.is_superuser:
            return True

        # Для просмотра - все, кто имеет общий доступ
        if request.method in permissions.SAFE_METHODS:
            return self.has_permission(request, view)

        # Для изменения/удаления - автор, ответственный или те у кого есть доступ к кнопке edit
        if request.user == obj.created_by or request.user == obj.responsible:
            return True

        # Проверяем доступ к редактированию через ButtonAccess
        if request.method in ['PUT', 'PATCH']:
            return has_button_access(request.user, 'edit', 'tenders')

        # Проверяем доступ к удалению через ButtonAccess
        if request.method == 'DELETE':
            return has_button_access(request.user, 'delete', 'tenders')

        return False
