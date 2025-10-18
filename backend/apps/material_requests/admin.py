from django.contrib import admin
from django.utils.html import format_html
from .models import (
    MaterialRequest,
    MaterialRequestItem,
    MaterialRequestDocument,
    MaterialRequestHistory,
    MaterialRequestComment
)


class MaterialRequestItemInline(admin.TabularInline):
    """Inline для позиций материалов в заявке."""
    model = MaterialRequestItem
    extra = 1
    fields = ['material_name', 'quantity', 'unit', 'specifications', 'order']
    ordering = ['order']


class MaterialRequestDocumentInline(admin.TabularInline):
    """Inline для документов заявки."""
    model = MaterialRequestDocument
    extra = 0
    fields = ['document_type', 'file', 'file_name', 'description', 'uploaded_by', 'created_at']
    readonly_fields = ['created_at', 'uploaded_by']


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


@admin.register(MaterialRequest)
class MaterialRequestAdmin(admin.ModelAdmin):
    """Админ-панель для заявок на материалы."""

    list_display = [
        'request_number',
        'project',
        'get_status_badge',
        'author',
        'responsible',
        'get_materials_count',
        'created_at',
        'updated_at'
    ]

    list_filter = [
        'status',
        'project',
        'author',
        'responsible',
        'created_at'
    ]

    search_fields = [
        'request_number',
        'project__name',
        'author__email',
        'author__first_name',
        'author__last_name',
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

    def save_formset(self, request, form, formset, change):
        """Сохранение inline формсетов с автозаполнением uploaded_by."""
        instances = formset.save(commit=False)
        for instance in instances:
            if isinstance(instance, MaterialRequestDocument) and not instance.uploaded_by:
                instance.uploaded_by = request.user
            instance.save()
        formset.save_m2m()


@admin.register(MaterialRequestItem)
class MaterialRequestItemAdmin(admin.ModelAdmin):
    """Админ-панель для позиций материалов."""

    list_display = ['material_name', 'request', 'quantity', 'unit', 'order']
    list_filter = ['request__project', 'unit']
    search_fields = ['material_name', 'specifications', 'request__request_number']
    ordering = ['request', 'order']


@admin.register(MaterialRequestDocument)
class MaterialRequestDocumentAdmin(admin.ModelAdmin):
    """Админ-панель для документов заявок."""

    list_display = ['file_name', 'request', 'document_type', 'uploaded_by', 'created_at']
    list_filter = ['document_type', 'created_at']
    search_fields = ['file_name', 'description', 'request__request_number']
    readonly_fields = ['created_at']


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
        return False


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
