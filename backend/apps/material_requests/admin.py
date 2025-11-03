from django.contrib import admin
from django.utils.html import format_html
from .models import (
    MaterialRequest,
    MaterialRequestItem,
    MaterialRequestDocument,
    MaterialRequestHistory,
    MaterialRequestComment
)
from .approval_models import (
    ApprovalFlowTemplate,
    ApprovalStep,
    MaterialRequestApproval,
    CompanyApprovalSettings
)


class MaterialRequestItemInline(admin.TabularInline):
    """Inline для позиций материалов в заявке."""
    model = MaterialRequestItem
    extra = 1
    fields = ['material_name', 'quantity', 'actual_quantity', 'unit', 'specifications', 'order']
    ordering = ['order']

    def has_delete_permission(self, request, obj=None):
        """Разрешить удаление позиций только суперадмину."""
        return request.user.is_superuser


class MaterialRequestDocumentInline(admin.TabularInline):
    """Inline для документов заявки."""
    model = MaterialRequestDocument
    extra = 0
    fields = ['document_type', 'file', 'file_name', 'description', 'uploaded_by', 'created_at']
    readonly_fields = ['created_at', 'uploaded_by']

    def has_delete_permission(self, request, obj=None):
        """Разрешить удаление документов только суперадмину."""
        return request.user.is_superuser


class MaterialRequestHistoryInline(admin.TabularInline):
    """Inline для истории изменений заявки."""
    model = MaterialRequestHistory
    extra = 0
    fields = ['user', 'old_status', 'new_status', 'comment', 'created_at']
    readonly_fields = ['user', 'old_status', 'new_status', 'comment', 'created_at']
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


class MaterialRequestCommentInline(admin.TabularInline):
    """Inline для комментариев к заявке."""
    model = MaterialRequestComment
    extra = 1
    fields = ['author', 'text', 'created_at']
    readonly_fields = ['created_at']

    def has_delete_permission(self, request, obj=None):
        """Разрешить удаление комментариев только суперадмину."""
        return request.user.is_superuser


