from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class Notification(models.Model):
    """Model for storing user notifications."""

    class Type(models.TextChoices):
        INFO = 'INFO', _('Информация')
        SUCCESS = 'SUCCESS', _('Успех')
        WARNING = 'WARNING', _('Предупреждение')
        ERROR = 'ERROR', _('Ошибка')

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name=_('Пользователь')
    )

    type = models.CharField(
        _('Тип'),
        max_length=20,
        choices=Type.choices,
        default=Type.INFO
    )

    title = models.CharField(_('Заголовок'), max_length=255)
    message = models.TextField(_('Сообщение'))

    # Optional link
    link = models.CharField(_('Ссылка'), max_length=500, blank=True)

    is_read = models.BooleanField(_('Прочитано'), default=False)

    created_at = models.DateTimeField(_('Создано'), auto_now_add=True)

    class Meta:
        verbose_name = _('Уведомление')
        verbose_name_plural = _('Уведомления')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.title} - {self.user.email}"
