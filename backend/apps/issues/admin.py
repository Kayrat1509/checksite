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

    list_display = ['issue', 'stage', 'uploaded_by', 'created_at']
    list_filter = ['stage', 'created_at']
    search_fields = ['issue__title', 'caption']
    date_hierarchy = 'created_at'


@admin.register(IssueComment)
class IssueCommentAdmin(admin.ModelAdmin):
    """Admin interface for IssueComment model."""

    list_display = ['issue', 'author', 'created_at']
    list_filter = ['created_at']
    search_fields = ['issue__title', 'text', 'author__email']
    date_hierarchy = 'created_at'
    readonly_fields = ['created_at', 'updated_at']