@admin.register(MaterialRequest)
class MaterialRequestAdmin(admin.ModelAdmin):
    """Админ-панель для заявок на материалы."""

    list_display = [
        'request_number',
        'project',
        'get_company',
        'get_status_badge',
        'get_materials_count',
        'created_at',
        'updated_at'
    ]

    list_filter = [
        'status',
        'project',
        'project__company',
        'created_at'
    ]

    search_fields = [
        'request_number',
        'project__name',
        'project__company__name',
        'notes'
    ]

    readonly_fields = [
        'request_number',
        'created_at',
        'updated_at',
        'get_status_badge'
    ]

    date_hierarchy = 'created_at'

    inlines = [
        MaterialRequestItemInline,
        MaterialRequestDocumentInline,
        MaterialRequestCommentInline,
        MaterialRequestHistoryInline,
    ]

    fieldsets = (
        ('Основная информация', {
            'fields': (
                'request_number',
                'project',
                'author',
                'status',
                'get_status_badge',
                'responsible'
            )
        }),
        ('Детали заявки', {
            'fields': (
                'drawing_reference',
                'work_type',
                'notes',
                'author_signature'
            )
        }),
        ('Даты', {
            'fields': (
                'created_at',
                'updated_at'
            ),
            'classes': ('collapse',)
        }),
    )

    def get_status_badge(self, obj):
        """Отображение статуса с цветной меткой."""
        # Цвета статусов согласно ТЗ пункт 6
        colors = {
            'DRAFT': '#6B7280',  # Серый - Черновик
            'UNDER_REVIEW': '#3B82F6',  # Синий - Проверка
            'WAREHOUSE_CHECK': '#3B82F6',  # Синий - Проверка
            'RESERVED': '#3B82F6',  # Синий - Проверка
            'SUPPLIER_SEARCH': '#F59E0B',  # Оранжевый - Снабжение
            'REGISTRY_APPROVAL': '#F59E0B',  # Оранжевый - Снабжение
            'INVOICE_SIGNING': '#F59E0B',  # Оранжевый - Снабжение
            'ACCOUNTING': '#F59E0B',  # Оранжевый - Снабжение
            'DELIVERY': '#F59E0B',  # Оранжевый - Снабжение
            'ACCEPTED': '#10B981',  # Зелёный - Выполнено
            'COMPLETED': '#10B981',  # Зелёный - Выполнено
        }
        color = colors.get(obj.status, '#6B7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 5px 10px; border-radius: 4px; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    get_status_badge.short_description = 'Статус'

    def get_materials_count(self, obj):
        """Количество позиций материалов в заявке."""
        return obj.items.count()
    get_materials_count.short_description = 'Позиций'

    def get_company(self, obj):
        """Получение компании через проект."""
        if obj.project and obj.project.company:
            return obj.project.company.name
        return '-'
    get_company.short_description = 'Компания'

    def save_formset(self, request, form, formset, change):
        """Сохранение inline формсетов с автозаполнением uploaded_by."""
        instances = formset.save(commit=False)
        for instance in instances:
            if isinstance(instance, MaterialRequestDocument) and not instance.uploaded_by:
                instance.uploaded_by = request.user
            instance.save()
        formset.save_m2m()

    def has_delete_permission(self, request, obj=None):
        """Разрешить удаление заявок только суперадмину."""
        # Проверяем, что пользователь является суперадмином
        is_superuser = request.user.is_superuser

        # Логируем для отладки
        if not is_superuser:
            print(f"⚠️ Удаление запрещено для пользователя: {request.user.email} (is_superuser={is_superuser})")

        return is_superuser

    def get_actions(self, request):
        """Получить доступные actions. Удаление только для суперадмина."""
        actions = super().get_actions(request)

        # Если не суперадмин, удаляем action 'delete_selected'
        if not request.user.is_superuser and 'delete_selected' in actions:
            del actions['delete_selected']
            print(f"⚠️ Action 'delete_selected' удален для пользователя: {request.user.email}")

        return actions

    def delete_model(self, request, obj):
        """Переопределяем метод удаления для логирования."""
        print(f"✅ Удаление заявки {obj.request_number} пользователем {request.user.email}")
        super().delete_model(request, obj)

    def delete_queryset(self, request, queryset):
        """Переопределяем метод массового удаления для логирования."""
        print(f"✅ Массовое удаление {queryset.count()} заявок пользователем {request.user.email}")
        super().delete_queryset(request, queryset)


@admin.register(MaterialRequestItem)
class MaterialRequestItemAdmin(admin.ModelAdmin):
    """Админ-панель для позиций материалов."""

    list_display = ['material_name', 'request', 'quantity', 'unit', 'order']
    list_filter = ['request__project', 'unit']
    search_fields = ['material_name', 'specifications', 'request__request_number']
    ordering = ['request', 'order']

    def has_delete_permission(self, request, obj=None):
        """Разрешить удаление позиций только суперадмину."""
        return request.user.is_superuser

    def get_actions(self, request):
        """Получить доступные actions. Удаление только для суперадмина."""
        actions = super().get_actions(request)
        if not request.user.is_superuser and 'delete_selected' in actions:
            del actions['delete_selected']
        return actions


@admin.register(MaterialRequestDocument)
class MaterialRequestDocumentAdmin(admin.ModelAdmin):
    """Админ-панель для документов заявок."""

    list_display = ['file_name', 'request', 'document_type', 'uploaded_by', 'created_at']
    list_filter = ['document_type', 'created_at']
    search_fields = ['file_name', 'description', 'request__request_number']
    readonly_fields = ['created_at']

    def has_delete_permission(self, request, obj=None):
        """Разрешить удаление документов только суперадмину."""
        return request.user.is_superuser

    def get_actions(self, request):
        """Получить доступные actions. Удаление только для суперадмина."""
        actions = super().get_actions(request)
        if not request.user.is_superuser and 'delete_selected' in actions:
            del actions['delete_selected']
        return actions


@admin.register(MaterialRequestHistory)
class MaterialRequestHistoryAdmin(admin.ModelAdmin):
    """Админ-панель для истории заявок."""

    list_display = ['request', 'user', 'old_status', 'new_status', 'created_at']
    list_filter = ['new_status', 'created_at']
    search_fields = ['request__request_number', 'user__email', 'comment']
    readonly_fields = ['request', 'user', 'old_status', 'new_status', 'comment', 'created_at']
    date_hierarchy = 'created_at'

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        """Разрешить удаление истории только суперадмину (при удалении заявки)."""
        return request.user.is_superuser


@admin.register(MaterialRequestComment)
class MaterialRequestCommentAdmin(admin.ModelAdmin):
    """Админ-панель для комментариев к заявкам."""

    list_display = ['request', 'author', 'get_short_text', 'created_at']
    list_filter = ['created_at']
    search_fields = ['text', 'request__request_number', 'author__email']
    readonly_fields = ['created_at', 'updated_at']

    def get_short_text(self, obj):
        """Короткая версия текста комментария."""
        if len(obj.text) > 50:
            return f"{obj.text[:50]}..."
        return obj.text
    get_short_text.short_description = 'Комментарий'

    def has_delete_permission(self, request, obj=None):
        """Разрешить удаление комментариев только суперадмину."""
        return request.user.is_superuser

    def get_actions(self, request):
        """Получить доступные actions. Удаление только для суперадмина."""
        actions = super().get_actions(request)
        if not request.user.is_superuser and 'delete_selected' in actions:
            del actions['delete_selected']
        return actions


# ===== АДМИН-ПАНЕЛЬ ДЛЯ НОВОЙ СИСТЕМЫ СОГЛАСОВАНИЯ =====


class ApprovalStepInline(admin.TabularInline):
    """Inline для этапов согласования в шаблоне цепочки."""
    model = ApprovalStep
    extra = 1
    fields = ['order', 'role', 'skip_if_empty', 'is_mandatory', 'description']
    ordering = ['order']

    def has_delete_permission(self, request, obj=None):
        """Разрешить удаление этапов только суперадмину."""
        return request.user.is_superuser


@admin.register(ApprovalFlowTemplate)
class ApprovalFlowTemplateAdmin(admin.ModelAdmin):
    """Админ-панель для шаблонов цепочек согласования."""

    list_display = [
        'name',
        'company',
        'is_active',
        'get_steps_count',
        'created_by',
        'created_at'
    ]

    list_filter = [
        'is_active',
        'company',
        'created_at'
    ]

    search_fields = [
        'name',
        'company__name',
        'description'
    ]

    readonly_fields = [
        'created_at',
        'updated_at'
    ]

    date_hierarchy = 'created_at'

    inlines = [ApprovalStepInline]

    fieldsets = (
        ('Основная информация', {
            'fields': (
                'company',
                'name',
                'description',
                'is_active',
                'created_by'
            )
        }),
        ('Даты', {
            'fields': (
                'created_at',
                'updated_at'
            ),
            'classes': ('collapse',)
        }),
    )

    def get_steps_count(self, obj):
        """Количество этапов в цепочке."""
        return obj.steps.count()
    get_steps_count.short_description = 'Этапов'

    def save_model(self, request, obj, form, change):
        """Автоматическое заполнение created_by при создании."""
        if not change:  # Если создаем новый объект
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def has_delete_permission(self, request, obj=None):
        """Разрешить удаление шаблонов только суперадмину."""
        return request.user.is_superuser


@admin.register(ApprovalStep)
class ApprovalStepAdmin(admin.ModelAdmin):
    """Админ-панель для этапов согласования."""

    list_display = [
        'flow_template',
        'order',
        'role',
        'skip_if_empty',
        'is_mandatory'
    ]

    list_filter = [
        'role',
        'skip_if_empty',
        'is_mandatory',
        'flow_template__company'
    ]

    search_fields = [
        'flow_template__name',
        'description'
    ]

    ordering = ['flow_template', 'order']

    fieldsets = (
        ('Основная информация', {
            'fields': (
                'flow_template',
                'role',
                'order'
            )
        }),
        ('Настройки этапа', {
            'fields': (
                'skip_if_empty',
                'is_mandatory',
                'description'
            )
        }),
    )

    def has_delete_permission(self, request, obj=None):
        """Разрешить удаление этапов только суперадмину."""
        return request.user.is_superuser


@admin.register(MaterialRequestApproval)
class MaterialRequestApprovalAdmin(admin.ModelAdmin):
    """Админ-панель для отслеживания согласований заявок."""

    list_display = [
        'material_request',
        'get_step_info',
        'approver',
        'get_status_badge',
        'approved_at',
        'created_at'
    ]

    list_filter = [
        'status',
        'step__role',
        'created_at',
        'approved_at'
    ]

    search_fields = [
        'material_request__request_number',
        'approver__email',
        'approver__first_name',
        'approver__last_name',
        'comment'
    ]

    readonly_fields = [
        'created_at',
        'updated_at',
        'approved_at'
    ]

    date_hierarchy = 'created_at'

    fieldsets = (
        ('Основная информация', {
            'fields': (
                'material_request',
                'step',
                'approver',
                'status'
            )
        }),
        ('Детали согласования', {
            'fields': (
                'comment',
                'approved_at'
            )
        }),
        ('Даты', {
            'fields': (
                'created_at',
                'updated_at'
            ),
            'classes': ('collapse',)
        }),
    )

    def get_step_info(self, obj):
        """Информация об этапе согласования."""
        return f"Этап {obj.step.order}: {obj.step.get_role_display()}"
    get_step_info.short_description = 'Этап'

    def get_status_badge(self, obj):
        """Отображение статуса с цветной меткой."""
        colors = {
            'PENDING': '#F59E0B',  # Оранжевый - Ожидает
            'APPROVED': '#10B981',  # Зелёный - Согласовано
            'REJECTED': '#EF4444',  # Красный - Отклонено
            'SKIPPED': '#6B7280',  # Серый - Пропущено
        }
        color = colors.get(obj.status, '#6B7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 5px 10px; border-radius: 4px; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    get_status_badge.short_description = 'Статус'

    def has_add_permission(self, request):
        """Запретить ручное создание записей согласования."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Разрешить удаление согласований только суперадмину (при удалении заявки)."""
        return request.user.is_superuser


# ========== УДАЛЕНО: CompanyApprovalSettingsAdmin ==========
# ПРИЧИНА: Старая логика доступа, заменена на ButtonAccess
# @admin.register(CompanyApprovalSettings)
# class CompanyApprovalSettingsAdmin(admin.ModelAdmin):
#     """Админ-панель для настроек доступа к управлению цепочками согласования."""
#     ...
# ========== КОНЕЦ УДАЛЕННОГО КОДА ==========
