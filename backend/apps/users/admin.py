from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User, Company


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    """Admin interface for Company model."""

    list_display = ['legal_form', 'name', 'country', 'phone', 'email', 'is_active', 'created_at']
    list_filter = ['legal_form', 'country', 'is_active', 'created_at']
    search_fields = ['name', 'country', 'email', 'phone']
    ordering = ['name']

    fieldsets = (
        (_('Основная информация'), {
            'fields': ('legal_form', 'name', 'country', 'address', 'phone', 'email')
        }),
        (_('Статус'), {
            'fields': ('is_active',)
        }),
        (_('Даты'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    readonly_fields = ['created_at', 'updated_at']


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin interface for User model."""

    list_display = ['email', 'get_full_name', 'role', 'company', 'position', 'temp_password', 'approved', 'is_active', 'created_at']
    list_filter = ['role', 'company', 'approved', 'is_active', 'is_staff', 'created_at']
    search_fields = ['email', 'first_name', 'last_name', 'phone']
    ordering = ['-created_at']
    list_editable = ['approved']

    fieldsets = (
        (None, {'fields': ('email', 'password', 'temp_password')}),
        (_('Персональная информация'), {
            'fields': ('first_name', 'last_name', 'middle_name', 'phone', 'avatar')
        }),
        (_('Роль и должность'), {
            'fields': ('role', 'position', 'company', 'secondary_email', 'telegram_id')
        }),
        (_('Права доступа'), {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'is_verified', 'approved', 'groups', 'user_permissions'),
        }),
        (_('Важные даты'), {'fields': ('last_login', 'created_at', 'updated_at')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'email', 'password1', 'password2', 'first_name', 'last_name',
                'middle_name', 'role', 'position', 'company', 'phone'
            ),
        }),
    )

    readonly_fields = ['created_at', 'updated_at', 'last_login', 'temp_password']
