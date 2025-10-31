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


class HasPageAccess(permissions.BasePermission):
    """
    Динамическая проверка доступа к странице на основе матрицы доступа в БД.
    Проверяет, есть ли у пользователя доступ к конкретной странице в его компании.

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

        # Проверяем наличие компании
        if not user.company:
            return False

        # Проверяем доступ в БД
        from apps.settings.models import PageAccess
        has_access = PageAccess.objects.filter(
            company=user.company,
            page=page_name,
            role=user.role,
            has_access=True
        ).exists()

        return has_access


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

    Разрешено:
    - SUPERADMIN — всегда
    - Категория MANAGEMENT:
        - DIRECTOR — всегда
        - CHIEF_ENGINEER — всегда
        - PROJECT_MANAGER — всегда
        - SITE_MANAGER — только если approved_by_director=True
        - FOREMAN — только если approved_by_director=True
    - Остальные — запрещено

    Логика проверки:
    1. Если суперадмин — разрешить
    2. Если категория MANAGEMENT:
       a. Для высшего руководства (DIRECTOR, CHIEF_ENGINEER, PROJECT_MANAGER) — разрешить
       b. Для среднего менеджмента (SITE_MANAGER, FOREMAN) — проверить одобрение директора
    3. Для всех остальных — запретить
    """

    def has_permission(self, request, view):
        from apps.users.models import User

        user = request.user

        # Проверяем аутентификацию
        if not user or not user.is_authenticated:
            return False

        # 1. Суперадмин — всегда разрешено
        if user.is_superuser:
            return True

        # 2. Проверяем категорию MANAGEMENT
        if user.role_category == 'MANAGEMENT':
            # Высшее руководство — всегда разрешено
            if user.role in [
                User.Role.DIRECTOR,
                User.Role.CHIEF_ENGINEER,
                User.Role.PROJECT_MANAGER
            ]:
                return True

            # Средний менеджмент — требуется одобрение директора
            if user.role in [User.Role.SITE_MANAGER, User.Role.FOREMAN]:
                return user.approved_by_director

        # 3. Для всех остальных — запрещено
        return False


class CanManageContractorsExcel(permissions.BasePermission):
    """
    Permission для управления импортом/экспортом подрядчиков через Excel.

    Доступно для ролей от Прораба до Директора:
    - FOREMAN (Прораб)
    - SITE_MANAGER (Начальник участка)
    - ENGINEER (Инженер ПТО)
    - PROJECT_MANAGER (Руководитель проекта)
    - CHIEF_ENGINEER (Главный инженер)
    - DIRECTOR (Директор)
    - SUPERADMIN (всегда)

    Требования:
    - Пользователь должен быть аутентифицирован
    - Пользователь должен иметь привязку к компании
    - Пользователь должен быть одобрен (approved=True)
    - Роль пользователя должна быть из списка разрешенных
    """

    def has_permission(self, request, view):
        from apps.users.models import User

        user = request.user

        # Проверяем аутентификацию
        if not user or not user.is_authenticated:
            return False

        # Суперадмин — всегда разрешено
        if user.is_superuser:
            return True

        # Проверяем наличие компании
        if not user.company:
            return False

        # Роли с доступом к управлению подрядчиками
        allowed_roles = [
            User.Role.FOREMAN,           # Прораб
            User.Role.SITE_MANAGER,      # Начальник участка
            User.Role.ENGINEER,          # Инженер ПТО
            User.Role.PROJECT_MANAGER,   # Руководитель проекта
            User.Role.CHIEF_ENGINEER,    # Главный инженер
            User.Role.DIRECTOR           # Директор
        ]

        # Проверяем роль и статус одобрения
        return user.role in allowed_roles and user.approved
