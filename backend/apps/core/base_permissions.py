"""
Базовые permission классы для проверки доступа через ButtonAccess.

Эти классы заменяют хардкод ролей в permission классах на динамическую
проверку через глобальную матрицу доступа ButtonAccess.
"""
from rest_framework import permissions
from .access_helpers import has_button_access, has_page_access


class BaseButtonPermission(permissions.BasePermission):
    """
    Базовый permission класс для проверки доступа к кнопкам через ButtonAccess.

    Использование:
        class CanCreateProject(BaseButtonPermission):
            button_key = 'create'
            page = 'projects'
    """
    button_key = None  # Переопределить в подклассах
    page = None  # Опционально - страница на которой находится кнопка

    def has_permission(self, request, view):
        """Проверяет доступ пользователя к кнопке."""
        if not self.button_key:
            raise ValueError(
                f"{self.__class__.__name__}: button_key must be set. "
                f"Example: button_key = 'create'"
            )

        # Проверяем аутентификацию
        if not request.user or not request.user.is_authenticated:
            return False

        # Проверяем доступ через ButtonAccess
        return has_button_access(request.user, self.button_key, self.page)


class MultiButtonPermission(permissions.BasePermission):
    """
    Permission класс для проверки доступа к нескольким кнопкам.

    Пользователь должен иметь доступ хотя бы к одной из указанных кнопок.

    Использование:
        class CanEditOrDelete(MultiButtonPermission):
            button_keys = ['edit', 'delete']
            page = 'projects'
    """
    button_keys = []  # Переопределить в подклассах
    page = None  # Опционально

    def has_permission(self, request, view):
        """Проверяет доступ пользователя хотя бы к одной из кнопок."""
        if not self.button_keys:
            raise ValueError(
                f"{self.__class__.__name__}: button_keys must be set. "
                f"Example: button_keys = ['create', 'edit']"
            )

        # Проверяем аутентификацию
        if not request.user or not request.user.is_authenticated:
            return False

        # Проверяем доступ хотя бы к одной кнопке
        return any(
            has_button_access(request.user, button_key, self.page)
            for button_key in self.button_keys
        )


class AllButtonsPermission(permissions.BasePermission):
    """
    Permission класс для проверки доступа ко всем указанным кнопкам.

    Пользователь должен иметь доступ ко всем указанным кнопкам.

    Использование:
        class CanCreateAndEdit(AllButtonsPermission):
            button_keys = ['create', 'edit']
            page = 'projects'
    """
    button_keys = []  # Переопределить в подклассах
    page = None  # Опционально

    def has_permission(self, request, view):
        """Проверяет доступ пользователя ко всем указанным кнопкам."""
        if not self.button_keys:
            raise ValueError(
                f"{self.__class__.__name__}: button_keys must be set. "
                f"Example: button_keys = ['create', 'edit']"
            )

        # Проверяем аутентификацию
        if not request.user or not request.user.is_authenticated:
            return False

        # Проверяем доступ ко всем кнопкам
        return all(
            has_button_access(request.user, button_key, self.page)
            for button_key in self.button_keys
        )


class DynamicButtonPermission(permissions.BasePermission):
    """
    Динамический permission класс - кнопка определяется в runtime.

    Использование в ViewSet:
        @action(detail=True, methods=['post'])
        def custom_action(self, request, pk=None):
            self.button_key = 'custom_button'
            self.check_permissions(request)
            ...
    """

    def has_permission(self, request, view):
        """Проверяет доступ к кнопке определённой динамически."""
        button_key = getattr(view, 'button_key', None)
        page = getattr(view, 'page', None)

        if not button_key:
            # Если button_key не установлен - разрешаем доступ (backward compatibility)
            return True

        # Проверяем аутентификацию
        if not request.user or not request.user.is_authenticated:
            return False

        # Проверяем доступ через ButtonAccess
        return has_button_access(request.user, button_key, page)


class PageAccessPermission(permissions.BasePermission):
    """
    Permission класс для проверки доступа к странице через ButtonAccess.

    Использование в ViewSet:
        class ProjectViewSet(viewsets.ModelViewSet):
            permission_classes = [PageAccessPermission]
            page_name = 'projects'
    """

    def has_permission(self, request, view):
        """Проверяет доступ пользователя к странице."""
        page_name = getattr(view, 'page_name', None)

        if not page_name:
            # Если page_name не установлен - разрешаем доступ (backward compatibility)
            return True

        # Проверяем аутентификацию
        if not request.user or not request.user.is_authenticated:
            return False

        # Проверяем доступ через ButtonAccess
        return has_page_access(request.user, page_name)


# ========== Готовые permission классы для частых случаев ==========

class CanCreate(BaseButtonPermission):
    """Доступ к кнопке 'Создать'."""
    button_key = 'create'


class CanEdit(BaseButtonPermission):
    """Доступ к кнопке 'Редактировать'."""
    button_key = 'edit'


class CanDelete(BaseButtonPermission):
    """Доступ к кнопке 'Удалить'."""
    button_key = 'delete'


class CanExport(BaseButtonPermission):
    """Доступ к кнопке 'Экспорт'."""
    button_key = 'export'


class CanImport(BaseButtonPermission):
    """Доступ к кнопке 'Импорт'."""
    button_key = 'import'


class CanApprove(BaseButtonPermission):
    """Доступ к кнопке 'Утвердить'."""
    button_key = 'approve'


class CanReject(BaseButtonPermission):
    """Доступ к кнопке 'Отклонить'."""
    button_key = 'reject'


class CanViewDetails(BaseButtonPermission):
    """Доступ к кнопке 'Просмотр деталей'."""
    button_key = 'view_details'
