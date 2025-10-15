from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _


class Company(models.Model):
    """Model for companies/organizations."""

    class LegalForm(models.TextChoices):
        """Legal forms of companies."""
        LLC = 'LLC', _('ТОО (Товарищество с ограниченной ответственностью)')
        JSC = 'JSC', _('АО (Акционерное общество)')
        PE = 'PE', _('ИП (Индивидуальный предприниматель)')
        CJSC = 'CJSC', _('ЗАО (Закрытое акционерное общество)')
        OJSC = 'OJSC', _('ОАО (Открытое акционерное общество)')
        PARTNERSHIP = 'PARTNERSHIP', _('Партнерство')
        COOPERATIVE = 'COOPERATIVE', _('Кооператив')
        STATE = 'STATE', _('Государственное предприятие')
        OTHER = 'OTHER', _('Другое')

    legal_form = models.CharField(
        _('Организационно-правовая форма (ОПФ)'),
        max_length=50,
        choices=LegalForm.choices,
        default=LegalForm.LLC
    )
    name = models.CharField(_('Название компании'), max_length=255)
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
        return f"{self.get_legal_form_display()} {self.name}"


class UserManager(BaseUserManager):
    """Custom user manager for email-based authentication."""

    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular user with the given email and password."""
        if not email:
            raise ValueError(_('Email обязателен'))
        email = self.normalize_email(email)
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

    # Company relationship
    company = models.ForeignKey(
        Company,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
        verbose_name=_('Компания')
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
