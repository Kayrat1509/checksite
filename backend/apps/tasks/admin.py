# apps/tasks/admin.py
"""
Админ-панель для управления задачами.
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    """
    Админ-панель для модели Task.
    """

    list_display = [
        'task_number',
        'title',
        'status_badge',
        'created_by',
        'assigned_to_display',
        'deadline',
        'created_at',
        'company',
    ]

    list_filter = [
        'status',
        'created_at',
        'deadline',
        'company',
        'is_deleted',
    ]

    search_fields = [
        'task_number',
        'title',
        'description',
        'created_by__email',
        'created_by__first_name',
        'created_by__last_name',
    ]

    readonly_fields = [
        'task_number',
        'created_at',
        'updated_at',
        'completed_at',
        'rejected_at',
        'deleted_at',
    ]

    fieldsets = (
        ('Основная информация', {
            'fields': (
                'task_number',
                'title',
                'description',
                'status',
            )
        }),
        ('Участники', {
            'fields': (
                'created_by',
                'assigned_to_user',
                'assigned_to_contractor',
            )
        }),
        ('Организация', {
            'fields': (
                'company',
                'project',
            )
        }),
        ('Сроки', {
            'fields': (
                'created_at',
                'updated_at',
                'deadline',
                'completed_at',
            )
        }),
        ('Отклонение', {
            'fields': (
                'rejection_reason',
                'rejected_at',
            ),
            'classes': ('collapse',),
        }),
        ('Удаление', {
            'fields': (
                'is_deleted',
                'deleted_at',
            ),
            'classes': ('collapse',),
        }),
    )

    def status_badge(self, obj):
        """Отображает статус с цветным бейджем."""
        colors = {
            Task.STATUS_IN_PROGRESS: '#2196F3',
            Task.STATUS_COMPLETED: '#4CAF50',
            Task.STATUS_OVERDUE: '#ff9800',
            Task.STATUS_REJECTED: '#f44336',
        }
        color = colors.get(obj.status, '#666')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Статус'

    def assigned_to_display(self, obj):
        """Отображает исполнителя."""
        assignee = obj.assigned_to
        if assignee:
            return assignee.get_full_name()
        return '-'
    assigned_to_display.short_description = 'Исполнитель'

    def get_queryset(self, request):
        """Оптимизация запросов."""
        qs = super().get_queryset(request)
        return qs.select_related(
            'created_by',
            'assigned_to_user',
            'assigned_to_contractor',
            'company',
            'project'
        )
