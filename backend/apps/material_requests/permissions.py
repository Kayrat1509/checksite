from rest_framework import permissions


class MaterialRequestPermission(permissions.BasePermission):
    """
    Права доступа для заявок на материалы согласно ТЗ (раздел 2.6).

    Роли и права:
    - Начальник участка (прораб): создает, редактирует, отправляет заявки
    - Снабжение: полный доступ ко всем заявкам
    - Зав. центрального склада: полный доступ
    - Руководитель: утверждает реестры, подписывает счета
    - Бухгалтерия: просмотр всех заявок
    - Кладовщик: просмотр заявок своего объекта, подтверждает приемку
    - Администратор: полный доступ
    """

    def has_permission(self, request, view):
        """Проверка прав на уровне списка заявок."""
        # Пользователь должен быть аутентифицирован
        if not request.user or not request.user.is_authenticated:
            return False

        # Суперадмин имеет полный доступ
        if request.user.is_superuser or request.user.role == 'SUPERADMIN':
            return True

        # Просмотр доступен всем авторизованным пользователям
        if request.method in permissions.SAFE_METHODS:
            return True

        # Создание заявок доступно:
        # - Прорабам (FOREMAN, MASTER)
        # - Начальникам участка (SITE_MANAGER)
        # - ПТО
        # - Руководителям
        if request.method == 'POST':
            return request.user.role in [
                'FOREMAN',
                'MASTER',
                'SITE_MANAGER',
                'ENGINEER',
                'PROJECT_MANAGER',
                'CHIEF_ENGINEER',
                'DIRECTOR',
                'SUPERADMIN'
            ]

        return True

    def has_object_permission(self, request, view, obj):
        """Проверка прав на уровне конкретной заявки."""
        user = request.user

        # Суперадмин имеет полный доступ
        if user.is_superuser or user.role == 'SUPERADMIN':
            return True

        # Просмотр доступен всем кто имеет доступ к проекту
        if request.method in permissions.SAFE_METHODS:
            # Проверяем доступ к проекту заявки
            if hasattr(user, 'projects') and obj.project in user.projects.all():
                return True
            # Руководители и снабжение видят все
            if user.role in ['DIRECTOR', 'CHIEF_ENGINEER', 'SUPPLY_MANAGER', 'WAREHOUSE_HEAD', 'ACCOUNTANT']:
                return True
            # Автор заявки всегда видит свою заявку
            if obj.author == user:
                return True
            # Ответственный видит заявку
            if obj.responsible == user:
                return True
            return False

        # Редактирование и удаление:
        # - Автор может редактировать свою заявку в статусе DRAFT
        if request.method in ['PUT', 'PATCH', 'DELETE']:
            if obj.author == user and obj.status == 'DRAFT':
                return True
            # Руководители и снабжение могут редактировать любые заявки
            if user.role in ['DIRECTOR', 'CHIEF_ENGINEER', 'SUPERADMIN', 'SUPPLY_MANAGER']:
                return True

        return False


class MaterialRequestStatusChangePermission(permissions.BasePermission):
    """
    Права на изменение статуса заявки.
    Каждый статус может менять только ответственная роль согласно новой схеме согласования.
    """

    # Маппинг статусов на роли, которые могут их устанавливать
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
        user = request.user

        # Суперадмин может менять любой статус
        if user.is_superuser or user.role == 'SUPERADMIN':
            return True

        # Директор и Главный инженер могут менять большинство статусов
        if user.role in ['DIRECTOR', 'CHIEF_ENGINEER']:
            return True

        # Проверяем текущий статус и кто может его менять
        new_status = request.data.get('new_status')
        if new_status:
            allowed_roles = self.STATUS_ROLE_MAP.get(new_status, [])
            if user.role in allowed_roles:
                return True

        # Ответственный за заявку может менять статус
        if obj.responsible == user:
            return True

        # Автор заявки может менять статус если заявка в статусе DRAFT или REWORK
        if obj.author == user and obj.status in ['DRAFT', 'REWORK']:
            return True

        return False


class MaterialRequestDocumentPermission(permissions.BasePermission):
    """Права на загрузку документов к заявке."""

    def has_permission(self, request, view):
        """Базовая проверка."""
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        """Проверка прав на загрузку документа к заявке."""
        user = request.user

        # Суперадмин имеет полный доступ
        if user.is_superuser or user.role == 'SUPERADMIN':
            return True

        # Автор заявки может загружать документы
        if obj.author == user:
            return True

        # Ответственный может загружать документы
        if obj.responsible == user:
            return True

        # Руководители и снабжение могут загружать документы
        if user.role in ['DIRECTOR', 'CHIEF_ENGINEER', 'SUPPLY_MANAGER', 'WAREHOUSE_HEAD', 'ACCOUNTANT']:
            return True

        return False


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
