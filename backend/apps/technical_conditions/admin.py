from django.contrib import admin
from .models import TechnicalCondition


@admin.register(TechnicalCondition)
class TechnicalConditionAdmin(admin.ModelAdmin):
    """Admin interface for TechnicalCondition model."""

    list_display = ['received_from', 'created_by', 'created_at']
    list_filter = ['received_from', 'created_at']
    search_fields = ['received_from', 'description']
    date_hierarchy = 'created_at'
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Основная информация', {
            'fields': ('file', 'received_from', 'description')
        }),
        ('Информация о создании', {
            'fields': ('created_by', 'created_at', 'updated_at')
        }),
    )
