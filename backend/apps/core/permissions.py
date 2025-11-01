"""
Permissions для работы с корзиной (Recycle Bin).
"""

from rest_framework import permissions


class CanAccessRecycleBin(permissions.BasePermission):
    """
    Право доступа к корзине.

    Доступно для ролей:
    - SUPERADMIN
    - DIRECTOR
    - CHIEF_ENGINEER
    - PROJECT_MANAGER
    - SITE_MANAGER
    """

    def has_permission(self, request, view):
        """Проверка прав доступа к корзине."""
        if not request.user or not request.user.is_authenticated:
            return False

        # Суперадмин имеет полный доступ
        if request.user.is_superuser:
            return True

        # Роли с доступом к корзине
        allowed_roles = [
            'SUPERADMIN',
            'DIRECTOR',
            'CHIEF_ENGINEER',
            'PROJECT_MANAGER',
            'SITE_MANAGER',
        ]

        return request.user.role in allowed_roles


class CanRestoreFromRecycleBin(permissions.BasePermission):
    """
    Право на восстановление из корзины.

    Доступно для ролей:
    - SUPERADMIN
    - DIRECTOR
    - CHIEF_ENGINEER
    - PROJECT_MANAGER
    - SITE_MANAGER
    """

    def has_permission(self, request, view):
        """Проверка прав на восстановление."""
        if not request.user or not request.user.is_authenticated:
            return False

        # Суперадмин имеет полный доступ
        if request.user.is_superuser:
            return True

        # Роли с правом восстановления
        allowed_roles = [
            'SUPERADMIN',
            'DIRECTOR',
            'CHIEF_ENGINEER',
            'PROJECT_MANAGER',
            'SITE_MANAGER',
        ]

        return request.user.role in allowed_roles


class CanPermanentlyDelete(permissions.BasePermission):
    """
    Право на окончательное удаление из БД.

    Доступно ТОЛЬКО для:
    - SUPERADMIN
    - DIRECTOR
    """

    def has_permission(self, request, view):
        """Проверка прав на окончательное удаление."""
        if not request.user or not request.user.is_authenticated:
            return False

        # Только суперадмин и директор
        if request.user.is_superuser:
            return True

        return request.user.role in ['SUPERADMIN', 'DIRECTOR']
