from django.contrib import admin
from .models import Issue, IssuePhoto, IssueComment


class IssuePhotoInline(admin.TabularInline):
    """Inline admin for issue photos."""
    model = IssuePhoto
    extra = 0
    readonly_fields = ['created_at']


class IssueCommentInline(admin.TabularInline):
    """Inline admin for issue comments."""
    model = IssueComment
    extra = 0
    readonly_fields = ['created_at']


@admin.register(Issue)
class IssueAdmin(admin.ModelAdmin):
    """Admin interface for Issue model."""

    list_display = [
        'title', 'project', 'site', 'status', 'priority',
        'assigned_to', 'deadline', 'created_at'
    ]
    list_filter = ['status', 'priority', 'project', 'created_at']
    search_fields = ['title', 'description', 'location_notes']
    date_hierarchy = 'created_at'
    inlines = [IssuePhotoInline, IssueCommentInline]

    fieldsets = (
        ('Основная информация', {
            'fields': ('title', 'description', 'project', 'site', 'category')
        }),
        ('Статус и приоритет', {
            'fields': ('status', 'priority')
        }),
        ('Ответственные', {
            'fields': ('created_by', 'assigned_to', 'verified_by')
        }),
        ('Сроки', {
            'fields': ('deadline', 'completed_at')
        }),
        ('Дополнительная информация', {
            'fields': ('correction_technology', 'materials_used', 'location_notes')
        }),
    )

    readonly_fields = ['created_by', 'verified_by', 'completed_at']


@admin.register(IssuePhoto)
class IssuePhotoAdmin(admin.ModelAdmin):
    """Admin interface for IssuePhoto model."""

    list_display = ['get_photo_preview', 'issue', 'stage', 'get_image_format', 'get_file_size', 'uploaded_by', 'created_at']
    list_filter = ['stage', 'created_at']
    search_fields = ['issue__title', 'caption']
    date_hierarchy = 'created_at'
    readonly_fields = ['created_at', 'get_image_format', 'get_file_size', 'get_photo_preview_large']

    fieldsets = (
        ('Основная информация', {
            'fields': ('issue', 'stage', 'photo', 'caption')
        }),
        ('Превью изображения', {
            'fields': ('get_photo_preview_large',)
        }),
        ('Метаданные файла', {
            'fields': ('get_image_format', 'get_file_size')
        }),
        ('Информация о загрузке', {
            'fields': ('uploaded_by', 'created_at')
        }),
    )

    def get_photo_preview(self, obj):
        """
        Отображение миниатюры изображения в списке.
        """
        if obj.photo and hasattr(obj.photo, 'url'):
            from django.utils.html import format_html
            return format_html(
                '<img src="{}" style="max-width: 60px; max-height: 60px; border-radius: 4px;" />',
                obj.photo.url
            )
        return '-'

    get_photo_preview.short_description = 'Превью'

    def get_photo_preview_large(self, obj):
        """
        Отображение большого превью на странице редактирования.
        """
        if obj.photo and hasattr(obj.photo, 'url'):
            from django.utils.html import format_html
            return format_html(
                '<a href="{}" target="_blank">'
                '<img src="{}" style="max-width: 400px; max-height: 400px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />'
                '</a>',
                obj.photo.url,
                obj.photo.url
            )
        return '-'

    get_photo_preview_large.short_description = 'Изображение'

    def get_image_format(self, obj):
        """
        Отображение формата изображения.
        Определяет формат по расширению файла.
        """
        if obj.photo and hasattr(obj.photo, 'name'):
            import os
            # Получаем расширение файла
            file_extension = os.path.splitext(obj.photo.name)[1].lower()

            # Словарь соответствия расширений форматам
            format_map = {
                '.jpg': 'JPEG',
                '.jpeg': 'JPEG',
                '.png': 'PNG',
                '.webp': 'WebP',
                '.heic': 'HEIC',
                '.heif': 'HEIF',
                '.bmp': 'BMP',
                '.tiff': 'TIFF',
                '.tif': 'TIFF',
                '.gif': 'GIF'
            }

            # Возвращаем формат
            format_name = format_map.get(file_extension, file_extension.upper().replace('.', ''))

            # Добавляем цветовую индикацию для WebP (оптимизированный формат)
            if file_extension == '.webp':
                return f'✅ {format_name}'
            return format_name
        return '-'

    get_image_format.short_description = 'Формат'

    def get_file_size(self, obj):
        """
        Отображение размера файла в удобочитаемом формате.
        """
        if obj.photo and hasattr(obj.photo, 'size'):
            size_bytes = obj.photo.size
            # Форматируем размер файла
            if size_bytes < 1024:
                return f"{size_bytes} B"
            elif size_bytes < 1024 * 1024:
                size_kb = size_bytes / 1024
                return f"{size_kb:.1f} KB"
            elif size_bytes < 1024 * 1024 * 1024:
                size_mb = size_bytes / (1024 * 1024)
                return f"{size_mb:.2f} MB"
            else:
                size_gb = size_bytes / (1024 * 1024 * 1024)
                return f"{size_gb:.2f} GB"
        return "-"

    get_file_size.short_description = 'Размер'


@admin.register(IssueComment)
class IssueCommentAdmin(admin.ModelAdmin):
    """Admin interface for IssueComment model."""

    list_display = ['issue', 'author', 'created_at']
    list_filter = ['created_at']
    search_fields = ['issue__title', 'text', 'author__email']
    date_hierarchy = 'created_at'
    readonly_fields = ['created_at', 'updated_at']
