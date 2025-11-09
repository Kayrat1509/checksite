from django.contrib import admin
from django.utils.html import format_html
from django.shortcuts import render, redirect
from django.urls import path, reverse
from django.contrib import messages
from .models import ButtonAccess


@admin.register(ButtonAccess)
class ButtonAccessAdmin(admin.ModelAdmin):
    """
    Админ-панель для управления матрицей доступа к кнопкам.
    Использует custom template для отображения таблицы-матрицы.
    """

    # Используем кастомный шаблон для списка
    change_list_template = "admin/button_access_change_list.html"

    list_display = (
        'access_type_display',
        'company_display',
        'page',
        'button_key',
        'button_name',
        'default_access_display',
        'show_roles_access',
        'updated_at'
    )

    list_filter = (
        'access_type',
        'page',
        'company',
        'default_access',
        'DIRECTOR',
        'CHIEF_ENGINEER',
        'PROJECT_MANAGER',
        'CHIEF_POWER_ENGINEER',  # Новая роль: Главный энергетик
        'POWER_ENGINEER'  # Новая роль: Энергетик
    )

    search_fields = (
        'button_name',
        'button_key',
        'page',
        'description'
    )

    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        ('Основная информация', {
            'fields': (
                'access_type',
                'company',
                'page',
                'button_key',
                'button_name',
                'description',
                'default_access'
            ),
            'description': 'Основные параметры элемента и его идентификаторы. Для кнопок company должен быть NULL (глобальная настройка), для страниц - обязательно указывается компания.'
        }),
        ('Доступ для руководства', {
            'fields': (
                'DIRECTOR',
                'CHIEF_ENGINEER',
                'PROJECT_MANAGER',
                'CHIEF_POWER_ENGINEER',  # Новая роль: Главный энергетик
            ),
            'description': 'Если "Доступ по умолчанию" включен, эти настройки игнорируются'
        }),
        ('Доступ для ИТР (инженерно-технических работников)', {
            'fields': (
                'ENGINEER',
                'SITE_MANAGER',
                'FOREMAN',
                'POWER_ENGINEER',  # Новая роль: Энергетик
                'MASTER',
            ),
        }),
        ('Доступ для надзора и подрядчиков', {
            'fields': (
                'SUPERVISOR',
                'CONTRACTOR',
                'OBSERVER',
            ),
        }),
        ('Доступ для склада и снабжения', {
            'fields': (
                'SUPPLY_MANAGER',
                'WAREHOUSE_HEAD',
                'SITE_WAREHOUSE_MANAGER',
            ),
        }),
        ('Метаданные', {
            'fields': (
                'created_at',
                'updated_at',
            ),
            'classes': ('collapse',),
        }),
    )

    def access_type_display(self, obj):
        """Отображение типа доступа"""
        if obj.access_type == 'button':
            return format_html(
                '<span style="color: blue;">🔘 Кнопка</span>'
            )
        else:
            return format_html(
                '<span style="color: green;">📄 Страница</span>'
            )
    access_type_display.short_description = 'Тип'

    def company_display(self, obj):
        """Отображение компании"""
        if obj.company:
            return format_html(
                '<span>{}</span>',
                obj.company.name
            )
        return format_html(
            '<span style="color: gray; font-style: italic;">— Глобально —</span>'
        )
    company_display.short_description = 'Компания'

    def default_access_display(self, obj):
        """Отображение статуса доступа по умолчанию с визуальным индикатором"""
        if obj.default_access:
            return format_html(
                '<span style="color: green; font-weight: bold;">✓ Всем ролям</span>'
            )
        return format_html(
            '<span style="color: gray;">✗ По ролям</span>'
        )
    default_access_display.short_description = 'Доступ по умолчанию'

    def show_roles_access(self, obj):
        """Показывает список ролей с доступом к кнопке"""
        if obj.default_access:
            return format_html(
                '<span style="color: green; font-weight: bold;">✅ Все роли</span>'
            )

        role_names = {
            'SUPERADMIN': 'Суперадмин',
            'DIRECTOR': 'Директор',
            'CHIEF_ENGINEER': 'Гл.инженер',
            'PROJECT_MANAGER': 'Рук.проекта',
            'CHIEF_POWER_ENGINEER': 'Гл.энергетик',  # Новая роль
            'ENGINEER': 'Инженер ПТО',
            'SITE_MANAGER': 'Нач.участка',
            'FOREMAN': 'Прораб',
            'POWER_ENGINEER': 'Энергетик',  # Новая роль
            'MASTER': 'Мастер',
            'SUPERVISOR': 'Технадзор',
            'CONTRACTOR': 'Подрядчик',
            'OBSERVER': 'Наблюдатель',
            'SUPPLY_MANAGER': 'Снабженец',
            'WAREHOUSE_HEAD': 'Зав.склада',
            'SITE_WAREHOUSE_MANAGER': 'Завсклад объекта',
        }

        roles = []
        for role_key, role_name in role_names.items():
            if getattr(obj, role_key, False):
                roles.append(role_name)

        if not roles:
            return format_html(
                '<span style="color: red;">❌ Нет доступа</span>'
            )

        roles_html = ', '.join(roles)
        return format_html(
            '<span style="color: blue;">{}</span>',
            roles_html
        )

    show_roles_access.short_description = 'Роли с доступом'

    def save_model(self, request, obj, form, change):
        """Логирование изменений при сохранении"""
        if change:
            # При изменении существующей записи
            print(f"[ButtonAccess] Обновлено: {obj.page} - {obj.button_name}")
        else:
            # При создании новой записи
            print(f"[ButtonAccess] Создано: {obj.page} - {obj.button_name}")

        super().save_model(request, obj, form, change)

    def get_urls(self):
        """Добавляем custom URLs для сохранения матрицы"""
        urls = super().get_urls()
        custom_urls = [
            path('save-matrix/', self.admin_site.admin_view(self.save_matrix_view), name='button_access_save_matrix'),
        ]
        return custom_urls + urls

    def changelist_view(self, request, extra_context=None):
        """
        Переопределяем стандартный changelist_view для отображения матрицы.
        Поддерживает кнопки и страницы (глобальные настройки для всех компаний).
        """
        # Получаем все элементы доступа (только глобальные)
        all_items = ButtonAccess.objects.filter(
            company__isnull=True
        ).order_by('access_type', 'page', 'button_key')

        # Разделяем на кнопки и страницы
        buttons = all_items.filter(access_type='button')
        pages_access = all_items.filter(access_type='page')

        # Группируем кнопки по страницам
        buttons_by_page = {}
        all_pages_set = set()
        for button in buttons:
            if button.page not in buttons_by_page:
                buttons_by_page[button.page] = []
            buttons_by_page[button.page].append(button)
            all_pages_set.add(button.page)

        # Группируем страницы (аналогично кнопкам, но в отдельную переменную)
        pages_list = list(pages_access)

        # Роли для отображения (без SUPERADMIN)
        roles = [
            ('DIRECTOR', 'Директор'),
            ('CHIEF_ENGINEER', 'Гл.инженер'),
            ('PROJECT_MANAGER', 'Рук.проекта'),
            ('CHIEF_POWER_ENGINEER', 'Гл.энергетик'),  # Новая роль
            ('ENGINEER', 'Инженер ПТО'),
            ('SITE_MANAGER', 'Нач.участка'),
            ('FOREMAN', 'Прораб'),
            ('POWER_ENGINEER', 'Энергетик'),  # Новая роль
            ('MASTER', 'Мастер'),
            ('SUPERVISOR', 'Технадзор'),
            ('CONTRACTOR', 'Подрядчик'),
            ('OBSERVER', 'Наблюдатель'),
            ('SUPPLY_MANAGER', 'Снабженец'),
            ('WAREHOUSE_HEAD', 'Зав.склада'),
            ('SITE_WAREHOUSE_MANAGER', 'Завсклад объекта'),
        ]

        extra_context = extra_context or {}
        extra_context.update({
            'buttons_by_page': buttons_by_page,
            'pages_list': pages_list,  # Простой список страниц (глобальные настройки)
            'roles': roles,
            'all_pages': sorted(all_pages_set),
            'total_buttons': buttons.count(),
            'total_pages': pages_access.count(),
            'total_items': all_items.count(),
        })

        return super().changelist_view(request, extra_context=extra_context)

    def save_matrix_view(self, request):
        """
        Обработка сохранения матрицы доступа.
        """
        if request.method != 'POST':
            return redirect('admin:core_buttonaccess_changelist')

        # Получаем все кнопки
        all_buttons = ButtonAccess.objects.all()

        # Список всех ролей (включая новые роли энергетиков)
        all_roles = [
            'DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'CHIEF_POWER_ENGINEER',
            'ENGINEER', 'SITE_MANAGER', 'FOREMAN', 'POWER_ENGINEER',
            'MASTER', 'SUPERVISOR', 'CONTRACTOR', 'OBSERVER', 'SUPPLY_MANAGER',
            'WAREHOUSE_HEAD', 'SITE_WAREHOUSE_MANAGER'
        ]

        # Собираем данные из POST
        updated_count = 0

        for button in all_buttons:
            button_changed = False

            for role in all_roles:
                checkbox_name = f'button_{button.id}_{role}'
                new_value = checkbox_name in request.POST

                # Проверяем, изменилось ли значение
                old_value = getattr(button, role, False)
                if old_value != new_value:
                    setattr(button, role, new_value)
                    button_changed = True

            if button_changed:
                button.save()
                updated_count += 1

        message = f'Матрица доступа обновлена! Изменено кнопок: {updated_count}.'
        message += ' Пользователи увидят изменения в течение 10 секунд (или при переходе на другую вкладку).'
        messages.success(request, message)
        url = reverse('admin:core_buttonaccess_changelist')
        return redirect(f'{url}?saved=1')

    class Meta:
        verbose_name = 'Доступ к кнопке'
        verbose_name_plural = 'Матрица доступа к кнопкам'
