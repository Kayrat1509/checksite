from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html
import json
from .models import User, Company


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    """Admin interface for Company model."""

    list_display = ['name', 'country', 'phone', 'email', 'get_storage_size', 'is_active', 'created_at']
    list_filter = ['country', 'is_active', 'created_at']
    search_fields = ['name', 'country', 'email', 'phone']
    ordering = ['name']

    fieldsets = (
        (_('Основная информация'), {
            'fields': ('name', 'country', 'address', 'phone', 'email'),
            'description': 'Укажите полное название компании с организационно-правовой формой (например: ТОО "СтройКомпани", LLC "BuildCorp")'
        }),
        (_('Статус'), {
            'fields': ('is_active',)
        }),
        (_('Статистика'), {
            'fields': ('get_storage_size',),
            'classes': ('collapse',)
        }),
        (_('Даты'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    readonly_fields = ['created_at', 'updated_at', 'get_storage_size']

    def get_storage_size(self, obj):
        """Отображение общего размера занятого хранилища компании."""
        return obj.get_formatted_storage_size()
    get_storage_size.short_description = 'Занято места'


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin interface for User model."""

    list_display = [
        'email', 'get_full_name', 'role', 'get_company_display',
        'position', 'external_company_name',
        'approved', 'is_active', 'created_at'
    ]
    list_filter = [
        'role', 'company', 'approved', 'is_active', 'is_staff',
        'password_change_required', 'created_at'
    ]
    search_fields = ['email', 'first_name', 'last_name', 'phone', 'external_company_name', 'supervision_company']
    ordering = ['-created_at']
    list_editable = ['approved']

    fieldsets = (
        (None, {'fields': ('email', 'password', 'external_company_name')}),
        (_('Персональная информация'), {
            'fields': ('first_name', 'last_name', 'middle_name', 'phone', 'avatar')
        }),
        (_('Роль и должность'), {
            'fields': ('role', 'position', 'company', 'supervision_company', 'secondary_email', 'telegram_id'),
            'description': 'Для сотрудников заказчика используйте поле "Компания". Для подрядчиков и надзоров используйте поле "Название сторонней компании".'
        }),
        (_('Временный пароль'), {
            'fields': (
                'temp_password', 'password_change_required',
                'login_attempts_with_temp_password', 'temp_password_created_at',
                'display_password_history'
            ),
            'classes': ('collapse',),
            'description': 'Информация о временном пароле и истории изменений'
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
                'middle_name', 'role', 'position', 'company', 'external_company_name', 'supervision_company', 'phone'
            ),
        }),
    )

    readonly_fields = [
        'created_at', 'updated_at', 'last_login', 'temp_password',
        'login_attempts_with_temp_password', 'temp_password_created_at',
        'display_password_history'
    ]

    def get_company_display(self, obj):
        """Отображение компании: ForeignKey для сотрудников, текстовое поле для подрядчиков/надзоров."""
        if obj.external_company_name:
            return obj.external_company_name
        elif obj.company:
            return obj.company.name
        return '-'
    get_company_display.short_description = 'Компания'

    def get_temp_password_status(self, obj):
        """
        Отображение статуса временного пароля в списке пользователей.
        """
        if not obj.password_change_required:
            return format_html('<span style="color: green;">✓ Постоянный</span>')

        attempts_left = 3 - obj.login_attempts_with_temp_password

        if attempts_left <= 0:
            return format_html('<span style="color: red;">🔒 Заблокирован</span>')
        elif attempts_left == 1:
            return format_html(
                '<span style="color: orange;">⚠️ Временный ({} попытка)</span>',
                attempts_left
            )
        else:
            return format_html(
                '<span style="color: blue;">🔑 Временный ({} попытки)</span>',
                attempts_left
            )
    get_temp_password_status.short_description = 'Статус пароля'

    def get_password_display(self, obj):
        """
        Отображение статуса отправки пароля на email.

        Логика:
        - Если password_change_required=True и temp_password задан:
          - Проверяем наличие email
          - Если email есть → "✓ Отправлено" (зеленый)
          - Если email нет или пустой → "✗ Не доставлено" (красный)
        - Если password_change_required=True и temp_password не задан → "❌ Не задан"
        - Если password_change_required=False → "✓ Изменён пользователем" (синий)
        """
        if obj.password_change_required and obj.temp_password:
            # Временный пароль задан - проверяем наличие email
            if obj.email and obj.email.strip():
                # Email существует - пароль отправлен
                return format_html(
                    '<span style="color: #28a745; font-weight: 500;">✓ Отправлено</span>'
                )
            else:
                # Email не существует - письмо не доставлено
                return format_html(
                    '<span style="color: #dc3545; font-weight: 500;">✗ Не доставлено</span>'
                )
        elif obj.password_change_required and not obj.temp_password:
            # Требуется смена пароля, но временный пароль не задан
            return format_html('<span style="color: red;">❌ Не задан</span>')
        else:
            # Постоянный пароль - пользователь уже изменил
            return format_html(
                '<span style="color: #007bff; font-weight: 500;">✓ Изменён пользователем</span>'
            )
    get_password_display.short_description = 'Пароль'

    def display_password_history(self, obj):
        """
        Отображение истории паролей в удобном формате.
        """
        if not obj.password_history:
            return format_html('<p>История пуста</p>')

        html = '<table style="width: 100%; border-collapse: collapse;">'
        html += '<tr style="background-color: #f0f0f0;"><th style="padding: 8px; text-align: left;">Дата</th><th style="padding: 8px; text-align: left;">Действие</th><th style="padding: 8px; text-align: left;">Детали</th><th style="padding: 8px; text-align: left;">Временный пароль</th></tr>'

        for idx, entry in enumerate(reversed(obj.password_history)):
            bg_color = '#ffffff' if idx % 2 == 0 else '#f9f9f9'

            action_icons = {
                'created': '➕',
                'changed': '🔄',
                'reset': '🔃'
            }
            icon = action_icons.get(entry.get('action', ''), '•')

            html += f'<tr style="background-color: {bg_color};">'
            html += f'<td style="padding: 8px;">{entry.get("date", "N/A")}</td>'
            html += f'<td style="padding: 8px;">{icon} {entry.get("action", "N/A")}</td>'
            html += f'<td style="padding: 8px;">{entry.get("details", "")}</td>'

            temp_pass = entry.get('temp_password_used', '')
            if temp_pass:
                html += f'<td style="padding: 8px;"><code style="background-color: #fff3cd; padding: 2px 6px; border-radius: 3px;">{temp_pass}</code></td>'
            else:
                html += '<td style="padding: 8px;">-</td>'

            html += '</tr>'

        html += '</table>'

        return format_html(html)
    display_password_history.short_description = 'История паролей'

    actions = ['reset_temp_password_attempts']

    def reset_temp_password_attempts(self, request, queryset):
        """
        Сброс счетчика попыток входа с временным паролем.
        """
        updated = queryset.filter(password_change_required=True).update(
            login_attempts_with_temp_password=0
        )
        self.message_user(
            request,
            f'Счетчик попыток сброшен для {updated} пользователей'
        )
    reset_temp_password_attempts.short_description = 'Сбросить счетчик попыток входа'
