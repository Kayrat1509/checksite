"""
Модели для настраиваемой системы согласования заявок на материалы.

Новая гибкая система позволяет каждой компании настроить свою индивидуальную
цепочку согласования с помощью drag-and-drop интерфейса.
"""

from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError


class ApprovalRole(models.TextChoices):
    """Роли, доступные для участия в цепочке согласования"""
    DIRECTOR = 'DIRECTOR', _('Директор')
    CHIEF_ENGINEER = 'CHIEF_ENGINEER', _('Главный инженер')
    PROJECT_MANAGER = 'PROJECT_MANAGER', _('Руководитель проекта')
    CHIEF_POWER_ENGINEER = 'CHIEF_POWER_ENGINEER', _('Главный энергетик')
    ENGINEER = 'ENGINEER', _('Инженер ПТО')
    SITE_MANAGER = 'SITE_MANAGER', _('Начальник участка')
    FOREMAN = 'FOREMAN', _('Прораб')
    POWER_ENGINEER = 'POWER_ENGINEER', _('Энергетик')
    SUPPLY_MANAGER = 'SUPPLY_MANAGER', _('Снабженец')
    WAREHOUSE_HEAD = 'WAREHOUSE_HEAD', _('Завсклад центрального склада')
    SITE_WAREHOUSE_MANAGER = 'SITE_WAREHOUSE_MANAGER', _('Завсклад объекта')


class ApprovalFlowTemplate(models.Model):
    """
    Шаблон цепочки согласования для компании.
    Каждая компания может создать свою индивидуальную цепочку.
    """

    company = models.ForeignKey(
        'users.Company',
        on_delete=models.CASCADE,
        related_name='approval_flow_templates',
        verbose_name=_('Компания'),
        null=True,
        blank=True,
        help_text=_('Компания (NULL для глобальных настроек)')
    )

    name = models.CharField(
        _('Название схемы'),
        max_length=255,
        help_text=_('Например: "Основная схема согласования"')
    )

    description = models.TextField(
        _('Описание'),
        blank=True,
        help_text=_('Краткое описание схемы согласования')
    )

    is_active = models.BooleanField(
        _('Активна'),
        default=True,
        help_text=_('Только одна глобальная схема или одна схема на компанию может быть активной')
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_approval_flows',
        verbose_name=_('Создал')
    )

    created_at = models.DateTimeField(_('Создана'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Обновлена'), auto_now=True)

    class Meta:
        verbose_name = _('Шаблон цепочки согласования')
        verbose_name_plural = _('Шаблоны цепочек согласования')
        ordering = ['-created_at']
        # Только одна активная схема на компанию
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'is_active'],
                condition=models.Q(is_active=True),
                name='unique_active_flow_per_company'
            )
        ]

    def __str__(self):
        """
        Строковое представление схемы согласования.
        Для глобальных настроек (company=None) показываем '[Глобальная]'.
        """
        if self.company:
            return f"{self.company.name} - {self.name}"
        return f"[Глобальная] - {self.name}"

    def save(self, *args, **kwargs):
        """
        При активации новой схемы - деактивировать все остальные.
        ВАЖНО: Для глобальных настроек (company=None) деактивируем все другие глобальные схемы.
        """
        if self.is_active:
            # Деактивируем все другие схемы (для глобальных настроек или для компании)
            if self.company_id is None:
                # Глобальные настройки - деактивируем другие глобальные схемы
                ApprovalFlowTemplate.objects.filter(
                    company__isnull=True,
                    is_active=True
                ).exclude(pk=self.pk).update(is_active=False)
            else:
                # Настройки компании - деактивируем другие схемы этой компании
                ApprovalFlowTemplate.objects.filter(
                    company=self.company,
                    is_active=True
                ).exclude(pk=self.pk).update(is_active=False)

        super().save(*args, **kwargs)


