from django.contrib import admin
from django.shortcuts import render, redirect
from django.urls import path, reverse
from django.contrib import messages
from .models import PageAccess
from apps.users.models import Company


@admin.register(PageAccess)
class PageAccessAdmin(admin.ModelAdmin):
    """
    Административная панель для управления матрицей доступа к страницам.
    Использует custom template для отображения таблицы-матрицы.
    """

    # Используем кастомный шаблон для списка
    change_list_template = "admin/page_access_change_list.html"

    list_display = ['company', 'page', 'role', 'has_access', 'updated_at']
    list_filter = ['company', 'page', 'role', 'has_access']
    search_fields = ['company__name', 'page', 'role']
    ordering = ['company', 'page', 'role']

    def get_queryset(self, request):
        """Оптимизация запроса с предзагрузкой company."""
        queryset = super().get_queryset(request)
        return queryset.select_related('company')

    def get_urls(self):
        """Добавляем custom URLs для сохранения матрицы."""
        urls = super().get_urls()
        custom_urls = [
            path(
                'save-matrix/',
                self.admin_site.admin_view(self.save_matrix_view),
                name='settings_save_page_access_matrix'
            ),
        ]
        return custom_urls + urls

    def changelist_view(self, request, extra_context=None):
        """
        Переопределяем стандартный changelist_view для отображения матрицы.
        """
        # Получаем матрицу доступа из первой компании (шаблон для всех)
        # Если компаний нет, используем пустую матрицу
        access_matrix = {}
        first_company = Company.objects.first()

        if first_company:
            # Получаем все записи доступа для первой компании как шаблон
            accesses = PageAccess.objects.filter(company=first_company)

            # Формируем матрицу доступа: {page_key: {role_key: has_access}}
            for access in accesses:
                if access.page not in access_matrix:
                    access_matrix[access.page] = {}
                access_matrix[access.page][access.role] = access.has_access

        # Все возможные страницы
        pages = [
            (choice[0], choice[1]) for choice in PageAccess.PageChoices.choices
        ]

        # Все возможные роли
        roles = [
            (choice[0], choice[1]) for choice in PageAccess.RoleChoices.choices
        ]

        extra_context = extra_context or {}
        extra_context.update({
            'pages': pages,
            'roles': roles,
            'access_matrix': access_matrix,
            'total_pages': len(pages),
        })

        return super().changelist_view(request, extra_context=extra_context)

    def save_matrix_view(self, request):
        """
        Обработка сохранения матрицы доступа для всех компаний.
        """
        if request.method != 'POST':
            return redirect('admin:settings_pageaccess_changelist')

        # Получаем все компании
        companies = Company.objects.all()

        if not companies.exists():
            messages.warning(request, 'В системе нет компаний')
            return redirect('admin:settings_pageaccess_changelist')

        # Получаем все возможные страницы и роли
        all_pages = [choice[0] for choice in PageAccess.PageChoices.choices]
        all_roles = [choice[0] for choice in PageAccess.RoleChoices.choices]

        updated_count = 0
        created_count = 0

        # Применяем изменения ко всем компаниям
        for company in companies:
            # Проходим по всем комбинациям страница-роль
            for page_key in all_pages:
                for role_key in all_roles:
                    checkbox_name = f'access_{page_key}_{role_key}'
                    has_access = checkbox_name in request.POST

                    # Получаем или создаем запись
                    access_obj, created = PageAccess.objects.get_or_create(
                        company=company,
                        page=page_key,
                        role=role_key,
                        defaults={'has_access': has_access}
                    )

                    if created:
                        created_count += 1
                    else:
                        # Обновляем только если значение изменилось
                        if access_obj.has_access != has_access:
                            access_obj.has_access = has_access
                            access_obj.save()
                            updated_count += 1

        message = f'Матрица доступа обновлена для всех компаний ({companies.count()} шт.)!'
        if created_count > 0:
            message += f' Создано записей: {created_count}.'
        if updated_count > 0:
            message += f' Обновлено записей: {updated_count}.'
        message += ' Пользователи увидят изменения в течение 10 секунд (или при переходе на другую вкладку).'

        messages.success(request, message)
        url = reverse('admin:settings_pageaccess_changelist')
        return redirect(f'{url}?saved=1')
