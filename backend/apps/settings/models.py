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

        ⚠️ DEPRECATED: Метод отключён, так как PageAccess удалена.
        Теперь матрица доступа глобальная (ButtonAccess с company=NULL).
        Настройки применяются через админ-панель: /admin/core/buttonaccess/

        TODO: Переписать на работу с ButtonAccess или удалить функциональность RoleTemplate.

        Args:
            user: Пользователь, к которому применяется шаблон
        """
        # Временно возвращаем предупреждение
        import warnings
        warnings.warn(
            "RoleTemplate.apply_to_user() устарел. "
            "Используйте глобальную матрицу ButtonAccess в админке.",
            DeprecationWarning,
            stacklevel=2
        )
        pass
