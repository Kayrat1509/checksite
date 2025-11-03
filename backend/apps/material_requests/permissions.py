from rest_framework import permissions


class MaterialRequestPermission(permissions.BasePermission):
    """
    Права доступа для заявок на материалы.

    ✅ НОВАЯ ЛОГИКА: Доступ проверяется через ButtonAccess.
    Проверка через кнопки на странице material-requests:
    - view: право просматривать список заявок
    - view_details: право просматривать детали заявки
    - create: право создавать заявки
    - edit: право редактировать заявки
    - delete: право удалять заявки
    - approve: право согласовывать заявки
    - reject: право отклонять заявки
    """

    def has_permission(self, request, view):
        """Проверка прав на уровне списка заявок."""
        from apps.core.access_helpers import has_button_access, has_page_access
        import logging
        logger = logging.getLogger(__name__)

        # Пользователь должен быть аутентифицирован
        if not request.user or not request.user.is_authenticated:
            logger.warning('[MaterialRequestPermission] User not authenticated')
            return False

        user = request.user
        logger.info(f'[MaterialRequestPermission] User: {user.email}, Role: {user.role}, Method: {request.method}')

        # Суперадмин имеет полный доступ
        if user.is_superuser:
            logger.info('[MaterialRequestPermission] User is superuser - access granted')
            return True

        # Проверяем доступ к странице
        page_access = has_page_access(user, 'material-requests')
        logger.info(f'[MaterialRequestPermission] Page access: {page_access}')
        if not page_access:
            logger.warning(f'[MaterialRequestPermission] Page access denied for {user.role}')
            return False

        # Для просмотра (GET) - доступа к странице достаточно
        if request.method in permissions.SAFE_METHODS:
            logger.info('[MaterialRequestPermission] GET request - page access is sufficient')
            return True

        # Для создания - проверяем кнопку create
        if request.method == 'POST':
            button_access = has_button_access(user, 'create', 'material-requests')
            logger.info(f'[MaterialRequestPermission] Button access (create): {button_access}')
            return button_access

        return True

    def has_object_permission(self, request, view, obj):
        """Проверка прав на уровне конкретной заявки."""
        from apps.core.access_helpers import has_button_access

        user = request.user

        # Суперадмин имеет полный доступ
        if user.is_superuser:
            return True

        # Для просмотра - проверяем кнопку view_details
        if request.method in permissions.SAFE_METHODS:
            # Автор заявки всегда видит свою заявку
            if obj.author == user:
                return True
            # Ответственный видит заявку
            if obj.responsible == user:
                return True
            # ✅ БИЗНЕС-ЛОГИКА: Проверяем доступ к проекту заявки (это фильтрация данных, не контроль доступа)
            if hasattr(user, 'projects') and obj.project in user.projects.all():
                return True
            # Проверяем кнопку view_details
            return has_button_access(user, 'view_details', 'material-requests')

        # Для редактирования - проверяем кнопку edit
        if request.method in ['PUT', 'PATCH']:
            # ✅ БИЗНЕС-ЛОГИКА: Автор может редактировать свою заявку в определенных статусах
            has_returned_items = obj.items.filter(item_status='RETURNED_FOR_REVISION').exists()
            if obj.author == user and (obj.status == 'DRAFT' or has_returned_items):
                return True
            # Проверяем кнопку edit
            return has_button_access(user, 'edit', 'material-requests')

        # Для удаления - проверяем кнопку delete
        if request.method == 'DELETE':
            # ✅ БИЗНЕС-ЛОГИКА: Автор может удалять свою заявку в статусе DRAFT
            if obj.author == user and obj.status == 'DRAFT':
                return True
            # Проверяем кнопку delete
            return has_button_access(user, 'delete', 'material-requests')

        return False


