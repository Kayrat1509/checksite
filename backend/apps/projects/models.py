from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class Project(models.Model):
    """Model representing a construction project."""

    # Company ownership - каждый проект принадлежит компании
    company = models.ForeignKey(
        'users.Company',
        on_delete=models.CASCADE,
        related_name='projects',
        null=True,
        blank=False,
        verbose_name=_('Компания'),
        help_text=_('Компания-владелец проекта')
    )

    name = models.CharField(_('Название проекта'), max_length=255)
    address = models.TextField(_('Адрес'), blank=True)
    customer = models.CharField(_('Заказчик'), max_length=255, blank=True)

    start_date = models.DateField(_('Дата начала'), null=True, blank=True)
    end_date = models.DateField(_('Дата окончания'), null=True, blank=True)

    description = models.TextField(_('Описание'), blank=True)

    # Responsible persons
    project_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_projects',
        verbose_name=_('Руководитель проекта')
    )

    # Team members
    team_members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='projects',
        blank=True,
        verbose_name=_('Участники проекта')
    )

    is_active = models.BooleanField(_('Активен'), default=True)

    created_at = models.DateTimeField(_('Создан'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Обновлен'), auto_now=True)

    class Meta:
        verbose_name = _('Объект')
        verbose_name_plural = _('Объекты')
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    @property
    def total_issues(self):
        """Get total number of issues in project."""
        return self.issues.count()

    @property
    def completed_issues(self):
        """Get number of completed issues."""
        return self.issues.filter(status='COMPLETED').count()

    @property
    def progress_percentage(self):
        """Calculate project completion percentage."""
        total = self.total_issues
        if total == 0:
            return 0
        return round((self.completed_issues / total) * 100, 2)


class Site(models.Model):
    """Model representing a construction site/section within a project."""

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='sites',
        verbose_name=_('Проект')
    )

    name = models.CharField(_('Название участка'), max_length=255)
    description = models.TextField(_('Описание'), blank=True)

    # Location
    latitude = models.DecimalField(
        _('Широта'),
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True
    )
    longitude = models.DecimalField(
        _('Долгота'),
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True
    )

    # Responsible person
    site_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_sites',
        verbose_name=_('Начальник участка')
    )

    is_active = models.BooleanField(_('Активен'), default=True)

    created_at = models.DateTimeField(_('Создан'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Обновлен'), auto_now=True)

    class Meta:
        verbose_name = _('Участок')
        verbose_name_plural = _('Участки')
        ordering = ['project', 'name']
        unique_together = ['project', 'name']

    def __str__(self):
        return f"{self.project.name} - {self.name}"


class Category(models.Model):
    """Model for issue categories."""

    name = models.CharField(_('Название категории'), max_length=255, unique=True)
    description = models.TextField(_('Описание'), blank=True)
    color = models.CharField(_('Цвет'), max_length=7, default='#666666', help_text='Hex color code')

    created_at = models.DateTimeField(_('Создана'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Обновлена'), auto_now=True)

    class Meta:
        verbose_name = _('Категория')
        verbose_name_plural = _('Категории')
        ordering = ['name']

    def __str__(self):
        return self.name


class Drawing(models.Model):
    """Model for project drawings (PDF files)."""

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='drawings',
        verbose_name=_('Проект')
    )

    file = models.FileField(
        _('Файл чертежа'),
        upload_to='drawings/%Y/%m/%d/'
    )

    file_name = models.CharField(_('Название файла'), max_length=255)

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_drawings',
        verbose_name=_('Загрузил')
    )

    created_at = models.DateTimeField(_('Дата загрузки'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Обновлен'), auto_now=True)

    class Meta:
        verbose_name = _('Чертеж')
        verbose_name_plural = _('Чертежи')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.project.name} - {self.file_name}"
