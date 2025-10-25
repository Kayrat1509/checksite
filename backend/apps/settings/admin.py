from django.contrib import admin
from .models import PageAccess


@admin.register(PageAccess)
class PageAccessAdmin(admin.ModelAdmin):
    """Административная панель для управления доступом к страницам."""

    list_display = ['company', 'page', 'role', 'has_access', 'updated_at']
    list_filter = ['company', 'page', 'role', 'has_access']
    search_fields = ['company__name', 'page', 'role']
    list_editable = ['has_access']
    ordering = ['company', 'page', 'role']
    autocomplete_fields = ['company']

    def get_queryset(self, request):
        """Оптимизация запроса с предзагрузкой company."""
        queryset = super().get_queryset(request)
        return queryset.select_related('company')
