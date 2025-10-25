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
    Доступно только для: Суперадмин, Директор, Главный инженер, Руководитель проекта, Начальник участка.
    """

    def has_permission(self, request, view):
        from apps.users.models import User

        # Разрешенные роли для доступа к настройкам
        allowed_roles = [
            User.Role.SUPERADMIN,         # Суперадмин
            User.Role.DIRECTOR,           # Директор
            User.Role.CHIEF_ENGINEER,     # Главный инженер
            User.Role.PROJECT_MANAGER,    # Руководитель проекта
            User.Role.SITE_MANAGER,       # Начальник участка
        ]

        return (
            request.user and
            request.user.is_authenticated and
            (
                request.user.is_superuser or
                request.user.role in allowed_roles
            )
        )


class CanManageProjects(permissions.BasePermission):
    """
    Permission to check if user can manage projects.
    Project Managers and above can manage projects.
    """

    def has_permission(self, request, view):
        from apps.users.models import User
        return (
            request.user and
            request.user.is_authenticated and
            (
                request.user.is_superuser or
                request.user.is_management or
                request.user.role == User.Role.PROJECT_MANAGER
            )
        )


class CanManageProjectsAndDrawings(permissions.BasePermission):
    """
    Permission для управления объектами и чертежами.
    Доступно только для: Директор, Главный инженер, Руководитель проекта, Начальник участка, Инженер ПТО.
    """

    def has_permission(self, request, view):
        from apps.users.models import User

        # Разрешенные роли для создания/редактирования/удаления
        allowed_roles = [
            User.Role.DIRECTOR,           # Директор
            User.Role.CHIEF_ENGINEER,     # Главный инженер
            User.Role.PROJECT_MANAGER,    # Руководитель проекта
            User.Role.SITE_MANAGER,       # Начальник участка
            User.Role.ENGINEER,           # Инженер ПТО
        ]

        return (
            request.user and
            request.user.is_authenticated and
            (
                request.user.is_superuser or
                request.user.role in allowed_roles
            )
        )


class CanManageUsers(permissions.BasePermission):
    """
    Permission для управления пользователями.
    Доступно для: Директор, Главный инженер, Руководитель проекта, Начальник участка, Инженер ПТО.
    """

    def has_permission(self, request, view):
        from apps.users.models import User

        # Разрешенные роли для управления пользователями
        allowed_roles = [
            User.Role.DIRECTOR,           # Директор
            User.Role.CHIEF_ENGINEER,     # Главный инженер
            User.Role.PROJECT_MANAGER,    # Руководитель проекта
            User.Role.SITE_MANAGER,       # Начальник участка
            User.Role.ENGINEER,           # Инженер ПТО
        ]

        return (
            request.user and
            request.user.is_authenticated and
            (
                request.user.is_superuser or
                request.user.role in allowed_roles
            )
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
