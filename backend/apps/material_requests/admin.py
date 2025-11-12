# apps/material_requests/admin.py
"""
Административная панель для заявок на материалы.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import MaterialRequest, MaterialRequestItem, ApprovalStep, MaterialRequestHistory


class ProjectFilter(admin.SimpleListFilter):
    """
    Кастомный фильтр для проектов с учетом закрепленных объектов.

    Показывает только те проекты, к которым пользователь имеет доступ:
    - SUPERADMIN видит все проекты
    - Руководство видит все проекты компании
    - Остальные видят только закрепленные проекты
    """
    title = 'Объект (проект)'
    parameter_name = 'project'

    def lookups(self, request, model_admin):
        """Возвращает список доступных проектов для фильтрации."""
        user = request.user

        # SUPERADMIN видит все проекты
        if user.is_superuser or user.role == 'SUPERADMIN':
            from apps.projects.models import Project
            projects = Project.objects.all()
        else:
            management_roles = ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'CHIEF_POWER_ENGINEER']

            if user.role in management_roles:
                # Руководство видит все проекты своей компании
                from apps.projects.models import Project
                projects = Project.objects.filter(company=user.company)
            else:
                # Остальные видят только закрепленные проекты
                projects = user.projects.all() | user.managed_projects.all()

        # Формируем список для dropdown
        return [(project.id, project.name) for project in projects.order_by('name')]

    def queryset(self, request, queryset):
        """Фильтрует queryset по выбранному проекту."""
        if self.value():
            return queryset.filter(project__id=self.value())
        return queryset


class CompanyFilter(admin.SimpleListFilter):
    """
    Кастомный фильтр для компаний.

    Показывает только свою компанию (кроме SUPERADMIN).
    """
    title = 'Компания'
    parameter_name = 'company'

    def lookups(self, request, model_admin):
        """Возвращает список доступных компаний для фильтрации."""
        user = request.user

        # SUPERADMIN видит все компании
        if user.is_superuser or user.role == 'SUPERADMIN':
            from apps.users.models import Company
            companies = Company.objects.all()
        else:
            # Остальные видят только свою компанию
            companies = [user.company]

        return [(company.id, company.name) for company in companies]

    def queryset(self, request, queryset):
        """Фильтрует queryset по выбранной компании."""
        if self.value():
            return queryset.filter(company__id=self.value())
        return queryset


class ItemProjectFilter(admin.SimpleListFilter):
    """
    Кастомный фильтр для проектов в позициях заявок.

    Показывает только те проекты, к которым пользователь имеет доступ.
    """
    title = 'Объект (проект)'
    parameter_name = 'project'

    def lookups(self, request, model_admin):
        """Возвращает список доступных проектов для фильтрации."""
        user = request.user

        # SUPERADMIN видит все проекты
        if user.is_superuser or user.role == 'SUPERADMIN':
            from apps.projects.models import Project
            projects = Project.objects.all()
        else:
            management_roles = ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'CHIEF_POWER_ENGINEER']

            if user.role in management_roles:
                # Руководство видит все проекты своей компании
                from apps.projects.models import Project
                projects = Project.objects.filter(company=user.company)
            else:
                # Остальные видят только закрепленные проекты
                projects = user.projects.all() | user.managed_projects.all()

        return [(project.id, project.name) for project in projects.order_by('name')]

    def queryset(self, request, queryset):
        """Фильтрует queryset по выбранному проекту."""
        if self.value():
            return queryset.filter(material_request__project__id=self.value())
        return queryset


class ItemCompanyFilter(admin.SimpleListFilter):
    """
    Кастомный фильтр для компаний в позициях заявок.
    """
    title = 'Компания'
    parameter_name = 'company'

    def lookups(self, request, model_admin):
        """Возвращает список доступных компаний для фильтрации."""
        user = request.user

        # SUPERADMIN видит все компании
        if user.is_superuser or user.role == 'SUPERADMIN':
            from apps.users.models import Company
            companies = Company.objects.all()
        else:
            # Остальные видят только свою компанию
            companies = [user.company]

        return [(company.id, company.name) for company in companies]

    def queryset(self, request, queryset):
        """Фильтрует queryset по выбранной компании."""
        if self.value():
            return queryset.filter(material_request__company__id=self.value())
        return queryset


class MaterialRequestItemInline(admin.TabularInline):
    """Инлайн для позиций заявки."""
    model = MaterialRequestItem
    extra = 1
    fields = ['position_number', 'material_name', 'unit', 'quantity_requested', 'quantity_actual', 'notes']


class ApprovalStepInline(admin.TabularInline):
    """Инлайн для этапов согласования."""
    model = ApprovalStep
    extra = 0
    readonly_fields = ['role', 'status', 'approved_by', 'created_at', 'approved_at', 'comment']
    can_delete = False


class MaterialRequestHistoryInline(admin.TabularInline):
    """Инлайн для истории заявки."""
    model = MaterialRequestHistory
    extra = 0
    readonly_fields = ['action', 'user', 'created_at', 'comment']
    can_delete = False


@admin.register(MaterialRequest)
class MaterialRequestAdmin(admin.ModelAdmin):
    """
    Административная панель для заявок на материалы.

    Страница: /admin/material_requests/materialrequest/
    Связана с: /dashboard/material-requests
    """

    list_display = [
        'request_number',
        'created_at_short',
        'company',
        'project',
        'author',
        'status_colored',
        'view_on_site_link',
    ]

    list_filter = [
        'status',
        CompanyFilter,
        ProjectFilter,
        'current_approval_role',
        'created_at',
        'submitted_at',
        'approved_at',
    ]

    search_fields = [
        'request_number',
        'title',
        'description',
        'author__email',
        'author__first_name',
        'author__last_name',
    ]

    readonly_fields = [
        'request_number',
        'created_at',
        'updated_at',
        'submitted_at',
        'approved_at',
        'completed_at',
        'rejected_at',
    ]

    fieldsets = (
        ('Основная информация', {
            'fields': (
                'request_number',
                'title',
                'description',
                'author',
                'project',
                'company',
            )
        }),
        ('Статус и согласование', {
            'fields': (
                'status',
                'current_approval_role',
            )
        }),
        ('Даты', {
            'fields': (
                'created_at',
                'updated_at',
                'submitted_at',
                'approved_at',
                'completed_at',
            )
        }),
        ('Отклонение', {
            'fields': (
                'rejection_reason',
                'rejected_by',
                'rejected_at',
            ),
            'classes': ('collapse',)
        }),
    )

    inlines = [MaterialRequestItemInline, ApprovalStepInline, MaterialRequestHistoryInline]

    def get_queryset(self, request):
        """
        Оптимизация запросов с учетом закрепленных объектов.

        Логика фильтрации:
        - SUPERADMIN видит все заявки
        - Руководство (DIRECTOR, CHIEF_ENGINEER, PROJECT_MANAGER, CHIEF_POWER_ENGINEER)
          видит все заявки своей компании
        - Остальные роли видят только заявки по своим закрепленным проектам (team_members)
        """
        queryset = super().get_queryset(request).select_related(
            'author',
            'project',
            'company',
            'rejected_by'
        ).prefetch_related('items', 'approval_steps', 'history')

        user = request.user

        # SUPERADMIN видит всё
        if user.is_superuser or user.role == 'SUPERADMIN':
            return queryset

        # Роли с полным доступом к компании
        management_roles = ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'CHIEF_POWER_ENGINEER']

        if user.role in management_roles:
            # Видят все заявки своей компании
            return queryset.filter(company=user.company)
        else:
            # Остальные видят только заявки по закрепленным проектам
            # Получаем проекты, где пользователь в team_members или является project_manager
            from django.db.models import Q
            user_projects = user.projects.all() | user.managed_projects.all()
            return queryset.filter(project__in=user_projects, company=user.company)

    def created_at_short(self, obj):
        """Краткая дата создания."""
        return obj.created_at.strftime('%d.%m.%Y')
    created_at_short.short_description = 'Дата создания'
    created_at_short.admin_order_field = 'created_at'

    def status_colored(self, obj):
        """Статус с цветовым оформлением."""
        colors = {
            'DRAFT': '#808080',
            'IN_APPROVAL': '#1890ff',
            'APPROVED': '#52c41a',
            'IN_PAYMENT': '#fa8c16',
            'IN_DELIVERY': '#13c2c2',
            'COMPLETED': '#52c41a',
            'REJECTED': '#f5222d',
        }
        color = colors.get(obj.status, '#000000')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_colored.short_description = 'Статус'
    status_colored.admin_order_field = 'status'

    def view_on_site_link(self, obj):
        """Ссылка на страницу заявки во frontend."""
        url = f'http://localhost:5174/dashboard/material-requests'
        return format_html(
            '<a href="{}" target="_blank" style="color: #1890ff;">Открыть на сайте →</a>',
            url
        )
    view_on_site_link.short_description = 'Ссылка'

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """
        Ограничивает выбор проектов и компаний в форме создания/редактирования заявки.

        Применяет ту же логику, что и в get_queryset:
        - Руководство видит все проекты компании
        - Остальные видят только закрепленные проекты
        """
        if db_field.name == 'project':
            user = request.user

            # SUPERADMIN видит все проекты
            if not (user.is_superuser or user.role == 'SUPERADMIN'):
                management_roles = ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'CHIEF_POWER_ENGINEER']

                if user.role in management_roles:
                    # Видят все проекты своей компании
                    kwargs['queryset'] = db_field.related_model.objects.filter(company=user.company)
                else:
                    # Видят только закрепленные проекты
                    user_projects = user.projects.all() | user.managed_projects.all()
                    kwargs['queryset'] = user_projects.filter(company=user.company)

        if db_field.name == 'company':
            user = request.user
            # Ограничиваем выбор компании только своей компанией
            if not (user.is_superuser or user.role == 'SUPERADMIN'):
                kwargs['queryset'] = db_field.related_model.objects.filter(id=user.company.id)

        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(MaterialRequestItem)
class MaterialRequestItemAdmin(admin.ModelAdmin):
    """
    Административная панель для позиций заявок.

    Страница: /admin/material_requests/materialrequestitem/
    Связана с: /dashboard/material-requests
    """

    list_display = [
        'request_number',
        'material_name',
        'created_at_short',
        'company',
        'project',
        'author',
        'status_colored',
        'view_on_site_link',
    ]

    list_filter = [
        'material_request__status',
        ItemCompanyFilter,
        ItemProjectFilter,
        'material_request__created_at',
        'unit',
    ]

    search_fields = [
        'material_name',
        'material_request__request_number',
        'material_request__title',
        'notes',
    ]

    def get_queryset(self, request):
        """
        Оптимизация запросов с учетом закрепленных объектов.

        Применяет ту же логику фильтрации, что и для заявок:
        - SUPERADMIN видит все позиции
        - Руководство видит все позиции заявок своей компании
        - Остальные видят только позиции заявок по закрепленным проектам
        """
        queryset = super().get_queryset(request).select_related(
            'material_request',
            'material_request__author',
            'material_request__project',
            'material_request__company'
        )

        user = request.user

        # SUPERADMIN видит всё
        if user.is_superuser or user.role == 'SUPERADMIN':
            return queryset

        # Роли с полным доступом к компании
        management_roles = ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'CHIEF_POWER_ENGINEER']

        if user.role in management_roles:
            # Видят все позиции заявок своей компании
            return queryset.filter(material_request__company=user.company)
        else:
            # Остальные видят только позиции заявок по закрепленным проектам
            from django.db.models import Q
            user_projects = user.projects.all() | user.managed_projects.all()
            return queryset.filter(
                material_request__project__in=user_projects,
                material_request__company=user.company
            )

    def request_number(self, obj):
        """Номер заявки."""
        return obj.material_request.request_number
    request_number.short_description = 'Номер заявки'
    request_number.admin_order_field = 'material_request__request_number'

    def created_at_short(self, obj):
        """Дата создания заявки."""
        return obj.material_request.created_at.strftime('%d.%m.%Y')
    created_at_short.short_description = 'Дата создания'
    created_at_short.admin_order_field = 'material_request__created_at'

    def company(self, obj):
        """Компания."""
        return obj.material_request.company.name
    company.short_description = 'Компания'
    company.admin_order_field = 'material_request__company__name'

    def project(self, obj):
        """Объект (проект)."""
        return obj.material_request.project.name
    project.short_description = 'Объект'
    project.admin_order_field = 'material_request__project__name'

    def author(self, obj):
        """Автор заявки."""
        return obj.material_request.author.get_full_name() if obj.material_request.author else '—'
    author.short_description = 'Автор'
    author.admin_order_field = 'material_request__author__last_name'

    def status_colored(self, obj):
        """Статус заявки с цветовым оформлением."""
        colors = {
            'DRAFT': '#808080',
            'IN_APPROVAL': '#1890ff',
            'APPROVED': '#52c41a',
            'IN_PAYMENT': '#fa8c16',
            'IN_DELIVERY': '#13c2c2',
            'COMPLETED': '#52c41a',
            'REJECTED': '#f5222d',
        }
        color = colors.get(obj.material_request.status, '#000000')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.material_request.get_status_display()
        )
    status_colored.short_description = 'Статус'
    status_colored.admin_order_field = 'material_request__status'

    def view_on_site_link(self, obj):
        """Ссылка на страницу заявки во frontend."""
        url = f'http://localhost:5174/dashboard/material-requests'
        return format_html(
            '<a href="{}" target="_blank" style="color: #1890ff;">Открыть на сайте →</a>',
            url
        )
    view_on_site_link.short_description = 'Ссылка'


@admin.register(ApprovalStep)
class ApprovalStepAdmin(admin.ModelAdmin):
    """Административная панель для этапов согласования."""

    list_display = [
        'material_request',
        'role',
        'status',
        'approved_by',
        'created_at',
        'approved_at',
    ]

    list_filter = [
        'role',
        'status',
        'created_at',
    ]

    search_fields = [
        'material_request__request_number',
        'comment',
    ]

    readonly_fields = ['created_at', 'approved_at']


@admin.register(MaterialRequestHistory)
class MaterialRequestHistoryAdmin(admin.ModelAdmin):
    """Административная панель для истории заявок."""

    list_display = [
        'material_request',
        'action',
        'user',
        'created_at',
    ]

    list_filter = [
        'action',
        'created_at',
    ]

    search_fields = [
        'material_request__request_number',
        'comment',
        'user__email',
    ]

    readonly_fields = ['created_at']
