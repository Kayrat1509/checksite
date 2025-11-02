"""
Permissions для работы с корзиной (Recycle Bin).

Переписано на использование ButtonAccess вместо хардкода ролей.
"""

from rest_framework import permissions
from apps.core.access_helpers import has_button_access


class CanAccessRecycleBin(permissions.BasePermission):
    """
    Право доступа к корзине.

    Проверяет доступ через ButtonAccess (кнопка 'recycle_bin_access').
    """

    def has_permission(self, request, view):
        """Проверка прав доступа к корзине через ButtonAccess."""
        if not request.user or not request.user.is_authenticated:
            return False

        return has_button_access(request.user, 'recycle_bin_access', 'dashboard')


class CanRestoreFromRecycleBin(permissions.BasePermission):
    """
    Право на восстановление из корзины.

    Проверяет доступ через ButtonAccess (кнопка 'recycle_bin_restore').
    """

    def has_permission(self, request, view):
        """Проверка прав на восстановление через ButtonAccess."""
        if not request.user or not request.user.is_authenticated:
            return False

        return has_button_access(request.user, 'recycle_bin_restore', 'dashboard')


class CanPermanentlyDelete(permissions.BasePermission):
    """
    Право на окончательное удаление из БД.

    Проверяет доступ через ButtonAccess (кнопка 'recycle_bin_delete').
    """

    def has_permission(self, request, view):
        """Проверка прав на окончательное удаление через ButtonAccess."""
        if not request.user or not request.user.is_authenticated:
            return False

        return has_button_access(request.user, 'recycle_bin_delete', 'dashboard')
