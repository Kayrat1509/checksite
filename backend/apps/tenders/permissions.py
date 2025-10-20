from rest_framework import permissions


class CanManageTenders(permissions.BasePermission):
    """
    Право на управление тендерами.
    Доступно: ИТР (ENGINEER, SITE_MANAGER, FOREMAN, MASTER) и Руководство (PROJECT_MANAGER, CHIEF_ENGINEER, DIRECTOR)
    """

    def has_permission(self, request, view):
        # Суперадмин всегда имеет доступ
        if request.user and request.user.is_superuser:
            return True

        # Проверяем аутентификацию
        if not request.user or not request.user.is_authenticated:
            return False

        # Разрешенные роли
        allowed_roles = [
            # ИТР
            'ENGINEER',           # Инженер ПТО
            'SITE_MANAGER',       # Начальник участка
            'FOREMAN',            # Прораб
            'MASTER',             # Мастер
            # Руководство
            'PROJECT_MANAGER',    # Руководитель проекта
            'CHIEF_ENGINEER',     # Главный инженер
            'DIRECTOR'            # Директор
        ]

        return request.user.role in allowed_roles

    def has_object_permission(self, request, view, obj):
        # Суперадмин всегда имеет доступ
        if request.user and request.user.is_superuser:
            return True

        # Для просмотра - все, кто имеет общий доступ
        if request.method in permissions.SAFE_METHODS:
            return self.has_permission(request, view)

        # Для изменения/удаления - автор, ответственный или руководство
        if request.user == obj.created_by or request.user == obj.responsible:
            return True

        # Руководство всегда может редактировать
        management_roles = ['PROJECT_MANAGER', 'CHIEF_ENGINEER', 'DIRECTOR']
        return request.user.role in management_roles
