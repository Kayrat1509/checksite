from django.contrib import admin
from .models import Project, Site, Category, Drawing


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    """Admin interface for Project model."""

    list_display = ['name', 'company', 'customer', 'project_manager', 'is_active', 'created_at']
    list_filter = ['company', 'is_active', 'created_at', 'start_date']
    search_fields = ['name', 'address', 'customer', 'company__name']
    filter_horizontal = ['team_members']
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Основная информация', {
            'fields': ('company', 'name', 'address', 'customer', 'description')
        }),
        ('Даты', {
            'fields': ('start_date', 'end_date')
        }),
        ('Ответственные', {
            'fields': ('project_manager', 'team_members')
        }),
        ('Статус', {
            'fields': ('is_active',)
        }),
    )


@admin.register(Site)
class SiteAdmin(admin.ModelAdmin):
    """Admin interface for Site model."""

    list_display = ['name', 'project', 'site_manager', 'is_active', 'created_at']
    list_filter = ['is_active', 'project', 'created_at']
    search_fields = ['name', 'description', 'project__name']
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Основная информация', {
            'fields': ('project', 'name', 'description')
        }),
        ('Геолокация', {
            'fields': ('latitude', 'longitude')
        }),
        ('Ответственные', {
            'fields': ('site_manager',)
        }),
        ('Статус', {
            'fields': ('is_active',)
        }),
    )


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    """Admin interface for Category model."""

    list_display = ['name', 'color', 'created_at']
    search_fields = ['name', 'description']
    date_hierarchy = 'created_at'


@admin.register(Drawing)
class DrawingAdmin(admin.ModelAdmin):
    """Admin interface for Drawing model."""

    list_display = ['file_name', 'project', 'uploaded_by', 'get_file_size', 'created_at']
    list_filter = ['project', 'created_at']
    search_fields = ['file_name', 'project__name']
    date_hierarchy = 'created_at'
    readonly_fields = ['created_at', 'updated_at', 'get_file_size']

    def get_file_size(self, obj):
        """Отображение размера файла в удобочитаемом формате."""
        if obj.file and hasattr(obj.file, 'size'):
            size_bytes = obj.file.size
            # Форматируем размер файла
            if size_bytes < 1024:
                return f"{size_bytes} B"
            elif size_bytes < 1024 * 1024:
                size_kb = size_bytes / 1024
                return f"{size_kb:.2f} KB"
            elif size_bytes < 1024 * 1024 * 1024:
                size_mb = size_bytes / (1024 * 1024)
                return f"{size_mb:.2f} MB"
            else:
                size_gb = size_bytes / (1024 * 1024 * 1024)
                return f"{size_gb:.2f} GB"
        return "-"

    get_file_size.short_description = 'Размер файла'
