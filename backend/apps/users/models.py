from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _


class Company(models.Model):
    """Model for companies/organizations."""

    name = models.CharField(
        _('Название компании'),
        max_length=255,
        help_text=_('Укажите полное название компании с организационно-правовой формой (например: ТОО "СтройКомпани", LLC "BuildCorp")')
    )
    country = models.CharField(_('Страна'), max_length=100, blank=True)
    address = models.TextField(_('Адрес'), blank=True)
    phone = models.CharField(_('Телефон'), max_length=20, blank=True)
    email = models.EmailField(_('Email'), blank=True)

    is_active = models.BooleanField(_('Активна'), default=True)

    created_at = models.DateTimeField(_('Создана'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Обновлена'), auto_now=True)

    class Meta:
        verbose_name = _('Компания')
        verbose_name_plural = _('Компании')
        ordering = ['name']

    def __str__(self):
        # Возвращаем только название компании без ОПФ
        return self.name

    def get_total_storage_size(self):
        """
        Вычисляет общий размер всех файлов, связанных с компанией.

        Включает:
        - Аватары пользователей компании
        - Чертежи проектов компании
        - Фото замечаний в проектах компании

        Возвращает размер в байтах.
        """
        total_size = 0

        # 1. Размер аватаров пользователей компании
        for user in self.users.all():
            if user.avatar and hasattr(user.avatar, 'size'):
                try:
                    total_size += user.avatar.size
                except (FileNotFoundError, OSError):
                    # Файл может быть удален с диска, но запись в БД осталась
                    pass

        # 2. Размер чертежей всех проектов компании
        for project in self.projects.all():
            for drawing in project.drawings.all():
                if drawing.file and hasattr(drawing.file, 'size'):
                    try:
                        total_size += drawing.file.size
                    except (FileNotFoundError, OSError):
                        pass

            # 3. Размер фото замечаний во всех проектах компании
            for issue in project.issues.all():
                for photo in issue.photos.all():
                    if photo.photo and hasattr(photo.photo, 'size'):
                        try:
                            total_size += photo.photo.size
                        except (FileNotFoundError, OSError):
                            pass

        return total_size

    def get_formatted_storage_size(self):
        """
        Возвращает размер хранилища в удобочитаемом формате.
        """
        size_bytes = self.get_total_storage_size()

        # Форматируем размер
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


class UserManager(BaseUserManager):
    """Custom user manager for email-based authentication."""

    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular user with the given email and password."""
        if not email:
            raise ValueError(_('Email обязателен'))
        # Нормализуем email и приводим к нижнему регистру для case-insensitive входа
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a superuser with the given email and password."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.Role.SUPERADMIN)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Custom user model with email as username and role-based access."""

    class Role(models.TextChoices):
        SUPERADMIN = 'SUPERADMIN', _('Суперадмин')
        DIRECTOR = 'DIRECTOR', _('Директор')
        CHIEF_ENGINEER = 'CHIEF_ENGINEER', _('Главный инженер')
        PROJECT_MANAGER = 'PROJECT_MANAGER', _('Руководитель проекта')
        ENGINEER = 'ENGINEER', _('Инженер ПТО')
        SITE_MANAGER = 'SITE_MANAGER', _('Начальник участка')
        FOREMAN = 'FOREMAN', _('Прораб')
        MASTER = 'MASTER', _('Мастер')
        SUPERVISOR = 'SUPERVISOR', _('Технадзор')
        CONTRACTOR = 'CONTRACTOR', _('Подрядчик')
        OBSERVER = 'OBSERVER', _('Наблюдатель')
        # Роли для работы с заявками на материалы
        SUPPLY_MANAGER = 'SUPPLY_MANAGER', _('Снабженец')
        WAREHOUSE_HEAD = 'WAREHOUSE_HEAD', _('Зав.Центрсклада')
        ACCOUNTANT = 'ACCOUNTANT', _('Бухгалтер')

    username = None
    email = models.EmailField(_('Email'), unique=True)
    secondary_email = models.EmailField(_('Запасной email'), blank=True, null=True)

    first_name = models.CharField(_('Имя'), max_length=150)
    last_name = models.CharField(_('Фамилия'), max_length=150)
    middle_name = models.CharField(_('Отчество'), max_length=150, blank=True)

    role = models.CharField(_('Роль'), max_length=50, choices=Role.choices, default=Role.OBSERVER)
    position = models.CharField(_('Должность'), max_length=255, blank=True)
    phone = models.CharField(_('Телефон'), max_length=20, blank=True)
    telegram_id = models.CharField(_('Telegram ID'), max_length=100, blank=True, null=True)

    # Company relationship (для сотрудников компании заказчика)
    company = models.ForeignKey(
        Company,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
        verbose_name=_('Компания'),
        help_text=_('Компания заказчика/генподрядчика (только для своих сотрудников)')
    )

    # Название сторонней компании (для подрядчиков и надзоров)
    external_company_name = models.CharField(
        _('Название сторонней компании'),
        max_length=255,
        blank=True,
        help_text=_('Название компании для Подрядчиков, Технадзора и Авторского надзора (сторонние компании)')
    )

    # Надзорная компания (для Технадзора и Авторского надзора) - DEPRECATED, используйте company_name
    supervision_company = models.CharField(
        _('Надзорная компания (устарело)'),
        max_length=255,
        blank=True,
        help_text=_('DEPRECATED: Используйте поле company_name. Оставлено для обратной совместимости.')
    )

    avatar = models.ImageField(_('Аватар'), upload_to='avatars/', blank=True, null=True)

    is_active = models.BooleanField(_('Активен'), default=True)
    is_verified = models.BooleanField(_('Подтвержден'), default=False)
    approved = models.BooleanField(_('Одобрено'), default=False, help_text=_('Разрешен ли доступ к странице пользователей'))
    archived = models.BooleanField(_('В архиве'), default=False, help_text=_('Подрядчик перемещен в архив (soft delete)'))

    # Временный пароль для отображения администратору
    temp_password = models.CharField(_('Временный пароль'), max_length=255, blank=True, null=True, help_text=_('Пароль для передачи пользователю'))

    created_at = models.DateTimeField(_('Создан'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Обновлен'), auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        verbose_name = _('Пользователь')
        verbose_name_plural = _('Пользователи')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"

    def get_full_name(self):
        """Return the full name of the user."""
        if self.middle_name:
            return f"{self.last_name} {self.first_name} {self.middle_name}"
        return f"{self.last_name} {self.first_name}"

    def get_short_name(self):
        """Return the short name for the user."""
        return f"{self.last_name} {self.first_name[0]}."

    @property
    def is_management(self):
        """Check if user is part of management."""
        return self.role in [
            self.Role.SUPERADMIN,
            self.Role.DIRECTOR,
            self.Role.CHIEF_ENGINEER,
        ]

    @property
    def is_itr(self):
        """Check if user is ITR (engineering technical staff)."""
        return self.role in [
            self.Role.ENGINEER,
            self.Role.PROJECT_MANAGER,
            self.Role.SITE_MANAGER,
            self.Role.FOREMAN,
            self.Role.MASTER,
        ]

    @property
    def is_supervisor(self):
        """Check if user is a supervisor."""
        return self.role == self.Role.SUPERVISOR

    @property
    def can_create_issues(self):
        """Check if user can create issues."""
        return self.is_itr or self.is_supervisor or self.is_management

    @property
    def can_verify_issues(self):
        """Check if user can verify/inspect issues."""
        return self.is_itr or self.is_supervisor or self.is_management