class MaterialRequestStatusChangePermission(permissions.BasePermission):
    """
    Права на изменение статуса заявки.

    ✅ КОМБИНИРОВАННАЯ ЛОГИКА:
    1. Контроль доступа через ButtonAccess (кнопка 'edit' на странице material-requests)
    2. Бизнес-логика workflow через STATUS_ROLE_MAP (какая роль может устанавливать какой статус)

    STATUS_ROLE_MAP - это БИЗНЕС-ЛОГИКА WORKFLOW, определяет переходы между статусами.
    Эта логика должна остаться как хардкод, так как это правила бизнес-процесса.
    """

    # ✅ БИЗНЕС-ЛОГИКА WORKFLOW: Маппинг статусов на роли, которые могут их устанавливать
    # Это НЕ контроль доступа, а правила перехода между статусами в бизнес-процессе
    STATUS_ROLE_MAP = {
        'DRAFT': ['FOREMAN', 'MASTER', 'SITE_MANAGER', 'ENGINEER', 'PROJECT_MANAGER'],
        'UNDER_REVIEW': ['FOREMAN', 'MASTER', 'SITE_MANAGER'],  # Отправка на проверку снабжения
        'WAREHOUSE_CHECK': ['SUPPLY_MANAGER'],  # Снабженец отправляет на проверку склада
        'BACK_TO_SUPPLY': ['WAREHOUSE_HEAD', 'DIRECTOR'],  # Зав.склада или Директор возвращает снабженцу
        'PROJECT_MANAGER_APPROVAL': ['SUPPLY_MANAGER'],  # Снабженец отправляет руководителю
        'DIRECTOR_APPROVAL': ['PROJECT_MANAGER'],  # Руководитель проекта отправляет директору
        'REWORK': ['SUPPLY_MANAGER', 'PROJECT_MANAGER', 'DIRECTOR', 'WAREHOUSE_HEAD'],  # Отправка на доработку
        'APPROVED': ['DIRECTOR'],  # Директор согласовывает
        'SENT_TO_SITE': ['SUPPLY_MANAGER'],  # Снабженец отправляет материалы со склада на объект
        'WAREHOUSE_SHIPPING': ['WAREHOUSE_HEAD'],  # Зав.склада подтверждает отправку на объект
        'PAYMENT': ['SUPPLY_MANAGER'],  # Снабженец ставит на оплату
        'PAID': ['SUPPLY_MANAGER', 'ACCOUNTANT'],  # Снабженец или Бухгалтер отмечает оплачено
        'DELIVERY': ['SUPPLY_MANAGER'],  # Снабженец отмечает доставлено
        'COMPLETED': ['FOREMAN', 'MASTER', 'SITE_MANAGER'],  # Прораб/Мастер/Начальник отмечает отработано
    }

    def has_permission(self, request, view):
        """Базовая проверка - пользователь должен быть аутентифицирован."""
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        """Проверка прав на изменение статуса конкретной заявки."""
        from apps.core.access_helpers import has_button_access

        user = request.user

        # Суперадмин может менять любой статус
        if user.is_superuser:
            return True

        # ✅ КОНТРОЛЬ ДОСТУПА: Проверяем кнопку edit через ButtonAccess
        if not has_button_access(user, 'edit', 'material-requests'):
            # Исключение: автор может редактировать свою заявку в определенных статусах
            has_returned_items = obj.items.filter(item_status='RETURNED_FOR_REVISION').exists()
            if not (obj.author == user and (obj.status in ['DRAFT', 'REWORK'] or has_returned_items)):
                return False

        # ✅ БИЗНЕС-ЛОГИКА WORKFLOW: Проверяем правила перехода между статусами
        new_status = request.data.get('new_status')
        if new_status:
            allowed_roles = self.STATUS_ROLE_MAP.get(new_status, [])
            if user.role in allowed_roles:
                return True

        # Ответственный за заявку может менять статус
        if obj.responsible == user:
            return True

        # Автор заявки может менять статус если заявка в статусе DRAFT или REWORK
        has_returned_items = obj.items.filter(item_status='RETURNED_FOR_REVISION').exists()
        if obj.author == user and (obj.status in ['DRAFT', 'REWORK'] or has_returned_items):
            return True

        return False


class MaterialRequestDocumentPermission(permissions.BasePermission):
    """
    Права на загрузку документов к заявке.

    ✅ НОВАЯ ЛОГИКА: Доступ проверяется через ButtonAccess.
    Используется кнопка 'edit' на странице material-requests для загрузки документов.
    """

    def has_permission(self, request, view):
        """Базовая проверка."""
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        """Проверка прав на загрузку документа к заявке."""
        from apps.core.access_helpers import has_button_access

        user = request.user

        # Суперадмин имеет полный доступ
        if user.is_superuser:
            return True

        # Автор заявки может загружать документы
        if obj.author == user:
            return True

        # Ответственный может загружать документы
        if obj.responsible == user:
            return True

        # Проверяем кнопку edit (загрузка документов = редактирование заявки)
        return has_button_access(user, 'edit', 'material-requests')


