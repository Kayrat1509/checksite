from rest_framework import permissions


class IsManagementOrSuperAdmin(permissions.BasePermission):
    """
    Permission to only allow management or superadmin users.
    """

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            (request.user.is_superuser or request.user.is_management)
        )


class CanAccessSettings(permissions.BasePermission):
    """
    Permission для доступа к настройкам системы и матрице доступа.

    Проверяет доступ через ButtonAccess (кнопка 'edit' на странице 'settings').
    """

    def has_permission(self, request, view):
        from apps.core.access_helpers import has_button_access

        if not request.user or not request.user.is_authenticated:
            return False

        return has_button_access(request.user, 'edit', 'settings')


class CanManageProjects(permissions.BasePermission):
    """
    Permission to check if user can manage projects.

    Проверяет доступ через ButtonAccess (кнопка 'create' на странице 'projects').
    """

    def has_permission(self, request, view):
        from apps.core.access_helpers import has_button_access

        if not request.user or not request.user.is_authenticated:
            return False

        # Проверяем доступ хотя бы к одной из кнопок: create, edit, delete
        return (
            has_button_access(request.user, 'create', 'projects') or
            has_button_access(request.user, 'edit', 'projects') or
            has_button_access(request.user, 'delete', 'projects')
        )


class CanManageProjectsAndDrawings(permissions.BasePermission):
    """
    Permission для управления объектами и чертежами.

    Проверяет доступ через ButtonAccess (кнопки на странице 'projects').
    """

    def has_permission(self, request, view):
        from apps.core.access_helpers import has_button_access

        if not request.user or not request.user.is_authenticated:
            return False

        # Проверяем доступ хотя бы к одной из кнопок управления проектами
        return (
            has_button_access(request.user, 'create', 'projects') or
            has_button_access(request.user, 'edit', 'projects')
        )


class CanManageUsers(permissions.BasePermission):
    """
    Permission для управления пользователями.

    Проверяет доступ через ButtonAccess (кнопки на странице 'users').
    """

    def has_permission(self, request, view):
        from apps.core.access_helpers import has_button_access

        if not request.user or not request.user.is_authenticated:
            return False

        # Проверяем доступ хотя бы к одной из кнопок управления пользователями
        return (
            has_button_access(request.user, 'create', 'users') or
            has_button_access(request.user, 'edit', 'users')
        )


class IsITROrSupervisor(permissions.BasePermission):
    """
    Permission to only allow ITR or supervisor users.
    """

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            (request.user.is_itr or request.user.is_supervisor or request.user.is_superuser)
        )


class CanCreateIssues(permissions.BasePermission):
    """
    Permission to check if user can create issues.
    """

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.can_create_issues
        )


class CanVerifyIssues(permissions.BasePermission):
    """
    Permission to check if user can verify issues.
    """

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.can_verify_issues
        )


class HasPageAccess(permissions.BasePermission):
    """
    Динамическая проверка доступа к странице на основе глобальной матрицы доступа в БД.
    Проверяет, есть ли у пользователя доступ к конкретной странице (единая настройка для всех компаний).

    Использование:
        permission_classes = [HasPageAccess]
        page_name = 'projects'  # указать в ViewSet
    """

    def has_permission(self, request, view):
        user = request.user

        # Проверяем аутентификацию
        if not user or not user.is_authenticated:
            return False

        # SUPERADMIN имеет доступ ко всему
        if user.is_superuser or (hasattr(user, 'role') and user.role == 'SUPERADMIN'):
            return True

        # Получаем название страницы из ViewSet
        page_name = getattr(view, 'page_name', None)
        if not page_name:
            # Если page_name не указан, разрешаем доступ (backward compatibility)
            return True

        # Проверяем доступ в глобальной матрице ButtonAccess
        from apps.core.models import ButtonAccess
        try:
            page_access = ButtonAccess.objects.get(
                access_type='page',
                page=page_name,
                company__isnull=True  # Глобальная настройка для всех компаний
            )
            # Проверяем, есть ли доступ для роли пользователя
            return page_access.has_access(user.role)
        except ButtonAccess.DoesNotExist:
            # Если настройка не найдена, запрещаем доступ
            return False


class IsSameCompany(permissions.BasePermission):
    """
    Проверка, что объект принадлежит той же компании, что и пользователь.
    Используется для изоляции данных между компаниями.
    """

    def has_object_permission(self, request, view, obj):
        # Superadmin имеет доступ ко всем объектам
        if request.user.is_superuser:
            return True

        # Пользователь без компании не имеет доступа
        if not request.user.company:
            return False

        # Проверяем, что объект принадлежит той же компании
        # Для Project
        if hasattr(obj, 'company'):
            return obj.company == request.user.company

        # Для Site, Issue (через project)
        if hasattr(obj, 'project') and hasattr(obj.project, 'company'):
            return obj.project.company == request.user.company

        # По умолчанию запрещаем доступ
        return False


class CanManagePersonnelExcel(permissions.BasePermission):
    """
    Permission для управления импортом/экспортом персонала через Excel.

    Проверяет доступ через ButtonAccess + дополнительная проверка approved_by_director.
    """

    def has_permission(self, request, view):
        from apps.core.access_helpers import has_button_access

        user = request.user

        # Проверяем аутентификацию
        if not user or not user.is_authenticated:
            return False

        # ✅ КОНТРОЛЬ ДОСТУПА: Проверяем базовый доступ к импорту персонала через ButtonAccess
        has_import_access = has_button_access(user, 'import', 'users')

        if not has_import_access:
            return False

        # ✅ БИЗНЕС-ЛОГИКА: Дополнительная проверка - для среднего менеджмента требуется одобрение директора
        # Это не контроль доступа к функционалу, а дополнительное бизнес-правило
        from apps.users.models import User
        if user.role in [User.Role.SITE_MANAGER, User.Role.FOREMAN]:
            return user.approved_by_director

        return True


class CanManageContractorsExcel(permissions.BasePermission):
    """
    Permission для управления импортом/экспортом подрядчиков через Excel.

    Проверяет доступ через ButtonAccess + дополнительные проверки (company, approved).
    """

    def has_permission(self, request, view):
        from apps.core.access_helpers import has_button_access

        user = request.user

        # Проверяем аутентификацию
        if not user or not user.is_authenticated:
            return False

        # Проверяем наличие компании
        if not user.company:
            return False

        # Проверяем базовый доступ к импорту подрядчиков через ButtonAccess
        has_import_access = has_button_access(user, 'import', 'contractors')

        if not has_import_access:
            return False

        # Дополнительная проверка: пользователь должен быть одобрен
        return user.approved


class CanManageSupervisionExcel(permissions.BasePermission):
    """
    Permission для управления импортом/экспортом надзоров (Технадзор и Авторский надзор) через Excel.

    Проверяет доступ через ButtonAccess + дополнительные проверки (company, approved).
    """

    def has_permission(self, request, view):
        from apps.core.access_helpers import has_button_access

        user = request.user

        # Проверяем аутентификацию
        if not user or not user.is_authenticated:
            return False

        # Проверяем наличие компании
        if not user.company:
            return False

        # Проверяем базовый доступ к импорту надзоров через ButtonAccess
        has_import_access = has_button_access(user, 'import', 'supervisions')

        if not has_import_access:
            return False

        # Дополнительная проверка: пользователь должен быть одобрен
        return user.approved
