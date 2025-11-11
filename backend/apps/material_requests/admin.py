"""
Админ-панель для управления заявками на материалы
"""
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import MaterialRequest, MaterialRequestItem


class MaterialRequestItemInline(admin.TabularInline):
    """
    Inline редактирование позиций материалов внутри заявки
    """
    model = MaterialRequestItem
    extra = 1
    fields = ['order', 'material_name', 'unit', 'quantity_requested', 'quantity_actual', 'notes']
    ordering = ['order']


@admin.register(MaterialRequest)
class MaterialRequestAdmin(admin.ModelAdmin):
    """
    Админ-панель для управления заявками на материалы
    """
    list_display = [
        'number',
        'company',
        'project_link',
        'created_by',
        'status_colored',
        'current_approver',
        'items_count',
        'created_at',
        'submitted_at',
    ]
    list_filter = [
        'status',
        'company',
        'created_at',
        'submitted_at',
        'current_approver_role',
    ]
    search_fields = [
        'number',
        'company__name',
        'project__name',
        'created_by__first_name',
        'created_by__last_name',
    ]
    readonly_fields = [
        'number',
        'company',
        'created_by',
        'status',
        'current_approver_role',
        'current_approver',
        'approval_chain',
        'approval_chain_index',
        'approval_history_display',
        'created_at',
        'updated_at',
        'submitted_at',
        'approved_at',
        'completed_at',
        'rejected_at',
        'rejected_by',
    ]
    date_hierarchy = 'created_at'
    inlines = [MaterialRequestItemInline]

    fieldsets = (
        ('Основная информация', {
            'fields': (
                'number',
                'company',
                'project',
                'created_by',
            )
        }),
        ('Статус и согласование', {
            'fields': (
                'status',
                'current_approver_role',
                'current_approver',
                'approval_chain',
                'approval_chain_index',
            )
        }),
        ('История согласования', {
            'fields': (
                'approval_history_display',
            ),
            'classes': ('collapse',),
        }),
        ('Возврат на доработку', {
            'fields': (
                'rejection_reason',
                'rejected_at',
                'rejected_by',
            ),
            'classes': ('collapse',),
        }),
        ('Временные метки', {
            'fields': (
                'created_at',
                'updated_at',
                'submitted_at',
                'approved_at',
                'completed_at',
            ),
            'classes': ('collapse',),
        }),
        ('Мягкое удаление', {
            'fields': (
                'is_deleted',
                'deleted_at',
                'deleted_by',
            ),
            'classes': ('collapse',),
        }),
    )

    def project_link(self, obj):
        """Ссылка на проект"""
        if obj.project:
            url = reverse('admin:projects_project_change', args=[obj.project.id])
            return format_html('<a href="{}">{}</a>', url, obj.project.name)
        return '-'
    project_link.short_description = 'Проект'

    def status_colored(self, obj):
        """Цветной статус заявки"""
        colors = {
            'DRAFT': 'gray',
            'SITE_MANAGER_APPROVAL': 'orange',
            'ENGINEER_APPROVAL': 'orange',
            'PM_APPROVAL': 'orange',
            'CHIEF_POWER_APPROVAL': 'orange',
            'CHIEF_ENGINEER_APPROVAL': 'orange',
            'DIRECTOR_APPROVAL': 'orange',
            'APPROVED': 'green',
            'WAREHOUSE_REVIEW': 'blue',
            'PROCUREMENT': 'blue',
            'PAYMENT': 'blue',
            'DELIVERY': 'blue',
            'COMPLETED': 'darkgreen',
            'REJECTED': 'red',
        }
        color = colors.get(obj.status, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_colored.short_description = 'Статус'

    def items_count(self, obj):
        """Количество позиций материалов"""
        count = obj.items.count()
        return format_html('<b>{}</b>', count)
    items_count.short_description = 'Позиций'

    def approval_history_display(self, obj):
        """Отображение истории согласования в удобочитаемом виде"""
        if not obj.approval_history:
            return 'История пуста'

        html = '<table style="width: 100%; border-collapse: collapse;">'
        html += '<tr style="background-color: #f0f0f0;"><th style="padding: 5px; border: 1px solid #ddd;">Этап</th><th style="padding: 5px; border: 1px solid #ddd;">Согласующий</th><th style="padding: 5px; border: 1px solid #ddd;">Решение</th><th style="padding: 5px; border: 1px solid #ddd;">Дата</th><th style="padding: 5px; border: 1px solid #ddd;">Комментарий</th></tr>'

        for entry in obj.approval_history:
            role = entry.get('role', '-')
            approver = entry.get('approver', '-')
            decision = entry.get('decision', '-')
            date = entry.get('date', '-')
            comment = entry.get('comment', '')

            # Цвет решения
            decision_color = 'green' if decision == 'approved' else 'red' if decision == 'rejected' else 'black'
            decision_text = 'Согласовано' if decision == 'approved' else 'Отклонено' if decision == 'rejected' else decision

            html += f'<tr><td style="padding: 5px; border: 1px solid #ddd;">{role}</td><td style="padding: 5px; border: 1px solid #ddd;">{approver}</td><td style="padding: 5px; border: 1px solid #ddd; color: {decision_color}; font-weight: bold;">{decision_text}</td><td style="padding: 5px; border: 1px solid #ddd;">{date}</td><td style="padding: 5px; border: 1px solid #ddd;">{comment}</td></tr>'

        html += '</table>'
        return mark_safe(html)
    approval_history_display.short_description = 'История согласования'

    def get_queryset(self, request):
        """Оптимизация запросов"""
        return super().get_queryset(request).select_related(
            'company',
            'project',
            'created_by',
            'current_approver',
            'rejected_by',
            'deleted_by',
        ).prefetch_related('items')

    def has_delete_permission(self, request, obj=None):
        """Запрещаем физическое удаление - используем только soft delete"""
        return False

    def has_change_permission(self, request, obj=None):
        """Разрешаем изменение только черновиков"""
        if obj and obj.status != MaterialRequest.Status.DRAFT:
            return False
        return super().has_change_permission(request, obj)


@admin.register(MaterialRequestItem)
class MaterialRequestItemAdmin(admin.ModelAdmin):
    """
    Админ-панель для позиций материалов
    """
    list_display = [
        'id',
        'request_link',
        'material_name',
        'unit',
        'quantity_requested',
        'quantity_actual',
        'order',
    ]
    list_filter = [
        'unit',
        'request__status',
        'request__company',
    ]
    search_fields = [
        'material_name',
        'request__number',
        'notes',
    ]
    readonly_fields = ['request', 'created_at']
    ordering = ['request', 'order']

    fieldsets = (
        ('Заявка', {
            'fields': ('request',)
        }),
        ('Материал', {
            'fields': (
                'material_name',
                'unit',
                'quantity_requested',
                'quantity_actual',
                'notes',
                'order',
            )
        }),
    )

    def request_link(self, obj):
        """Ссылка на заявку"""
        if obj.request:
            url = reverse('admin:material_requests_materialrequest_change', args=[obj.request.id])
            return format_html('<a href="{}">{}</a>', url, obj.request.number)
        return '-'
    request_link.short_description = 'Заявка'

    def get_queryset(self, request):
        """Оптимизация запросов"""
        return super().get_queryset(request).select_related(
            'request',
            'request__company',
            'request__project',
        )