class MaterialRequestCommentPermission(permissions.BasePermission):
    """Права на добавление комментариев к заявке."""

    def has_permission(self, request, view):
        """Любой аутентифицированный пользователь может оставлять комментарии."""
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        """Проверка прав на комментирование заявки."""
        user = request.user

        # Суперадмин имеет полный доступ
        if user.is_superuser or user.role == 'SUPERADMIN':
            return True

        # Любой кто имеет доступ к проекту может комментировать
        if hasattr(user, 'projects') and obj.project in user.projects.all():
            return True

        # Автор и ответственный могут комментировать
        if obj.author == user or obj.responsible == user:
            return True

        return True  # Разрешаем комментарии всем авторизованным


# ===== PERMISSIONS ДЛЯ НОВОЙ СИСТЕМЫ СОГЛАСОВАНИЯ =====


class CanManageApprovalFlow(permissions.BasePermission):
    """
    Permission для управления цепочками согласования.

    ✅ НОВАЯ ЛОГИКА: Доступ проверяется через ButtonAccess.
    Проверка через кнопки на странице settings/approval-flow:
    - create: право создавать цепочки
    - edit: право редактировать цепочки
    - delete: право удалять этапы
    """

    def has_permission(self, request, view):
        """Проверка доступа на уровне view."""
        from apps.core.access_helpers import has_button_access, has_page_access

        user = request.user

        # Суперадмин имеет полный доступ
        if user.is_superuser:
            return True

        # Проверяем доступ к странице
        if not has_page_access(user, 'settings/approval-flow'):
            return False

        # Для чтения - проверяем доступ к странице
        if request.method in permissions.SAFE_METHODS:
            return True

        # Для создания - проверяем кнопку create
        if request.method == 'POST':
            return has_button_access(user, 'create', 'settings/approval-flow')

        # Для изменения - проверяем кнопку edit
        if request.method in ['PUT', 'PATCH']:
            return has_button_access(user, 'edit', 'settings/approval-flow')

        # Для удаления - проверяем кнопку delete
        if request.method == 'DELETE':
            return has_button_access(user, 'delete', 'settings/approval-flow')

        return False

    def has_object_permission(self, request, view, obj):
        """Проверка доступа к конкретному объекту."""
        from apps.core.access_helpers import has_button_access, has_page_access

        user = request.user

        # Суперадмин имеет полный доступ
        if user.is_superuser:
            return True

        # Проверяем доступ к странице
        if not has_page_access(user, 'settings/approval-flow'):
            return False

        # Определяем компанию объекта (зависит от типа модели)
        obj_company = None
        if hasattr(obj, 'company'):
            obj_company = obj.company
        elif hasattr(obj, 'flow_template'):
            obj_company = obj.flow_template.company

        # Пользователь может работать только с цепочками своей компании
        if obj_company and obj_company != user.company:
            return False

        # Для чтения - доступ к странице достаточен
        if request.method in permissions.SAFE_METHODS:
            return True

        # Для изменения (включая POST на detail actions типа activate) - проверяем кнопку edit
        if request.method in ['PUT', 'PATCH', 'POST']:
            return has_button_access(user, 'edit', 'settings/approval-flow')

        # Для удаления - проверяем кнопку delete
        if request.method == 'DELETE':
            return has_button_access(user, 'delete', 'settings/approval-flow')

        return False


class CanApproveRequest(permissions.BasePermission):
    """
    Permission для согласования заявок.

    Пользователь может согласовать заявку, если:
    1. Он назначен approver в текущем этапе MaterialRequestApproval
    2. Статус этапа = PENDING
    """

    def has_object_permission(self, request, view, obj):
        """Проверка доступа к согласованию конкретной заявки."""
        from .approval_models import MaterialRequestApproval

        user = request.user

        # Суперадмин может всё
        if user.is_superuser:
            return True

        # Проверяем что пользователь назначен согласующим на этом этапе
        if isinstance(obj, MaterialRequestApproval):
            return (
                obj.approver == user and
                obj.status == MaterialRequestApproval.ApprovalStatus.PENDING
            )

        return False


# ========== УДАЛЕНО: IsSuperuserOrReadOnly ==========
# ПРИЧИНА: Использовался только для CompanyApprovalSettings, который удален
# class IsSuperuserOrReadOnly(permissions.BasePermission):
#     """Permission: только суперадмин может изменять, остальные - только читать."""
#     ...
# ========== КОНЕЦ УДАЛЕННОГО КОДА ==========