class ApprovalStep(models.Model):
    """
    Один этап в цепочке согласования.
    Определяет роль согласующего и порядок согласования.
    """

    flow_template = models.ForeignKey(
        ApprovalFlowTemplate,
        on_delete=models.CASCADE,
        related_name='steps',
        verbose_name=_('Цепочка согласования')
    )

    role = models.CharField(
        _('Роль согласующего'),
        max_length=50,
        choices=ApprovalRole.choices,
        help_text=_('Кто должен согласовать на этом этапе')
    )

    order = models.PositiveIntegerField(
        _('Порядковый номер'),
        help_text=_('Порядок согласования (1, 2, 3...)')
    )

    skip_if_empty = models.BooleanField(
        _('Пропустить, если нет пользователя'),
        default=True,
        help_text=_('Автоматически пропускать этот этап, если в проекте нет пользователя с указанной ролью')
    )

    is_mandatory = models.BooleanField(
        _('Обязательный этап'),
        default=True,
        help_text=_('Можно ли пропустить этот этап вручную')
    )

    description = models.TextField(
        _('Описание этапа'),
        blank=True,
        help_text=_('Дополнительная информация о том, что проверяется на этом этапе')
    )

    created_at = models.DateTimeField(_('Создан'), auto_now_add=True)

    class Meta:
        verbose_name = _('Этап согласования')
        verbose_name_plural = _('Этапы согласования')
        ordering = ['order']
        # Уникальный порядок в рамках одной цепочки
        unique_together = [['flow_template', 'order']]
        indexes = [
            models.Index(fields=['flow_template', 'order']),
        ]

    def __str__(self):
        return f"Этап {self.order}: {self.get_role_display()}"

    def clean(self):
        """Валидация при сохранении"""
        # Проверяем, что порядок начинается с 1
        if self.order < 1:
            raise ValidationError(_('Порядковый номер должен быть >= 1'))


class MaterialRequestApproval(models.Model):
    """
    Отслеживание прохождения согласования конкретной заявкой.
    Создается для каждого этапа каждой заявки.
    """

    class ApprovalStatus(models.TextChoices):
        PENDING = 'PENDING', _('Ожидает согласования')
        APPROVED = 'APPROVED', _('Согласовано')
        REJECTED = 'REJECTED', _('Отклонено')
        SKIPPED = 'SKIPPED', _('Пропущено')

    material_request = models.ForeignKey(
        'MaterialRequest',
        on_delete=models.CASCADE,
        related_name='approvals',
        verbose_name=_('Заявка')
    )

    step = models.ForeignKey(
        ApprovalStep,
        on_delete=models.CASCADE,
        related_name='approvals',
        verbose_name=_('Этап согласования')
    )

    approver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='material_request_approvals',
        verbose_name=_('Согласующий'),
        help_text=_('Пользователь, который должен согласовать (может быть NULL если этап пропущен)')
    )

    status = models.CharField(
        _('Статус согласования'),
        max_length=20,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING
    )

    comment = models.TextField(
        _('Комментарий'),
        blank=True,
        help_text=_('Комментарий при согласовании или отклонении')
    )

    approved_at = models.DateTimeField(
        _('Дата и время согласования'),
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(_('Создано'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Обновлено'), auto_now=True)

    class Meta:
        verbose_name = _('Согласование заявки')
        verbose_name_plural = _('Согласования заявок')
        ordering = ['step__order']
        indexes = [
            models.Index(fields=['material_request', 'step']),
            models.Index(fields=['approver', 'status']),
        ]

    def __str__(self):
        return f"{self.material_request.request_number} - Этап {self.step.order} ({self.get_status_display()})"


class CompanyApprovalSettings(models.Model):
    """
    Настройки доступа к управлению цепочками согласования для компании.
    Управляется суперадмином через чекбокс в админ-панели.
    """

    company = models.OneToOneField(
        'users.Company',
        on_delete=models.CASCADE,
        related_name='approval_settings',
        verbose_name=_('Компания')
    )

    can_manage_approval_flow = models.BooleanField(
        _('Доступ к настройке цепочки согласования'),
        default=False,
        help_text=_('Разрешено ли компании настраивать свою цепочку согласования (устанавливает суперадмин)')
    )

    approval_flow_managers = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='managed_approval_flows',
        verbose_name=_('Менеджеры цепочек'),
        help_text=_('Пользователи компании, которые могут настраивать цепочку согласования')
    )

    created_at = models.DateTimeField(_('Создано'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Обновлено'), auto_now=True)

    class Meta:
        verbose_name = _('Настройки согласования компании')
        verbose_name_plural = _('Настройки согласования компаний')

    def __str__(self):
        return f"Настройки согласования: {self.company.name}"
