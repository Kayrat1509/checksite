from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.users.models import User
from apps.projects.models import Project


class TechnicalCondition(models.Model):
    """
    Модель для хранения технических условий (PDF файлы).
    """

    # PDF файл технического условия
    file = models.FileField(
        _('PDF файл'),
        upload_to='technical_conditions/%Y/%m/',
        help_text=_('Файл технического условия в формате PDF')
    )

    # Проект, к которому относится техусловие
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='technical_conditions',
        verbose_name=_('Проект'),
        null=True,
        blank=True,
        help_text=_('Проект, к которому относится техническое условие')
    )

    # От кого получено техусловие (организация)
    received_from = models.CharField(
        _('От кого получено'),
        max_length=255,
        help_text=_('Организация, выдавшая техническое условие (например: Водоканал, Телеком, Электросеть)')
    )

    # Кто добавил техусловие
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_technical_conditions',
        verbose_name=_('Добавил')
    )

    # Когда добавлено
    created_at = models.DateTimeField(
        _('Дата добавления'),
        auto_now_add=True
    )

    # Когда обновлено
    updated_at = models.DateTimeField(
        _('Дата обновления'),
        auto_now=True
    )

    # Дополнительное описание (опционально)
    description = models.TextField(
        _('Описание'),
        blank=True,
        help_text=_('Дополнительное описание технического условия')
    )

    class Meta:
        verbose_name = _('Техническое условие')
        verbose_name_plural = _('Технические условия')
        ordering = ['-created_at']

    def __str__(self):
        return f"Техусловие от {self.received_from} ({self.created_at.strftime('%d.%m.%Y')})"
