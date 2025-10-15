from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from apps.projects.models import Project, Site, Category


class Issue(models.Model):
    """Model representing a construction issue/defect."""

    class Status(models.TextChoices):
        NEW = 'NEW', _('Новое')
        IN_PROGRESS = 'IN_PROGRESS', _('В процессе')
        PENDING_REVIEW = 'PENDING_REVIEW', _('На проверке')
        COMPLETED = 'COMPLETED', _('Исполнено')
        OVERDUE = 'OVERDUE', _('Просрочено')
        REJECTED = 'REJECTED', _('Отклонено')

    class Priority(models.TextChoices):
        CRITICAL = 'CRITICAL', _('Критичное')
        HIGH = 'HIGH', _('Важное')
        NORMAL = 'NORMAL', _('Обычное')

    # Basic information
    title = models.CharField(_('Название'), max_length=255)
    description = models.TextField(_('Описание проблемы'))

    # Relations
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='issues',
        verbose_name=_('Проект')
    )
    site = models.ForeignKey(
        Site,
        on_delete=models.CASCADE,
        related_name='issues',
        verbose_name=_('Участок')
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='issues',
        verbose_name=_('Категория')
    )

    # Status and priority
    status = models.CharField(
        _('Статус'),
        max_length=20,
        choices=Status.choices,
        default=Status.NEW
    )
    priority = models.CharField(
        _('Приоритет'),
        max_length=20,
        choices=Priority.choices,
        default=Priority.NORMAL
    )

    # People involved
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_issues',
        verbose_name=_('Создал')
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_issues',
        verbose_name=_('Назначен')
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_issues',
        verbose_name=_('Проверил')
    )

    # Deadlines
    deadline = models.DateTimeField(_('Срок устранения'), null=True, blank=True)
    completed_at = models.DateTimeField(_('Дата завершения'), null=True, blank=True)

    # Technology and materials
    correction_technology = models.TextField(
        _('Технология исправления'),
        blank=True,
        help_text='Как должно быть исправлено'
    )
    materials_used = models.TextField(
        _('Использованные материалы'),
        blank=True
    )

    # Additional info
    location_notes = models.CharField(_('Примечания о местоположении'), max_length=500, blank=True)

    created_at = models.DateTimeField(_('Создано'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Обновлено'), auto_now=True)

    class Meta:
        verbose_name = _('Замечание')
        verbose_name_plural = _('Замечания')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'project']),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['deadline']),
        ]

    def __str__(self):
        return f"{self.title} - {self.project.name}"

    @property
    def is_overdue(self):
        """Check if issue is overdue."""
        from django.utils import timezone
        if self.deadline and self.status not in [self.Status.COMPLETED, self.Status.REJECTED]:
            return timezone.now() > self.deadline
        return False

    def get_auto_status(self):
        """
        Автоматическое определение статуса замечания на основе правил:
        - До 24 часов с момента создания: "Новое"
        - От создания до окончания срока: "В процессе"
        - После истечения срока: "Просрочено"
        - Если создано Технадзором или Авторским надзором: "На проверке"
        - Если нажали "Принято": "Исполнено" (COMPLETED)
        - Если вручную установлено "На проверке": сохраняем этот статус
        """
        from django.utils import timezone
        from datetime import timedelta

        # Если статус уже COMPLETED, REJECTED или PENDING_REVIEW, не меняем
        # PENDING_REVIEW может быть установлен вручную или автоматически
        if self.status in [self.Status.COMPLETED, self.Status.REJECTED, self.Status.PENDING_REVIEW]:
            return self.status

        now = timezone.now()

        # Проверка: если замечание добавлено от роли "Технадзор" или "Авторский надзор"
        if self.created_by and self.created_by.role in ['SUPERVISOR', 'OBSERVER']:
            return self.Status.PENDING_REVIEW

        # Проверка: просрочено ли замечание
        if self.deadline and now > self.deadline:
            return self.Status.OVERDUE

        # Проверка: новое ли замечание (до 24 часов)
        time_since_creation = now - self.created_at
        if time_since_creation < timedelta(hours=24):
            return self.Status.NEW

        # Если есть срок и он еще не истек - "В процессе"
        if self.deadline and now <= self.deadline:
            return self.Status.IN_PROGRESS

        # По умолчанию - "В процессе"
        return self.Status.IN_PROGRESS

    def update_auto_status(self):
        """Обновляет статус автоматически, если он не установлен вручную."""
        # Получаем автоматический статус
        auto_status = self.get_auto_status()

        # Обновляем только если статус изменился
        if self.status != auto_status:
            self.status = auto_status
            self.save(update_fields=['status'])


class IssuePhoto(models.Model):
    """Model for photos associated with issues."""

    class Stage(models.TextChoices):
        BEFORE = 'BEFORE', _('До')
        AFTER = 'AFTER', _('После')
        INSPECTION = 'INSPECTION', _('Осмотр')

    issue = models.ForeignKey(
        Issue,
        on_delete=models.CASCADE,
        related_name='photos',
        verbose_name=_('Замечание')
    )

    stage = models.CharField(
        _('Этап'),
        max_length=20,
        choices=Stage.choices,
        default=Stage.BEFORE
    )

    photo = models.ImageField(
        _('Фото'),
        upload_to='issues/%Y/%m/%d/'
    )

    caption = models.CharField(_('Подпись'), max_length=255, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name=_('Загрузил')
    )

    created_at = models.DateTimeField(_('Загружено'), auto_now_add=True)

    class Meta:
        verbose_name = _('Фото замечания')
        verbose_name_plural = _('Фото замечаний')
        ordering = ['stage', 'created_at']
        # Ограничение: одно фото До и одно фото После на замечание
        constraints = [
            models.UniqueConstraint(
                fields=['issue', 'stage'],
                condition=models.Q(stage='BEFORE'),
                name='unique_before_photo_per_issue'
            ),
            models.UniqueConstraint(
                fields=['issue', 'stage'],
                condition=models.Q(stage='AFTER'),
                name='unique_after_photo_per_issue'
            )
        ]

    def __str__(self):
        return f"{self.issue.title} - {self.get_stage_display()}"


class IssueComment(models.Model):
    """Model for comments on issues."""

    issue = models.ForeignKey(
        Issue,
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name=_('Замечание')
    )

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name=_('Автор')
    )

    text = models.TextField(_('Комментарий'))

    # Поле для отслеживания пользователей, которые прочитали комментарий
    read_by = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='read_comments',
        blank=True,
        verbose_name=_('Прочитано пользователями')
    )

    created_at = models.DateTimeField(_('Создан'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Обновлен'), auto_now=True)

    class Meta:
        verbose_name = _('Комментарий')
        verbose_name_plural = _('Комментарии')
        ordering = ['created_at']

    def __str__(self):
        return f"Комментарий от {self.author} к {self.issue.title}"
