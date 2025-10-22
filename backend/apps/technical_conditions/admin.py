from django.contrib import admin
from .models import TechnicalCondition


@admin.register(TechnicalCondition)
class TechnicalConditionAdmin(admin.ModelAdmin):
    """Admin interface for TechnicalCondition model."""

    list_display = ['received_from', 'project', 'get_company', 'created_by', 'created_at']
    list_filter = ['project', 'received_from', 'created_at']
    search_fields = ['received_from', 'description', 'project__name', 'project__company__name']
    date_hierarchy = 'created_at'
    readonly_fields = ['created_at', 'updated_at']
    autocomplete_fields = ['project']  # Для удобного выбора проекта через поиск

    fieldsets = (
        ('Основная информация', {
            'fields': ('file', 'project', 'received_from', 'description')
        }),
        ('Информация о создании', {
            'fields': ('created_by', 'created_at', 'updated_at')
        }),
    )

    def get_company(self, obj):
        """Отображает компанию через проект."""
        if obj.project and obj.project.company:
            return obj.project.company.name
        return '-'
    get_company.short_description = 'Компания'
    get_company.admin_order_field = 'project__company__name'  # Позволяет сортировать по этому полю
