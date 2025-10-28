from django.db import models
from django.utils.translation import gettext_lazy as _


class RoleTemplate(models.Model):
    """
    Модель для хранения шаблонов ролей с преднастроенными доступами к страницам.
    Позволяет быстро применять готовые наборы прав доступа к пользователям.
    """

    company = models.ForeignKey(
        'users.Company',
        on_delete=models.CASCADE,
        related_name='role_templates',
        verbose_name=_('Компания'),
        help_text=_('Компания, для которой создан шаблон')
    )
    name = models.CharField(
        _('Название шаблона'),
        max_length=100,
        help_text=_('Например: "Прораб стандарт", "Мастер ограниченный"')
    )
    role = models.CharField(
        _('Роль'),
        max_length=50,
        help_text=_('Роль пользователя, для которой предназначен шаблон')
    )
    description = models.TextField(
        _('Описание'),
        blank=True,
        help_text=_('Описание шаблона и его назначения')
    )
    allowed_pages = models.JSONField(
        _('Разрешенные страницы'),
        default=list,
        help_text=_('Список slug страниц, доступных по этому шаблону')
    )
    is_default = models.BooleanField(
        _('Шаблон по умолчанию'),
        default=False,
        help_text=_('Применяется автоматически при создании пользователя с этой ролью')
    )

    created_at = models.DateTimeField(_('Дата создания'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Дата обновления'), auto_now=True)

    class Meta:
        verbose_name = _('Шаблон роли')
        verbose_name_plural = _('Шаблоны ролей')
        unique_together = ['company', 'name']
        ordering = ['company', 'role', 'name']
        indexes = [
            models.Index(fields=['company', 'role']),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.name} ({self.role})"

    def apply_to_user(self, user):
        """
        Применить шаблон к пользователю.
        Удаляет существующие права доступа и создает новые из шаблона.

        Args:
            user: Пользователь, к которому применяется шаблон
        """
        # Удаляем существующие права доступа для роли пользователя
        PageAccess.objects.filter(
            company=user.company,
            role=user.role
        ).delete()

        # Создаем новые права доступа из шаблона
        for page in self.allowed_pages:
            PageAccess.objects.create(
                company=user.company,
                role=user.role,
                page=page,
                has_access=True
            )


class PageAccess(models.Model):
    """
    Модель для хранения матрицы доступа к страницам системы.
    Определяет, какие роли имеют доступ к определенным страницам для каждой компании.
    Каждая компания может индивидуально настраивать доступ к страницам для своих сотрудников.
    """

    # Выбор страниц системы
    class PageChoices(models.TextChoices):
        DASHBOARD = 'dashboard', _('Дашборд')
        PROJECTS = 'projects', _('Проекты')
        ISSUES = 'issues', _('Замечания')
        USERS = 'users', _('Сотрудники')
        CONTRACTORS = 'contractors', _('Подрядчики')
        SUPERVISIONS = 'supervisions', _('Надзоры')
        TECHNICAL_CONDITIONS = 'technical-conditions', _('Техусловия')
        MATERIAL_REQUESTS = 'material-requests', _('Заявки')
        WAREHOUSE = 'warehouse', _('Склад')
        TENDERS = 'tenders', _('Тендеры')
        REPORTS = 'reports', _('Отчеты')
        PROFILE = 'profile', _('Профиль')
        SETTINGS = 'settings', _('Настройки')

    # Выбор ролей (без SUPERADMIN, т.к. он имеет доступ ко всему)
    class RoleChoices(models.TextChoices):
        DIRECTOR = 'DIRECTOR', _('Директор')
        CHIEF_ENGINEER = 'CHIEF_ENGINEER', _('Гл.инженер')
        PROJECT_MANAGER = 'PROJECT_MANAGER', _('Рук.проекта')
        ENGINEER = 'ENGINEER', _('Инженер ПТО')
        SITE_MANAGER = 'SITE_MANAGER', _('Нач.участка')
        FOREMAN = 'FOREMAN', _('Прораб')
        MASTER = 'MASTER', _('Мастер')
        SUPERVISOR = 'SUPERVISOR', _('Технадзор')
        CONTRACTOR = 'CONTRACTOR', _('Подрядчик')
        OBSERVER = 'OBSERVER', _('Наблюдатель')
        SUPPLY_MANAGER = 'SUPPLY_MANAGER', _('Снабженец')
        WAREHOUSE_HEAD = 'WAREHOUSE_HEAD', _('Зав.склада')
        SITE_WAREHOUSE_MANAGER = 'SITE_WAREHOUSE_MANAGER', _('Завсклад объекта')

    company = models.ForeignKey(
        'users.Company',
        on_delete=models.CASCADE,
        related_name='page_access_settings',
        verbose_name=_('Компания'),
        help_text=_('Компания, для которой настраивается доступ')
    )
    page = models.CharField(
        max_length=50,
        choices=PageChoices.choices,
        verbose_name=_('Страница')
    )
    role = models.CharField(
        max_length=50,
        choices=RoleChoices.choices,
        verbose_name=_('Роль')
    )
    has_access = models.BooleanField(
        default=False,
        verbose_name=_('Есть доступ')
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Дата создания'))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('Дата обновления'))

    class Meta:
        verbose_name = _('Доступ к странице')
        verbose_name_plural = _('Матрица доступа')
        unique_together = ['company', 'page', 'role']
        ordering = ['company', 'page', 'role']
        indexes = [
            models.Index(fields=['company', 'page', 'role']),
            models.Index(fields=['company']),
        ]

    def __str__(self):
        access_status = "Разрешен" if self.has_access else "Запрещен"
        return f"{self.company.name} - {self.get_page_display()} - {self.get_role_display()}: {access_status}"
