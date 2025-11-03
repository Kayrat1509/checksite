from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


class SoftDeleteMixin(models.Model):
    """
    Миксин для мягкого удаления объектов.
    Вместо физического удаления из БД, объекты помечаются как удаленные.
    """
    is_deleted = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name='Удалено'
    )
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name='Дата удаления'
    )
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(class)s_deleted',
        verbose_name='Удалил'
    )

    class Meta:
        abstract = True

    def soft_delete(self, user=None):
        """Помечает объект как удаленный"""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.deleted_by = user
        self.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])

    def restore(self):
        """Восстанавливает объект из корзины"""
        self.is_deleted = False
        self.deleted_at = None
        self.deleted_by = None
        self.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])

    @property
    def days_until_permanent_deletion(self):
        """Возвращает количество дней до окончательного удаления"""
        if not self.deleted_at:
            return None
        expiration_date = self.deleted_at + timedelta(days=31)
        days_left = (expiration_date - timezone.now()).days
        return max(0, days_left)


class SoftDeleteManager(models.Manager):
    """
    Менеджер, который по умолчанию исключает удаленные объекты из запросов.
    """
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)


class ButtonAccess(models.Model):
    """
    Унифицированная матрица доступа к кнопкам и страницам.
    Определяет, какие кнопки/страницы доступны для каждой роли.

    Логика:
    - Если default_access=True, элемент доступен всем ролям (галочки ролей игнорируются)
    - Если default_access=False, проверяется доступ по конкретным ролям
    - SUPERADMIN всегда имеет доступ ко всем элементам

    Типы доступа:
    - 'button': Настройка доступа к кнопкам (company должен быть NULL)
    - 'page': Настройка доступа к страницам (company должен быть NULL)

    ВАЖНО: Все настройки ГЛОБАЛЬНЫЕ (company=NULL).
    Логика с привязкой к компаниям НЕ ИСПОЛЬЗУЕТСЯ и будет удалена в будущем.
    """

    # Тип доступа и привязка к компании
    access_type = models.CharField(
        max_length=20,
        choices=[('button', 'Кнопка'), ('page', 'Страница')],
        default='button',
        verbose_name='Тип доступа',
        help_text='Кнопка или Страница (оба типа - глобальные настройки)'
    )
    company = models.ForeignKey(
        'users.Company',
        on_delete=models.CASCADE,
        related_name='access_controls',
        verbose_name='Компания',
        null=True,
        blank=True,
        help_text='DEPRECATED: Должно быть NULL. Все настройки - глобальные.'
    )

    # Основная информация о кнопке/странице
    page = models.CharField(
        max_length=100,
        verbose_name='Страница',
        help_text='Название страницы (projects, users, и т.д.)'
    )
    button_key = models.CharField(
        max_length=100,
        verbose_name='Ключ кнопки',
        help_text='Уникальный ключ кнопки (create, edit, delete, и т.д.) или "view" для страниц'
    )
    button_name = models.CharField(
        max_length=200,
        verbose_name='Название кнопки',
        help_text='Отображаемое название кнопки или страницы'
    )
    description = models.TextField(
        blank=True,
        verbose_name='Описание',
        help_text='Описание функционала кнопки или страницы'
    )

    # Доступ по умолчанию
    default_access = models.BooleanField(
        default=False,
        verbose_name='Доступ по умолчанию',
        help_text='Если отмечено, кнопка доступна всем ролям'
    )

    # Доступ для каждой роли (используется только если default_access=False)
    SUPERADMIN = models.BooleanField(default=True, verbose_name='Суперадмин')
    DIRECTOR = models.BooleanField(default=False, verbose_name='Директор')
    CHIEF_ENGINEER = models.BooleanField(default=False, verbose_name='Главный инженер')
    PROJECT_MANAGER = models.BooleanField(default=False, verbose_name='Руководитель проекта')
    ENGINEER = models.BooleanField(default=False, verbose_name='Инженер ПТО')
    SITE_MANAGER = models.BooleanField(default=False, verbose_name='Начальник участка')
    FOREMAN = models.BooleanField(default=False, verbose_name='Прораб')
    MASTER = models.BooleanField(default=False, verbose_name='Мастер')
    SUPERVISOR = models.BooleanField(default=False, verbose_name='Технадзор')
    CONTRACTOR = models.BooleanField(default=False, verbose_name='Подрядчик')
    OBSERVER = models.BooleanField(default=False, verbose_name='Наблюдатель')
    SUPPLY_MANAGER = models.BooleanField(default=False, verbose_name='Снабженец')
    WAREHOUSE_HEAD = models.BooleanField(default=False, verbose_name='Заведующий склада')
    SITE_WAREHOUSE_MANAGER = models.BooleanField(default=False, verbose_name='Завсклад объекта')

    # Метаданные
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создано')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлено')

    class Meta:
        # Уникальность:
        # ВСЕ записи (кнопки и страницы) должны иметь company=NULL
        # Уникальность определяется по: page + button_key
        constraints = [
            models.UniqueConstraint(
                fields=['page', 'button_key'],
                condition=models.Q(company__isnull=True),
                name='unique_global_access'
            ),
        ]
        verbose_name = 'Доступ к кнопке/странице'
        verbose_name_plural = 'Матрица доступа (кнопки и страницы)'
        ordering = ['access_type', 'page', 'button_key']
        db_table = 'core_button_access'
        indexes = [
            models.Index(fields=['access_type', 'page']),
            models.Index(fields=['company', 'page']),
        ]

    def __str__(self):
        return f"{self.page} - {self.button_name} ({self.button_key})"

    def has_access(self, role: str) -> bool:
        """
        Проверяет, имеет ли роль доступ к этой кнопке.

        Args:
            role: Название роли пользователя

        Returns:
            True если доступ есть, False если нет
        """
        # SUPERADMIN всегда имеет доступ
        if role == 'SUPERADMIN':
            return True

        # Если доступ по умолчанию включен, кнопка доступна всем
        if self.default_access:
            return True

        # Проверяем доступ для конкретной роли
        return getattr(self, role, False)

    def get_accessible_roles(self) -> list:
        """
        Возвращает список ролей, имеющих доступ к этой кнопке.

        Returns:
            Список названий ролей
        """
        if self.default_access:
            return ['ALL']

        roles = []
        role_fields = [
            'SUPERADMIN', 'DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER',
            'ENGINEER', 'SITE_MANAGER', 'FOREMAN', 'MASTER',
            'SUPERVISOR', 'CONTRACTOR', 'OBSERVER', 'SUPPLY_MANAGER',
            'WAREHOUSE_HEAD', 'SITE_WAREHOUSE_MANAGER'
        ]

        for role in role_fields:
            if getattr(self, role, False):
                roles.append(role)

        return roles
